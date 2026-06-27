import React, { useState, useEffect, useRef } from 'react';
// Force HMR refresh
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import html2canvas from 'html2canvas';
import { useAuth } from '../context/AuthContext.jsx';
import { ChevronLeft, Download, FileText, Type, Image as ImageIcon, Sparkles, MessageSquare, Play, Trash2, Settings, LogOut, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/databaseService';
import logoFinal from '../../assets/Logo_cruci+pupi-removebg-preview.png';
import sopaIcon from '../../assets/icono_sopa_1.png';
import MenteActivaLogo from '../components/common/MenteActivaLogo.jsx';

// Componente para renderizar texto con fórmulas LaTeX
const MathText = ({ text }) => {
    if (!text) return null;
    
    // Divide el texto por delimitadores de $
    const parts = text.split(/(\$.*?\$)/g);
    
    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('$') && part.endsWith('$')) {
                    const formula = part.slice(1, -1);
                    try {
                        return (
                            <span 
                                key={i} 
                                className="inline px-1 py-1"
                                dangerouslySetInnerHTML={{ 
                                    __html: katex.renderToString(formula, { throwOnError: false }) 
                                }} 
                            />
                        );
                    } catch (e) {
                        return <span key={i}>{part}</span>;
                    }
                }
                return <span key={i} className="inline">{part}</span>;
            })}
        </span>
    );
};

const EduSopaView = () => {
    const { theme, user, logout, getPeruDate, updateGlobalVars, globalVars, updateUser } = useAuth();
    const navigate = useNavigate();

    // Estados de la Sesión de Prueba
    const [trialStatus, setTrialStatus] = useState('loading'); // 'waiting', 'active', 'expired', 'standard'
    const [timeLeft, setTimeLeft] = useState(86400); // 24 horas en segundos
    const [trialStarted, setTrialStarted] = useState(false);
    const [showWelcomeMessage, setShowWelcomeMessage] = useState(user?.plan === 'prueba' && !sessionStorage.getItem('edu_trial_welcomed'));

    // Obtener información del creador para el WhatsApp
    const creatorInfo = React.useMemo(() => {
        const creator = globalVars.META_USERS?.find(u => u.username === user?.createdBy || u.email === user?.createdBy || u.id === user?.createdBy);
        return {
            name: creator?.fullName || 'Soporte',
            phone: creator?.whatsappVentas || '993125547'
        };
    }, [globalVars.META_USERS, user?.createdBy]);

    useEffect(() => {
        if (!user) return;
        
        if (user.plan === 'prueba') {
            const checkTrial = () => {
                const nowStr = getPeruDate(); // DD/MM/YYYY
                const now = new Date();
                
                // Buscar datos actualizados del usuario en META_USERS
                const currentUser = globalVars.META_USERS?.find(u => u.id === user.id) || user;
                
                if (!currentUser.trialStartTime) {
                    // Ver si ya es hora de la cita
                    const sched = new Date(currentUser.scheduledTime);
                    if (now < sched) {
                        setTrialStatus('waiting');
                    } else {
                        setTrialStatus('ready'); // Ya puede empezar
                    }
                } else {
                    // La prueba ya empezó, calcular tiempo restante
                    const start = new Date(currentUser.trialStartTime);
                    const elapsed = Math.floor((now - start) / 1000);
                    const remaining = 86400 - elapsed;
                    
                    if (remaining <= 0) {
                        setTrialStatus('expired');
                        setTimeLeft(0);
                    } else {
                        setTrialStatus('active');
                        setTimeLeft(remaining);
                        setTrialStarted(true);
                    }
                }
            };
            
            checkTrial();
            const timer = setInterval(checkTrial, 1000);
            return () => clearInterval(timer);
        } else {
            setTrialStatus('standard');
        }
    }, [user, globalVars.META_USERS, getPeruDate]);

    const startTrialSession = async () => {
        try {
            const startTime = await db.startTrial(user.id);
            updateUser({ trialStartTime: startTime });
            
            // Log de inicio de prueba
            db.logActivity(user.id, 'START_TRIAL_SESSION');
            
            setTrialStatus('active');
        } catch (err) {
            alert("Error al iniciar sesión: " + err.message);
        }
    };

    const handlePanelRedirect = () => {
        const isAdmin = user?.role === 'admin_general' || user?.role === 'admin_aux';
        if (isAdmin) {
            navigate('/admin');
        } else {
            navigate('/user');
        }
    };

    const handleLogout = () => {
        if (user?.plan === 'prueba') {
            const confirmLogout = window.confirm(
                `¡Gracias por probar EduCruci! 🚀\n\n` +
                `🔥 OFERTA DE LANZAMIENTO - ACCESO POR UN AÑO 🔥\n` +
                `✅ Duración: 1 AÑO\n` +
                `✅ Crucigramas: ILIMITADOS\n` +
                `✅ Pupiletras: ILIMITADOS\n` +
                `✅ Costo: 🔥 S/15 PAGO ÚNICO 🔥\n\n` +
                `Comuníquese a WhatsApp: ${creatorInfo.phone}\n\n` +
                `¿Desea cerrar sesión ahora?`
            );
            if (!confirmLogout) return;
        }
        logout();
        navigate('/login');
    };
    
    // Estados del generador
    const [titulo, setTitulo] = useState('');
    const [grado, setGrado] = useState('');
    const [tema, setTema] = useState('');
    const [inputData, setInputData] = useState('');
    const [fondo, setFondo] = useState(null);
    const [fondoCasillasBlanco, setFondoCasillasBlanco] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loaderText, setLoaderText] = useState('');
    
    // Estados del motor
    const [grid, setGrid] = useState(null);
    const [placedWords, setPlacedWords] = useState([]);
    const [modo, setModo] = useState('sopa');
    const [crucigramaListo, setCrucigramaListo] = useState(false);
    const [wordCount, setWordCount] = useState(10);
    const [promptCopied, setPromptCopied] = useState(false);
    const [vistaActual, setVistaActual] = useState('reto');
    const [enfoque, setEnfoque] = useState('escolar');

    // Resetear feedback de prompt si cambian los datos (como en el original)
    useEffect(() => {
        setPromptCopied(false);
    }, [titulo, grado, tema, wordCount]);

    // Analizador Inteligente de Prompt
    useEffect(() => {
        if (!inputData) return;
        
        let newData = inputData;
        let changed = false;

        // Extraer titulo
        const tituloMatch = newData.match(/\[titulo\]([\s\S]*?)\[fintitulo\]/i);
        if (tituloMatch) {
            setTitulo(tituloMatch[1].trim());
            newData = newData.replace(/\[titulo\][\s\S]*?\[fintitulo\]/gi, '');
            changed = true;
        }

        // Extraer lista de palabras
        const listaMatch = newData.match(/\[lista de palabras\]([\s\S]*?)\[fin lista de palabras\]/i);
        if (listaMatch) {
            newData = listaMatch[1].trim(); // Solo dejamos lo que está adentro
            changed = true;
        } else if (changed) {
            newData = newData.trim();
        }

        if (changed) {
            setInputData(newData);
        }
    }, [inputData]);

    // Referencias para el fondo
    const fondoInputRef = useRef(null);

    // --- MOTORES DE GENERACIÓN INDEPENDIENTES Y ROBUSTOS ---
    
    const runCrosswordMotor = (data) => {
        const size = 25; // Aumentado para dar espacio a 20+ palabras
        let bestGrid = null;
        let bestPlaced = [];
        const words = [...data].sort((a, b) => b.w.length - a.w.length);

        // Aumentamos los intentos a 1000 para encontrar la mejor combinación
        for (let att = 0; att < 1000; att++) {
            let grid = Array(size).fill().map(() => Array(size).fill(null));
            let placed = [];

            const tryPlacement = (wObj, r, c, h) => {
                const word = wObj.w;
                if (h ? (c + word.length > size) : (r + word.length > size)) return false;
                
                let overlaps = false;
                for (let i = 0; i < word.length; i++) {
                    let cr = h ? r : r + i;
                    let cc = h ? c + i : c;
                    if (grid[cr][cc]) {
                        if (grid[cr][cc] !== word[i]) return false;
                        overlaps = true;
                    } else {
                        let neighbors = h ? [[cr - 1, cc], [cr + 1, cc]] : [[cr, cc - 1], [cr, cc + 1]];
                        // Evitar palabras pegadas paralelas
                        for (let [nr, nc] of neighbors) {
                            if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc]) return false;
                        }
                    }
                }
                if (placed.length > 0 && !overlaps) return false;
                for (let i = 0; i < word.length; i++) grid[h ? r : r + i][h ? c + i : c] = word[i];
                placed.push({ w: word, d: wObj.d, r, c, h });
                return true;
            };

            // Primera palabra al centro
            tryPlacement(words[0], Math.floor(size/2), Math.floor((size - words[0].w.length) / 2), true);
            for (let i = 1; i < words.length; i++) {
                let coords = [];
                for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) coords.push({ r, c });
                coords.sort(() => Math.random() - 0.5);
                for (let p of coords) {
                    if (tryPlacement(words[i], p.r, p.c, true) || tryPlacement(words[i], p.r, p.c, false)) break;
                }
            }

            if (!bestGrid || placed.length > bestPlaced.length) {
                bestGrid = JSON.parse(JSON.stringify(grid));
                bestPlaced = [...placed];
                // Si ya metimos todas, paramos
                if (bestPlaced.length === words.length) break;
            }
        }
        return { grid: bestGrid, placed: bestPlaced };
    };

    const runWordSearchMotor = (data) => {
        const size = 25; // Aumentado para mayor densidad
        let bestGrid = null;
        let bestPlaced = [];
        let bestScore = -1;

        const words = [...data].sort(() => Math.random() - 0.5);
        const shortWords = [...data].sort((a, b) => a.w.length - b.w.length).slice(0, 4);

        for (let att = 0; att < 300; att++) {
            let grid = Array(size).fill().map(() => Array(size).fill(null));
            let placed = [];
            let currentDiagonals = 0;
            let totalCrosses = 0;
            let clusterPenalty = 0;

            const tryPlacement = (wObj, r, c, dr, dc, forceDiag = false) => {
                const word = wObj.w;
                if (r + (word.length - 1) * dr >= size || r + (word.length - 1) * dr < 0 ||
                    c + (word.length - 1) * dc >= size || c + (word.length - 1) * dc < 0) return false;

                let intersections = 0;
                let localPenalty = 0;

                for (let i = 0; i < word.length; i++) {
                    let cr = r + i * dr;
                    let cc = c + i * dc;
                    if (grid[cr][cc]) {
                        if (grid[cr][cc] !== word[i]) return false;
                        intersections++;
                    }
                    if (dr === 0 && dc === 1) {
                        if (cr > 0 && grid[cr - 1][cc]) localPenalty += 15;
                        if (cr < size - 1 && grid[cr + 1][cc]) localPenalty += 15;
                    }
                    if (dr === 1 && dc === 0) {
                        if (cc > 0 && grid[cr][cc - 1]) localPenalty += 15;
                        if (cc < size - 1 && grid[cr][cc + 1]) localPenalty += 15;
                    }
                }
                const isDiag = (dr !== 0 && dc !== 0);
                if (forceDiag && !isDiag) return false;
                for (let i = 0; i < word.length; i++) grid[r + i * dr][c + i * dc] = word[i];
                placed.push({ w: word, d: wObj.d, r, c, dr, dc });
                if (isDiag) currentDiagonals++;
                totalCrosses += intersections;
                clusterPenalty += localPenalty;
                return true;
            };

            const allDirs = [[0, 1], [1, 0], [1, 1], [-1, 1]];
            words.forEach((wObj) => {
                let coords = [];
                for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) coords.push({ r, c });
                coords.sort(() => Math.random() - 0.5);
                let placedWord = false;
                const mustTryDiag = (currentDiagonals < 2 && shortWords.includes(wObj));
                let dirsToTry = wObj.w.length > 7 ? [[1, 0], [1, 1], [-1, 1], [0, 1]] : [...allDirs].sort(() => Math.random() - 0.5);

                if (mustTryDiag) {
                    for (let p of coords) {
                        for (let d of [[1, 1], [-1, 1]].sort(() => Math.random() - 0.5)) {
                            if (tryPlacement(wObj, p.r, p.c, d[0], d[1])) { placedWord = true; break; }
                        }
                        if (placedWord) break;
                    }
                }
                if (!placedWord) {
                    for (let p of coords) {
                        for (let d of dirsToTry) {
                            if (tryPlacement(wObj, p.r, p.c, d[0], d[1])) { placedWord = true; break; }
                        }
                        if (placedWord) break;
                    }
                }
            });

            let score = (placed.length * 1000) + (totalCrosses * 50) - clusterPenalty;
            if (currentDiagonals >= 2) score += 2000;
            if (!bestGrid || score > bestScore) {
                bestGrid = JSON.parse(JSON.stringify(grid));
                bestPlaced = [...placed];
                bestScore = score;
            }
        }

        const abc = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (!bestGrid[r][c]) bestGrid[r][c] = abc[Math.floor(Math.random() * abc.length)];
            }
        }
        return { grid: bestGrid, placed: bestPlaced };
    };

    const generarMotor = (tipo, data) => {
        setLoading(true);
        setLoaderText(tipo === 'crucigrama' ? "Diseñando Crucigrama..." : "Preparando Sopa de Letras...");

        setTimeout(() => {
            const res = tipo === 'crucigrama' ? runCrosswordMotor(data) : runWordSearchMotor(data);
            
            // PROCESAMIENTO DE IDS INDEPENDIENTE
            if (tipo === 'crucigrama') {
                res.placed.sort((a, b) => (a.r !== b.r) ? a.r - b.r : a.c - b.c);
                let idMap = new Map(), curId = 1;
                res.placed.forEach(p => {
                    const key = `${p.r},${p.c}`;
                    if (!idMap.has(key)) idMap.set(key, curId++);
                    p.id = idMap.get(key);
                });
            } else {
                res.placed.forEach((p, idx) => p.id = idx + 1);
            }

            setGrid(res.grid);
            setPlacedWords(res.placed);
            setCrucigramaListo(true);
            setLoading(false);
        }, 800);
    };

    const procesar = (tipo) => {
        setModo(tipo);
        const words = extraerDatos(inputData);
        if(words.length === 0) {
            alert("No se detectaron palabras en el formato PALABRA : DEFINICIÓN");
            return;
        }
        generarMotor(tipo, words);
    };

    const extraerDatos = (raw) => {
        const data = [];
        raw.split('\n').forEach(line => {
            const lastIndex = line.lastIndexOf(':');
            if (lastIndex !== -1) {
                const d = line.substring(lastIndex + 1).replace(/[*]/g, '').trim();
                let wPart = line.substring(0, lastIndex);
                let w = wPart.replace(/PALABRA/gi, '')
                    .replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ]/g, '')
                    .toUpperCase().trim();
                if (w.length > 1 && d.length > 0) data.push({ w: w, d: d });
            }
        });
        return data;
    };

    const handleFondoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setFondo(event.target.result);
            reader.readAsDataURL(file);
        }
    };

    const copiarPrompt = () => {
        const tituloVal = titulo || "TÍTULO DEL MATERIAL";
        const gradoVal = grado || "SECUNDARIA";
        const temaVal = tema || tituloVal;

        let instruccionesEnfoque = "";
        if (enfoque === 'personajes') {
            instruccionesEnfoque = `ENFOQUE CULTURA POP/PERSONAJES:
- Identifica a qué serie, película, videojuego o grupo musical pertenece el tema.
- Extrae ÚNICAMENTE nombres propios de personajes principales, mascotas, lugares mágicos o superpoderes. 
- PROHIBIDO usar términos técnicos, de la industria o genéricos.`;
        } else if (enfoque === 'escolar') {
            instruccionesEnfoque = `ENFOQUE ACADÉMICO/ESCOLAR:
- Mantén el rigor histórico, científico o académico exacto.
- Usa hechos reales, figuras históricas, especies o términos exactos de la materia.
- EXCEPCIÓN: Si el tema es una obra literaria o un cuento, SÍ se permite extraer sus personajes y lugares.
- Explica los conceptos de forma sencilla y directa, sin inventar personajes (salvo la excepción).`;
        } else if (enfoque === 'valores') {
            instruccionesEnfoque = `ENFOQUE VALORES Y EMOCIONES:
- Extrae conceptos psicológicos o universales (ej: Frustración, Empatía, Higiene, Respeto).
- Describe cada concepto usando situaciones reales del día a día del niño (ej: "Lo que sientes cuando tu torre de bloques se cae").
- NO referencies películas ni personajes a menos que el tema lo pida explícitamente.`;
        }

        const promptIA = `Actúa como un creador de juegos educativos infantiles divertido y didáctico.
Tema: "${temaVal}" para un niño(a) de ${gradoVal}.

${instruccionesEnfoque}

Genera una lista de ${wordCount} conceptos clave basándote estrictamente en el enfoque anterior.
Las pistas o definiciones deben ser amigables, curiosas y adaptadas para que las entienda un niño de esa edad.

REGLAS DE FORMATO (OBLIGATORIO):
Debes responder ESTRICTAMENTE con esta estructura:

[titulo] Aquí inventas un título corto y emocionante [fintitulo]
[lista de palabras]
CONCEPTO : DEFINICIÓN
CONCEPTO : DEFINICIÓN
[fin lista de palabras]

REGLAS TÉCNICAS INQUEBRANTABLES:
1. El CONCEPTO a adivinar NO DEBE CONTENER ESPACIOS bajo ninguna circunstancia (Ejemplo: usa MAINDANCER en lugar de Main Dancer).
2. El CONCEPTO a adivinar NO DEBE LLEVAR TILDES NI ACENTOS (Ejemplo: usa LIDER en lugar de Líder, CORAZON en lugar de Corazón).
3. Escribe cada concepto y su definición en UNA SOLA LÍNEA FÍSICA.
4. Usa estrictamente este separador: CONCEPTO : DEFINICIÓN
5. NO incluyas números de lista, ni asteriscos, ni guiones.
6. La definición debe tener un máximo de 15 palabras.
7. PROHIBIDO usar lenguaje LaTeX o símbolos matemáticos complejos.

Solo entrega lo solicitado, sin introducciones ni saludos.

NORMAS DE SEGURIDAD PEDAGÓGICA Y FORMATO:
- ESCUDO ANTI-ALUCINACIÓN: TRABAJA ÚNICAMENTE CON LA INFORMACIÓN SUMINISTRADA. PROHIBIDO INVENTAR O AÑADIR DATOS CURRICULARES QUE NO ESTÉN EN EL TEXTO BASE.
- PUREZA DE FORMATO (STRICT TEXT-ONLY): RESPONDE ÚNICAMENTE CON EL TEXTO SOLICITADO Y LAS ETIQUETAS DE APERTURA Y CIERRE. PROHIBIDO INCLUIR INTRODUCCIONES, COMENTARIOS ADICIONALES, SALUDOS, DESPEDIDAS, EXPLICACIONES, IMÁGENES O RECURSOS MULTIMEDIA. EL FORMATO DEBE SER 100% LIMPIO DE TEXTO AUXILIAR.
- PROHIBICIÓN DE GENERACIÓN DE APLICACIONES/INTERACTIVOS: ESTÁ ESTRICTAMENTE PROHIBIDO GENERAR CÓDIGO DE PROGRAMACIÓN, APLICACIONES INTERACTIVAS, COMPONENTES DINÁMICOS, ARTEFACTOS DE CÓDIGO (COMO REACT, HTML/JS, PYTHON) O INICIAR MÓDULOS DE EJECUCIÓN/COMPILACIÓN EN EL CHAT. TU RESPUESTA DEBE SER EXCLUSIVAMENTE TEXTO PLANO ESTATUADO SEGÚN EL FORMATO SOLICITADO. NO CREES NINGÚN JUEGO DE SOPA DE LETRAS INTERACTIVO NI CÓDIGO DE APLICACIÓN.`;

        navigator.clipboard.writeText(promptIA).then(() => {
            setPromptCopied(true);
        }).catch(err => {
            console.error('Error al copiar: ', err);
            alert("Error al copiar el prompt. Intenta seleccionarlo manualmente.");
        });
    };

    const handleDownloadPDF = async () => {
        if (!crucigramaListo || !grid) return;
        
        const currentUser = globalVars.META_USERS?.find(u => u.id === user.id) || user;
        if (currentUser?.plan === 'prueba' && currentUser?.downloadsCount >= 2) {
            alert("Has alcanzado el límite de 2 descargas gratuitas en tu sesión de prueba.");
            return;
        }

        const doc = new jsPDF('p', 'mm', 'a4');
        const btn = document.getElementById('BTN_DOWNLOAD_PDF');
        if (btn) btn.innerText = "⌛ DIBUJANDO PDF...";

        const dibujarPagina = async (esDocente) => {
            let startY_Cues = 195;
            const gridS = grid.length;
            // CÁLCULO DE LÍMITES REALES DE LA GRILLA (v2.0 Smart Crop)
            let minR = gridS, maxR = 0, minC = gridS, maxC = 0;
            let hasContent = false;
            for (let r = 0; r < gridS; r++) {
                for (let c = 0; c < gridS; c++) {
                    if (grid[r][c]) {
                        if (r < minR) minR = r;
                        if (r > maxR) maxR = r;
                        if (c < minC) minC = c;
                        if (c > maxC) maxC = c;
                        hasContent = true;
                    }
                }
            }

            if (!hasContent) { minR = 0; maxR = gridS - 1; minC = 0; maxC = gridS - 1; }

            const activeRows = maxR - minR + 1;
            const activeCols = maxC - minC + 1;

            // Espacio disponible: desde y=46 (debajo de línea) hasta y=190 (antes de títulos)
            const availableH = 144; 
            const cellS = Math.min(7.5, availableH / activeRows, 180 / activeCols);
            
            const gridW = activeCols * cellS;
            const gridH = activeRows * cellS;
            
            const offsetX = (210 - gridW) / 2;
            const offsetY = 46 + (availableH - gridH) / 2; // Centrado vertical en el área de juego

            if (fondo) {
                try {
                    doc.saveGraphicsState();
                    doc.setGState(new doc.GState({ opacity: fondoCasillasBlanco ? 1.0 : 0.18 }));
                    // Límites: Desde la línea del encabezado (43) hasta el banco de palabras o títulos
                    const topY = 42.5;
                    const bottomY = (esDocente || modo === 'sopa') ? 198 : (startY_Cues - 4);
                    doc.addImage(fondo, 'JPEG', 15, topY, 180, bottomY - topY, undefined, 'FAST');
                } catch (e) { 
                    console.error("Fondo PDF:", e); 
                } finally {
                    doc.restoreGraphicsState();
                }
            }

            // ENCABEZADO VECTORIAL
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(0, 31, 91);
            doc.text(titulo || "TÍTULO DEL MATERIAL", 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(`NOMBRE: __________________________________________________`, 15, 30);
            doc.text(`EDAD: ${grado || "__________"}`, 140, 30);

            doc.setDrawColor(0);
            doc.setLineWidth(0.8);
            doc.line(15, 42, 195, 42);

            // GRILLA VECTORIAL (Renderizado del área recortada)
            doc.setLineWidth(0.2);
            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const x = offsetX + ((c - minC) * cellS);
                    const y = offsetY + ((r - minR) * cellS);
                    const char = grid[r][c];

                    if (modo === 'crucigrama') {
                        if (char) {
                            doc.setDrawColor(0);
                            if (fondoCasillasBlanco) {
                                doc.setFillColor(255, 255, 255);
                                doc.rect(x, y, cellS, cellS, 'FD');
                            } else {
                                doc.rect(x, y, cellS, cellS, 'S');
                            }
                            if (esDocente) {
                                doc.setFont("helvetica", "bold");
                                doc.setFontSize(cellS > 7 ? 12 : 10);
                                doc.setTextColor(0);
                                doc.text(char, x + (cellS/2), y + (cellS*0.7), { align: 'center' });
                            }
                            const p = placedWords.find(pw => pw.r === r && pw.c === c);
                            if (p) {
                                doc.setFontSize(cellS > 7 ? 6 : 5);
                                doc.setTextColor(0);
                                doc.text(p.id.toString(), x + 0.8, y + (cellS*0.3));
                            }
                        }
                    } else {
                        doc.setDrawColor(0);
                        const esSolucion = esDocente && placedWords.some(pw => {
                            for (let i = 0; i < pw.w.length; i++) {
                                if (pw.r + i * (pw.dr || 0) === r && pw.c + i * (pw.dc || 0) === c) return true;
                            }
                            return false;
                        });
                        if (esSolucion) {
                            doc.setFillColor(179, 229, 252);
                            doc.rect(x, y, cellS, cellS, 'F');
                        } else if (fondoCasillasBlanco) {
                            doc.setFillColor(255, 255, 255);
                            doc.rect(x, y, cellS, cellS, 'F');
                        }
                        doc.rect(x, y, cellS, cellS, 'S');
                        doc.setFont("helvetica", esSolucion ? "bold" : "normal");
                        doc.setFontSize(cellS > 7 ? 12 : 10);
                        doc.setTextColor(0);
                        doc.text(char || "", x + (cellS/2), y + (cellS*0.7), { align: 'center' });
                    }
                }
            }

            // BANCO DE PALABRAS VECTORIAL
            // Ajuste dinámico: Si no hay banco, las pistas suben para aprovechar la hoja
            startY_Cues = 195; 
            if (esDocente || modo === 'sopa') {
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                const bank = placedWords.map(p => p.w).sort().join('  —  ');
                const bankLines = doc.splitTextToSize(bank, 175);
                const bankHeight = (bankLines.length * 4.5) + 4;
                doc.rect(15, 200, 180, bankHeight, 'S');
                doc.text(bankLines, 105, 205, { align: 'center' });
                startY_Cues = 200 + bankHeight + 5;
            }

            // TITULOS FUERA DE LA CAJA (v2.0) - Para ganar espacio interno
            const cuesH = Math.min(75, 287 - startY_Cues); // Aumentado de 65 a 75 para dar más margen
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0);
            doc.text(modo === 'crucigrama' ? "HORIZONTALES" : "RECTAS", 15, startY_Cues - 1.5);
            doc.text(modo === 'crucigrama' ? "VERTICALES" : "DIAGONALES", 107, startY_Cues - 1.5);

            // CAJAS CONTENEDORAS
            doc.setLineWidth(0.4);
            doc.rect(15, startY_Cues, 92, cuesH, 'S');
            doc.rect(107, startY_Cues, 88, cuesH, 'S');

            let hPistas, vPistas;
            if (modo === 'crucigrama') {
                hPistas = placedWords.filter(p => p.h).sort((a, b) => a.id - b.id);
                vPistas = placedWords.filter(p => !p.h).sort((a, b) => a.id - b.id);
            } else {
                hPistas = placedWords.filter(p => p.dr === 0 || p.dc === 0);
                vPistas = placedWords.filter(p => p.dr !== 0 && p.dc !== 0);
            }

            // AJUSTE DINÁMICO DE FUENTE PARA PISTAS (v2.0)
            const totalPistas = placedWords.length;
            const clueFontSize = totalPistas > 12 ? 7.5 : 8;
            const clueLineHeight = totalPistas > 12 ? 2.8 : 3.5;
            const clueSpacing = totalPistas > 12 ? 0.4 : 1;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(clueFontSize);
            
            const dibujarColumna = (pistas, x, yStart) => {
                let currY = yStart;
                pistas.forEach(p => {
                    const id = modo === 'crucigrama' ? p.id : (placedWords.indexOf(p) + 1);
                    const rawTxt = `${id}. ${p.d}`.replace(/\$/g, ''); 
                    const lines = doc.splitTextToSize(rawTxt, 85);
                    doc.text(lines, x, currY);
                    currY += (lines.length * clueLineHeight) + clueSpacing;
                });
            };

            dibujarColumna(hPistas, 18, startY_Cues + 4); // Iniciamos a 4mm del tope de la caja
            dibujarColumna(vPistas, 110, startY_Cues + 4);

            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text("EduCruci", 15, 10);
            doc.text("EduCruci", 195, 10, { align: 'right' });
            doc.text("Generado con Mente Activa: Aprender en casa es más divertido", 105, 292, { align: 'center' });
        };

        try {
            await dibujarPagina(true);
            doc.addPage();
            await dibujarPagina(false);
            doc.save(`${titulo.replace(/\s+/g, '_')}_EduCruci.pdf`);
            if (btn) btn.innerText = "✅ PDF DESCARGADO";
            setTimeout(() => { if (btn) btn.innerText = "DESCARGAR PDF"; }, 3000);
            
            if (user.plan === 'prueba') {
                const newCount = await db.incrementDownloadCount(user.id);
                updateUser({ downloadsCount: newCount });
            }
            
            db.logActivity(user.id, 'DOWNLOAD_PDF', { title: titulo, mode: modo, theme: tema });
        } catch (err) {
            console.error(err);
            alert("Error al generar PDF.");
            if (btn) btn.innerText = "DESCARGAR PDF";
        }
    };

    const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- COMPONENTES DE RENDERIZADO INDEPENDIENTES (UI ATÓMICA) ---

    const RenderHeader = ({ data, esDocente }) => (
        <header className="w-full">
            <h1 className="text-center uppercase m-0 text-2xl font-bold text-[#001f5b]">{data.titulo || 'TÍTULO DEL MATERIAL'}</h1>
            <div className="grid grid-cols-2 gap-2 font-bold mt-4 text-sm uppercase text-black">
                <div>MATERIA: <span>{data.area || '__________'}</span></div>
                <div>EDAD: <span>{data.grado || '__________'}</span></div>
                <div className="col-span-2 mt-1">NOMBRE: __________________________________________________</div>
            </div>
            <div className="border-b-[3px] border-black my-2"></div>
        </header>
    );

    const RenderGrid = ({ grid, placedWords, isDocente, modo, fondo }) => {
        if (!grid) return <div className="relative w-full h-[540px] flex items-center justify-center flex-shrink-0"></div>;
        
        const gridS = grid.length;

        // SMART CROP PARA LA WEB (v2.0)
        let minR = gridS, maxR = 0, minC = gridS, maxC = 0;
        let hasContent = false;
        for (let r = 0; r < gridS; r++) {
            for (let c = 0; c < gridS; c++) {
                if (grid[r][c]) {
                    if (r < minR) minR = r;
                    if (r > maxR) maxR = r;
                    if (c < minC) minC = c;
                    if (c > maxC) maxC = c;
                    hasContent = true;
                }
            }
        }
        if (!hasContent) { minR = 0; maxR = gridS - 1; minC = 0; maxC = gridS - 1; }

        const activeRows = maxR - minR + 1;
        const activeCols = maxC - minC + 1;
        const dynamicCellS = Math.min(28, Math.floor(540 / Math.max(activeRows, activeCols)));
        
        return (
            <div className="relative w-full h-[540px] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {fondo && (
                    <div 
                        className={`absolute inset-0 bg-center bg-no-repeat bg-cover ${fondoCasillasBlanco ? 'opacity-100' : 'opacity-[0.18]'} pointer-events-none`}
                        style={{ backgroundImage: `url(${fondo})` }}
                    />
                )}
                <div className="relative z-10">
                    <table className="border-collapse border-spacing-0 bg-transparent border-none" style={{ tableLayout: 'fixed' }}>
                        <tbody>
                            {Array.from({ length: activeRows }).map((_, rIdx) => {
                                const r = rIdx + minR;
                                return (
                                    <tr key={r}>
                                        {Array.from({ length: activeCols }).map((_, cIdx) => {
                                            const c = cIdx + minC;
                                            const char = grid[r][c];
                                            const p = placedWords.find(pw => pw.r === r && pw.c === c);
                                            const isActive = modo === 'crucigrama' ? char !== null : true;
                                            const showChar = isDocente || modo === 'sopa';
                                            
                                            const isSopaSol = modo === 'sopa' && isDocente && placedWords.some(pw => {
                                                for (let i = 0; i < pw.w.length; i++) {
                                                    if (pw.r + i * (pw.dr || 0) === r && pw.c + i * (pw.dc || 0) === c) return true;
                                                }
                                                return false;
                                            });

                                            return (
                                                <td 
                                                    key={c}
                                                    style={{ width: `${dynamicCellS}px`, height: `${dynamicCellS}px` }}
                                                    className={`text-center relative font-bold p-0 box-border
                                                        ${isActive && char !== null ? 'border-[1.5px] border-black' : 'border-[0.5px] border-transparent'}
                                                        ${isSopaSol ? 'bg-[#b3e5fc]' : (fondoCasillasBlanco && isActive && char !== null ? 'bg-white' : 'bg-transparent')}`}
                                                >
                                                    <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: `${dynamicCellS * 0.55}px` }}>
                                                        {modo === 'crucigrama' && char !== null && p && (
                                                            <span 
                                                                className="absolute top-[2px] left-[2px] text-black font-black leading-none"
                                                                style={{ fontSize: `${dynamicCellS * 0.25}px` }}
                                                            >
                                                                {p.id}
                                                            </span>
                                                        )}
                                                        <span className={`${modo === 'crucigrama' && !showChar ? 'invisible' : 'visible'} ${isSopaSol ? 'font-black' : ''} relative z-[5] text-black leading-none pt-[2px]`}>
                                                            {char}
                                                        </span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const RenderPistas = ({ placedWords, modo, esDocente }) => {
        let hPistas, vPistas;
        if (modo === 'crucigrama') {
            hPistas = placedWords.filter(p => p.h).sort((a, b) => a.id - b.id);
            vPistas = placedWords.filter(p => !p.h).sort((a, b) => a.id - b.id);
        } else {
            hPistas = placedWords.filter(p => p.dr === 0 || p.dc === 0);
            vPistas = placedWords.filter(p => p.dr !== 0 && p.dc !== 0);
        }

        const bank = placedWords.map(p => p.w).sort().join('  —  ');

        return (
            <div id={esDocente ? "PISTAS_DOCENTE" : "PISTAS_ESTUDIANTE"} className="w-full bg-white text-black overflow-hidden pt-2">
                {/* Títulos externos igual que en el PDF */}
                <div className="flex w-full mb-1">
                    <div className="flex-1 text-[10px] font-black uppercase text-black pl-1">
                        {modo === 'crucigrama' ? 'HORIZONTALES' : 'RECTAS'}
                    </div>
                    <div className="flex-1 text-[10px] font-black uppercase text-black pl-1">
                        {modo === 'crucigrama' ? 'VERTICALES' : 'DIAGONALES'}
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '50%', border: '2.5px solid black', padding: '10px', verticalAlign: 'top', height: '240px' }}>
                                <div className="flex flex-col gap-1 text-black">
                                    {hPistas.map((p, i) => (
                                        <div key={i} className="text-[10px] leading-tight flex items-start gap-1 text-black">
                                            <b className="whitespace-nowrap text-black">{modo === 'crucigrama' ? p.id : (placedWords.indexOf(p) + 1)}.</b>
                                            <div className="flex-1 text-black"><MathText text={p.d} /></div>
                                        </div>
                                    ))}
                                </div>
                            </td>

                            <td style={{ width: '50%', border: '2.5px solid black', padding: '10px', verticalAlign: 'top', height: '240px' }}>
                                <div className="flex flex-col gap-1 text-black">
                                    {vPistas.map((p, i) => (
                                        <div key={i} className="text-[10px] leading-tight flex items-start gap-1 text-black">
                                            <b className="whitespace-nowrap text-black">{modo === 'crucigrama' ? p.id : (placedWords.indexOf(p) + 1)}.</b>
                                            <div className="flex-1 text-black"><MathText text={p.d} /></div>
                                        </div>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    const renderSheet = (esDocente) => {
        return (
            <div className="shrink-0 relative w-[516px] h-[730px] mb-[40px] print:w-[210mm] print:h-[297mm] print:mb-0">
                <div 
                    className="hoja-preview bg-white overflow-hidden flex flex-col justify-between text-black absolute top-0 left-0 print:relative w-[794px] h-[1123px]"
                    style={{ 
                        padding: '35px 45px',
                        color: '#000000'
                    }}
                >
                    <header>
                        <h1 className="text-center uppercase m-0 text-5xl text-[#001f5b] font-chewy tracking-wide">
                            {titulo || "TÍTULO DEL MATERIAL"}
                        </h1>
                        <div className="flex justify-between items-center font-bold mt-6 text-[14px] uppercase text-black">
                            <div>NOMBRE: __________________________________________________</div>
                            <div>EDAD: {grado || "__________"}</div>
                        </div>
                        <div className="border-b-[3px] border-black my-3"></div>
                    </header>

                    <RenderGrid grid={grid} placedWords={placedWords} isDocente={esDocente} modo={modo} fondo={fondo} />

                    <div className="w-full flex flex-col mt-auto pb-4">
                        {(esDocente || modo === 'sopa') && (
                            <div className="border-2 border-black p-2 text-center font-bold uppercase mb-4 text-[11px] leading-tight text-black">
                                {placedWords.map(p => p.w).sort().join('  —  ')}
                            </div>
                        )}
                        <RenderPistas placedWords={placedWords} modo={modo} esDocente={esDocente} />
                        <div className="text-center text-[10px] text-slate-400 mt-4 italic">
                            Generado con Mente Activa: Aprender en casa es más divertido
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // BLOQUEO DE SEGURIDAD PARA USUARIOS DE PRUEBA
    if (user.plan === 'prueba' && (trialStatus === 'waiting' || trialStatus === 'ready' || trialStatus === 'expired' || trialStatus === 'loading')) {
        const currentUser = globalVars.META_USERS?.find(u => u.id === user.id) || user;
        return (
            <div className="flex h-screen bg-[#0f172a] text-white items-center justify-center p-6 text-center">
                <div className="max-w-2xl w-full bg-[#1e293b] border border-slate-800 p-12 rounded-[2.5rem] shadow-2xl space-y-8 animate-fade-in">
                    <div className="flex justify-center mb-4">
                        <MenteActivaLogo smallHeight="96px" />
                    </div>

                    {trialStatus === 'loading' && (
                        <div className="space-y-6 animate-pulse">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-blue-400">Validando Sesión de Prueba...</h2>
                            <div className="flex justify-center">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-slate-400 text-sm">Estamos verificando tu horario y disponibilidad. Un momento por favor...</p>
                        </div>
                    )}
                    {trialStatus === 'waiting' && (
                        <>
                            <h2 className="text-3xl font-black uppercase tracking-tight">Tu sesión de prueba está agendada</h2>
                            <p className="text-slate-400 text-lg">Para: <span className="text-blue-400 font-bold">{new Date(currentUser.scheduledTime).toLocaleString()}</span></p>
                            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                <p className="text-sm leading-relaxed">
                                    ¡Prepárate! En tu sesión de 24 horas podrás crear todo tipo de materiales y descargar hasta <b>2 PDFs de regalo</b>. 
                                    Asegúrate de estar en una computadora para disfrutar la experiencia completa.
                                </p>
                            </div>
                            <div className="aspect-video bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-700">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Tutorial: Cómo usar EduCruci en 2 min</span>
                            </div>
                        </>
                    )}

                    {trialStatus === 'ready' && (
                        <>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-emerald-400">¡Tu sesión está lista!</h2>
                            <p className="text-slate-400 text-lg">¿Estás en tu computadora y listo para empezar?</p>
                            <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20">
                                <p className="text-sm font-medium text-emerald-100 italic">
                                    "Al hacer clic en el botón, comenzarán tus 24 horas de acceso premium."
                                </p>
                            </div>
                            <button 
                                onClick={startTrialSession}
                                className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-black uppercase text-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all active:scale-95"
                            >
                                Empezar mis 24 horas
                            </button>
                        </>
                    )}

                    {trialStatus === 'expired' && (
                        <>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-red-400">Tu tiempo ha terminado</h2>
                            <p className="text-slate-400 text-lg">¡Esperamos que te haya gustado EduCruci! 🚀</p>
                            <div className="bg-emerald-500/10 p-8 rounded-[2rem] border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                                <h3 className="text-emerald-400 font-black text-xl mb-4 uppercase tracking-tighter">🔥 Oferta de Lanzamiento 🔥</h3>
                                <div className="space-y-2 text-left inline-block">
                                    <p className="text-sm font-bold text-slate-200">✅ ACCESO POR UN AÑO</p>
                                    <p className="text-sm font-bold text-slate-200">✅ CRUCIGRAMAS: ILIMITADOS</p>
                                    <p className="text-sm font-bold text-slate-200">✅ PUPILETRAS: ILIMITADOS</p>
                                    <p className="text-sm font-black text-emerald-400 text-lg mt-4 bg-emerald-400/10 py-2 px-4 rounded-xl border border-emerald-400/20">💰 COSTO: S/15 PAGO ÚNICO</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => window.open(`https://wa.me/51${creatorInfo.phone.replace(/\s+/g, '')}`, '_blank')}
                                className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-black uppercase text-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all active:scale-95"
                            >
                                Adquirir Oferta vía WhatsApp
                            </button>
                            <button onClick={handleLogout} className="text-slate-500 font-bold uppercase text-xs hover:text-white transition-colors">Cerrar Sesión</button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    const currentUser = globalVars.META_USERS?.find(u => u.id === user.id) || user;

    return (
        <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans print:h-auto print:bg-white print:overflow-visible">
            {showWelcomeMessage && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in print:hidden">
                    <div className="bg-[#1e293b] border border-emerald-500/50 p-8 rounded-3xl max-w-md w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-emerald-400 text-3xl">📧</span>
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">¡Bienvenido a tu Prueba!</h2>
                        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                            Tus credenciales de acceso seguro han sido enviadas a tu correo electrónico. <br/><br/>
                            <span className="text-emerald-400 font-bold text-base">Tienes 24 horas y 2 descargas PDF disponibles.</span> ¡Disfrútalo!
                        </p>
                        <button 
                            onClick={() => {
                                sessionStorage.setItem('edu_trial_welcomed', 'true');
                                setShowWelcomeMessage(false);
                            }}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all"
                        >
                            ¡Entendido, a crear!
                        </button>
                    </div>
                </div>
            )}
            {/* BARRA DE PRUEBA ACTIVA */}
            {user?.plan === 'prueba' && (
                <div className="bg-purple-600 text-white px-6 py-2 flex items-center justify-between shadow-lg relative z-[100] animate-slide-down print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase">Sesión de Prueba</div>
                        <span className="text-xs font-bold opacity-90">Hola, {user.fullName}</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase opacity-70">Descargas:</span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${currentUser.downloadsCount >= 2 ? 'bg-red-500' : 'bg-black/20'}`}>
                                {currentUser.downloadsCount || 0} / 2
                            </span>
                        </div>
                        <div className={`flex items-center gap-3 px-4 py-1 rounded-xl font-black text-lg ${timeLeft < 300 ? 'bg-red-500 animate-pulse' : 'bg-black/20'}`}>
                            <Clock size={18} />
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex flex-1 overflow-hidden print:overflow-visible">
            {/* PANEL DE CONTROL (IZQUIERDA) */}
            <aside className="w-[350px] bg-[#1e293b] border-r border-slate-800 flex flex-col z-20 shadow-2xl overflow-hidden print:hidden">
                {/* CABECERA FIJA (Logo/Título siempre visibles) */}
                <div className="flex-shrink-0">
                    <div className="h-[180px] px-6 border-b border-slate-800 flex justify-center items-center bg-[#1e293b]/50 backdrop-blur-md transition-all duration-500 relative">
                        <div onClick={() => navigate('/')} className="cursor-pointer transition-transform active:scale-95 flex justify-center items-center h-full w-full" title="Ir a Inicio">
                            <MenteActivaLogo 
                                smallHeight="140px"
                                align="center" 
                                className="w-auto transition-all duration-300" 
                                style={{ zIndex: 50 }}
                            />
                        </div>
                    </div>

                    {/* BLOQUE FIJO DE HERRAMIENTAS */}
                    <div className="px-6 pt-3 pb-5 border-b border-slate-800 bg-[#1e293b] space-y-3">
                        <div className="flex justify-end items-center px-1">
                            <button onClick={handlePanelRedirect} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-blue-400 transition-colors uppercase tracking-wider">
                                <Settings size={14} /> Panel
                            </button>
                        </div>
                        {/* BOTONES DE IA RÁPIDOS Y TUTORIAL */}
                        <div className="grid grid-cols-3 gap-2 animate-fade-in">
                            <a 
                                href="https://gemini.google.com/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                            >
                                <Sparkles size={12} /> Gemini
                            </a>
                            <a 
                                href="https://chatgpt.com/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <MessageSquare size={12} /> ChatGPT
                            </a>
                            <button 
                                onClick={() => navigate('/tutorial')}
                                className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-red-600 to-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-red-500/20 group relative overflow-hidden"
                            >
                                <Play size={12} fill="white" className="relative z-10" /> <span className="relative z-10">Tutorial</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* CUERPO DEL PANEL CON SCROLL INDEPENDIENTE */}
                <div className="flex-1 overflow-y-auto premium-scrollbar p-6 space-y-6">

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">1. Número de palabras</label>
                        <div className="grid grid-cols-2 gap-2 bg-[#0f172a] p-1 rounded-xl border border-slate-700">
                            <button 
                                type="button"
                                onClick={() => setWordCount(10)}
                                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all ${wordCount === 10 ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Estándar (10)
                            </button>
                            <button 
                                type="button"
                                onClick={() => setWordCount(15)}
                                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all ${wordCount === 15 ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Extendido (15)
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">2. Identificación</label>
                        <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">Edad del niño(a)</label>
                            <input value={grado} onChange={(e) => setGrado(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50" placeholder="Ej: 8 años" />
                        </div>

                        {/* NUEVO SELECTOR DE ENFOQUE */}
                        <div className="space-y-2 pt-2">
                            <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">Enfoque Pedagógico</label>
                            <div className="grid grid-cols-1 gap-2">
                                <label className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all ${enfoque === 'personajes' ? 'bg-blue-600/20 border-blue-500' : 'bg-[#0f172a] border-slate-700 hover:border-slate-500'}`}>
                                    <input type="radio" name="enfoque_sopa" value="personajes" checked={enfoque === 'personajes'} onChange={() => setEnfoque('personajes')} className="hidden" />
                                    <div className="text-xl">🎬</div>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-bold uppercase ${enfoque === 'personajes' ? 'text-blue-400' : 'text-slate-300'}`}>Personajes y Ficción</span>
                                        <span className={`text-[9px] leading-tight transition-colors ${enfoque === 'personajes' ? 'text-blue-200' : 'text-slate-400'}`}>Series, películas, videojuegos, cuentos y libros</span>
                                    </div>
                                </label>
                                <label className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all ${enfoque === 'escolar' ? 'bg-emerald-600/20 border-emerald-500' : 'bg-[#0f172a] border-slate-700 hover:border-slate-500'}`}>
                                    <input type="radio" name="enfoque_sopa" value="escolar" checked={enfoque === 'escolar'} onChange={() => setEnfoque('escolar')} className="hidden" />
                                    <div className="text-xl">📚</div>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-bold uppercase ${enfoque === 'escolar' ? 'text-emerald-400' : 'text-slate-300'}`}>Conocimiento Escolar</span>
                                        <span className={`text-[9px] leading-tight transition-colors ${enfoque === 'escolar' ? 'text-emerald-200' : 'text-slate-400'}`}>Historia, ciencias, geografía, lenguaje, cultura</span>
                                    </div>
                                </label>
                                <label className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all ${enfoque === 'valores' ? 'bg-rose-600/20 border-rose-500' : 'bg-[#0f172a] border-slate-700 hover:border-slate-500'}`}>
                                    <input type="radio" name="enfoque_sopa" value="valores" checked={enfoque === 'valores'} onChange={() => setEnfoque('valores')} className="hidden" />
                                    <div className="text-xl">❤️</div>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-bold uppercase ${enfoque === 'valores' ? 'text-rose-400' : 'text-slate-300'}`}>Valores y Emociones</span>
                                        <span className={`text-[9px] leading-tight transition-colors ${enfoque === 'valores' ? 'text-rose-200' : 'text-slate-400'}`}>Sentimientos, buenos hábitos, vida diaria</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-1 pt-2">
                            <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">Tema</label>
                            <textarea 
                                value={tema} 
                                onChange={(e) => setTema(e.target.value)} 
                                className="w-full h-20 bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-xs outline-none focus:border-blue-500/50 transition-all resize-none" 
                                placeholder="Ej: Personajes de Paw Patrol, El Sistema Solar..." 
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">3. Obtener ayuda de la IA</label>
                        <button 
                            onClick={copiarPrompt} 
                            className={`w-full py-4 ${promptCopied ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all duration-300`}
                        >
                            <Sparkles size={14} /> {promptCopied ? '✅ ¡PROMPT LISTO PARA PEGAR!' : 'Copiar Prompt para IA'}
                        </button>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">4. Palabras y Pistas (IA)</label>
                        <textarea value={inputData} onChange={(e) => setInputData(e.target.value)} className="w-full h-40 bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-xs outline-none focus:border-blue-500/50 transition-all resize-none" placeholder="Pegue aquí la respuesta de la IA"></textarea>
                    </div>



                    {/* BOTONES DE UTILIDAD (PEQUEÑOS) */}
                    <div className="mt-8 pt-6 border-t border-slate-800/50 flex justify-end items-center px-1 pb-10">
                        <button onClick={handleLogout} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-wider">
                            <LogOut size={16} /> Salir
                        </button>
                    </div>
                </div>
            </aside>

            {/* AREA DE PREVISUALIZACIÓN (CENTRO) */}
            <main className="flex-1 bg-[#0f172a] p-12 overflow-y-auto premium-scrollbar flex flex-col items-center gap-6 print:p-0 print:m-0 print:bg-white print:overflow-visible">
                {loading && (
                    <div className="fixed inset-0 bg-[#001f5b]/90 z-50 flex flex-col items-center justify-center gap-4 text-center">
                        <div className="w-12 h-12 border-[5px] border-white/30 border-t-[#00adc1] rounded-full animate-spin"></div>
                        <h2 className="text-xl font-black text-white">{loaderText}</h2>
                        <p className="text-sm text-white/70">Diseñando tu material de alta calidad</p>
                    </div>
                )}

                <div className="flex gap-2 mb-2 bg-[#1e293b] p-1.5 rounded-2xl shadow-xl border border-slate-800 shrink-0 print:hidden">
                    <button 
                        onClick={() => setVistaActual('solucion')}
                        className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all duration-300 ${vistaActual === 'solucion' ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        📄 Hoja de Respuestas (Solución)
                    </button>
                    <button 
                        onClick={() => setVistaActual('reto')}
                        className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all duration-300 ${vistaActual === 'reto' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        📝 Hoja de Juego (Reto)
                    </button>
                </div>

                {renderSheet(vistaActual === 'solucion')}


                </main>

                {/* PANEL DE ACCIONES (DERECHA) */}
                <aside className="w-[320px] flex-shrink-0 bg-[#1e293b] border-l border-slate-800 flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.3)] overflow-y-auto print:hidden">
                    <div className="p-6 pt-10 space-y-8">
                        {/* TARJETA IDENTIFICADORA */}
                        <div className="relative overflow-hidden bg-[#0f172a] border border-slate-700/50 rounded-[2rem] p-6 shadow-xl flex flex-col items-center text-center mx-2">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-[0.05] rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5 shadow-inner" style={{ backgroundColor: '#3b82f615' }}>
                                    <img src={sopaIcon} alt="Sopa de Letras" className="w-20 h-20 object-contain drop-shadow-lg" />
                                </div>
                                <h3 className="text-2xl uppercase font-black text-white leading-tight tracking-tight">
                                    SOPA DE LETRAS
                                </h3>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Acciones Finales</h3>
                            <div className="space-y-3">
                                <button onClick={() => procesar('sopa')} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Type size={14} /> Generar Sopa de Letras</button>
                                <button 
                                    id="BTN_PRINT_NATIVE"
                                    onClick={() => window.print()} 
                                    disabled={!crucigramaListo}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    🖨️ Imprimir Directo
                                </button>
                                <button 
                                    id="BTN_DOWNLOAD_PDF"
                                    onClick={handleDownloadPDF} 
                                    disabled={!crucigramaListo || (currentUser?.plan === 'prueba' && currentUser?.downloadsCount >= 2)} 
                                    className="hidden w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-black uppercase text-[10px] items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download size={14} /> Descargar PDF
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Personalización</h3>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Imagen de Fondo</label>
                                <button onClick={() => fondoInputRef.current.click()} className="w-full py-3 border border-dashed border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:border-blue-500/50 hover:bg-slate-800/50 flex items-center justify-center gap-2 transition-all">
                                    <ImageIcon size={14} /> {fondo ? "✅ Imagen Cargada" : "📁 Seleccionar Imagen"}
                                </button>
                                <input type="file" ref={fondoInputRef} onChange={handleFondoChange} className="hidden" accept="image/*" />
                                {(modo === 'crucigrama' || modo === 'sopa') && (
                                    <label className="flex items-center gap-2 pt-3 cursor-pointer group w-max">
                                        <div className="relative flex items-center justify-center w-4 h-4">
                                            <input 
                                                type="checkbox" 
                                                checked={fondoCasillasBlanco} 
                                                onChange={(e) => setFondoCasillasBlanco(e.target.checked)}
                                                className="peer appearance-none w-4 h-4 border border-slate-600 rounded bg-[#0f172a] checked:bg-blue-500 checked:border-blue-500 transition-all cursor-pointer"
                                            />
                                            <Sparkles className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-slate-300 transition-colors">
                                            Cuadros blancos (Imagen nítida)
                                        </span>
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default EduSopaView;
