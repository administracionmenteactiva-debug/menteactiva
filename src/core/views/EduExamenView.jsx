import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../context/AuthContext.jsx';
import { ChevronLeft, Download, FileText, Type, Image as ImageIcon, Sparkles, MessageSquare, Play, Trash2, Settings, LogOut, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/databaseService';
import { supabase } from '../lib/supabase';
import logoFinal from '../../assets/Logo_cruci+pupi-removebg-preview.png';
import examenIcon from '../../assets/icono_examen.png';
import MenteActivaLogo from '../components/common/MenteActivaLogo.jsx';

// Componente para renderizar texto con fórmulas LaTeX
const MathText = ({ text }) => {
    if (!text) return null;
    
    const parts = text.split(/(\$[^\$]+\$)/g);
    
    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('$') && part.endsWith('$')) {
                    const math = part.slice(1, -1);
                    try {
                        const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
                        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
                    } catch (e) {
                        return <span key={i}>{part}</span>;
                    }
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};

// Parser robusto de preguntas
const parseQuestions = (text) => {
    if (!text) return [];
    
    // Buscar bloques delimitados por [pregunta] y [finpregunta]
    const regex = /\[pregunta\]([\s\S]*?)\[finpregunta\]/gi;
    const matches = [...text.matchAll(regex)];
    const parsed = [];
    
    matches.forEach(m => {
        const blockText = m[1];
        
        let questionText = '';
        let options = [];
        let answerText = '';
        
        // 1. Extraer opciones
        const optionsMatch = blockText.match(/\[opciones\]([\s\S]*?)\[finopciones\]/i);
        if (optionsMatch) {
            const optionsBlock = optionsMatch[1].trim();
            optionsBlock.split('\n').forEach(line => {
                const cleanLine = line.trim();
                if (cleanLine) {
                    options.push(cleanLine);
                }
            });
        }
        
        // 2. Extraer respuesta
        const answerMatch = blockText.match(/\[respuesta\]([\s\S]*?)\[finrespuesta\]/i);
        if (answerMatch) {
            answerText = answerMatch[1].trim();
        }
        
        // 3. Obtener el texto de la pregunta (removiendo bloques de opciones y respuestas)
        let cleanedQuestion = blockText;
        cleanedQuestion = cleanedQuestion.replace(/\[opciones\][\s\S]*?\[finopciones\]/gi, '');
        cleanedQuestion = cleanedQuestion.replace(/\[respuesta\][\s\S]*?\[finrespuesta\]/gi, '');
        questionText = cleanedQuestion.trim();
        
        if (questionText) {
            parsed.push({
                question: questionText,
                options: options,
                answer: answerText
            });
        }
    });
    
    return parsed;
};

// Tamaño en bytes
const calculateSize = (text) => {
    if (!text) return 0;
    return new Blob([text]).size;
};

const EduExamenView = () => {
    const { user, logout, updateUser, globalVars } = useAuth();
    const navigate = useNavigate();

    // Estados de la Sesión de Prueba
    const [trialStatus, setTrialStatus] = useState('loading'); 
    const [timeLeft, setTimeLeft] = useState(86400); 
    const [trialStarted, setTrialStarted] = useState(false);
    const [showWelcomeMessage, setShowWelcomeMessage] = useState(user?.plan === 'prueba' && !sessionStorage.getItem('edu_trial_welcomed'));

    // Estados del generador de exámenes
    const [titulo, setTitulo] = useState('EXAMEN DE PRÁCTICA');
    const [grado, setGrado] = useState('9 AÑOS');
    const [activeSlot, setActiveSlot] = useState(1); // 1, 2, 3
    const [inputData, setInputData] = useState('');
    const [questions, setQuestions] = useState([]);
    const [selectedCount, setSelectedCount] = useState(10);
    const [generatedExam, setGeneratedExam] = useState([]);
    
    const [slots, setSlots] = useState({
        1: { title: 'EXAMEN DE PRÁCTICA', grade: '9 AÑOS', content: '' },
        2: { title: 'EXAMEN DE PRÁCTICA', grade: '9 AÑOS', content: '' },
        3: { title: 'EXAMEN DE PRÁCTICA', grade: '9 AÑOS', content: '' }
    });

    const [promptCopied, setPromptCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fondo, setFondo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loaderText, setLoaderText] = useState('');
    const [crucigramaListo, setCrucigramaListo] = useState(false);
    const [vistaActual, setVistaActual] = useState('reto'); // 'reto' o 'solucion'

    const fondoInputRef = useRef(null);

    // Obtener información del creador para el WhatsApp
    const creatorInfo = React.useMemo(() => {
        const creator = globalVars.META_USERS?.find(u => u.username === user?.createdBy || u.email === user?.createdBy || u.id === user?.createdBy);
        return {
            name: creator?.fullName || 'Soporte',
            phone: creator?.whatsappVentas || '993125547'
        };
    }, [globalVars.META_USERS, user?.createdBy]);

    // Reloj local de prueba
    const getPeruDate = React.useCallback(() => {
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * -5));
    }, []);

    useEffect(() => {
        if (!user) return;
        
        if (user.plan === 'prueba') {
            const checkTrial = () => {
                const now = new Date();
                const currentUser = globalVars.META_USERS?.find(u => u.id === user.id) || user;
                
                if (!currentUser.trialStartTime) {
                    const sched = new Date(currentUser.scheduledTime);
                    if (now < sched) {
                        setTrialStatus('waiting');
                    } else {
                        setTrialStatus('ready');
                    }
                } else {
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
    }, [user, globalVars.META_USERS]);

    // Cargar Slots del Usuario
    useEffect(() => {
        if (!user) return;
        
        const loadSlots = async () => {
            try {
                if (user.plan === 'prueba') {
                    const localData = localStorage.getItem(`menteactiva_exam_slots_${user.id}`);
                    if (localData) {
                        const parsed = JSON.parse(localData);
                        setSlots(parsed);
                        const active = parsed[1] || { title: 'EXAMEN DE PRÁCTICA', grade: '9 AÑOS', content: '' };
                        setTitulo(active.title || 'EXAMEN DE PRÁCTICA');
                        setGrado(active.grade || '9 AÑOS');
                        setInputData(active.content || '');
                        setQuestions(parseQuestions(active.content || ''));
                    }
                } else {
                    if (supabase) {
                        const { data, error } = await supabase
                            .from('system_settings')
                            .select('value')
                            .eq('key', `exam_slots_${user.id}`)
                            .maybeSingle();
                        
                        if (data && data.value && data.value.slots) {
                            setSlots(data.value.slots);
                            const active = data.value.slots[1] || { title: 'EXAMEN DE PRÁCTICA', grade: '9 AÑOS', content: '' };
                            setTitulo(active.title || 'EXAMEN DE PRÁCTICA');
                            setGrado(active.grade || '9 AÑOS');
                            setInputData(active.content || '');
                            setQuestions(parseQuestions(active.content || ''));
                        }
                    }
                }
            } catch (err) {
                console.error("Error al cargar slots:", err);
            }
        };
        
        loadSlots();
    }, [user]);

    // Parseo reactivo en tiempo real al pegar o tipear
    useEffect(() => {
        const parsed = parseQuestions(inputData);
        setQuestions(parsed);
        if (parsed.length > 0) {
            setSelectedCount(prev => Math.min(prev, parsed.length));
        }
    }, [inputData]);

    // Actualiza el estado de slots al cambiar título, grado o contenido
    useEffect(() => {
        setSlots(prev => ({
            ...prev,
            [activeSlot]: {
                title: titulo,
                grade: grado,
                content: inputData
            }
        }));
    }, [titulo, grado, inputData, activeSlot]);

    const handleSelectSlot = (slotNum) => {
        setActiveSlot(slotNum);
        const targetSlot = slots[slotNum] || { title: 'EXAMEN DE PRÁCTICA', grade: '9 AÑOS', content: '' };
        setTitulo(targetSlot.title || 'EXAMEN DE PRÁCTICA');
        setGrado(targetSlot.grade || '9 AÑOS');
        setInputData(targetSlot.content || '');
        setQuestions(parseQuestions(targetSlot.content || ''));
    };

    const startTrialSession = async () => {
        try {
            const startTime = await db.startTrial(user.id);
            updateUser({ trialStartTime: startTime });
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

    const copiarPrompt = () => {
        const tituloVal = titulo || "Examen de Práctica";
        const gradoVal = grado || "9 años";
        
        const promptText = `Actúa como un creador de exámenes y diseñador de contenido pedagógico.
Tu tarea es tomar una lista de preguntas de estudio y transformarlas en un examen estructurado. Si la lista que te dan ya contiene la respuesta solamente debes agregar opciones incorrectas de acuerdo al nivel de dificultad indicado para las preguntas de opción múltiple.

obligatorio: Bajo ninguna circunstancia generes un examen interactivo o interactivo dinámico. Responde con los parámetros del prompt, lee todo hasta el final.

Debes transcribir y adaptar cada pregunta del material según las siguientes reglas de formato:

Estructura para preguntas de opción múltiple:
[pregunta]
¿Cuál es la pregunta o reto?
[opciones]
A) Primera opción
B) Segunda opción
C) Tercera opción
D) Cuarta opción
[finopciones]
[respuesta]
Letra o texto de la respuesta correcta (ej. C)
[finrespuesta]
[finpregunta]

Estructura para preguntas abiertas o de completar:
[pregunta]
¿Cuál es la pregunta o instrucción?
[respuesta]
Respuesta esperada o sugerida para el profesor.
[finrespuesta]
[finpregunta]

REGLAS DE OBLIGATORIEDAD CRÍTICA DE ETIQUETAS:
1. CADA pregunta DEBE estar contenida exactamente entre [pregunta] y [finpregunta].
2. Si la pregunta tiene opciones de respuesta, estas DEBEN estar contenidas exactamente entre [opciones] y [finopciones].
3. La respuesta de la pregunta DEBE estar contenida exactamente entre [respuesta] y [finrespuesta].
4. ESTÁ PROHIBIDO omitir cualquiera de estas etiquetas de apertura y cierre, sin importar la cantidad de preguntas a procesar (incluso si son 100 o más). Cierra cada etiqueta de forma exacta.
5. No agregues números de lista antes de las etiquetas.
6. Mantén el texto limpio y fácil de leer.
7. Transcribe exactamente el contenido del material escolar, pero adáptalo a este formato.
8. El título general sugerido para este examen es "${tituloVal}" para un nivel de "${gradoVal}".

NORMAS DE SEGURIDAD PEDAGÓGICA Y FORMATO (RM 501):
- Este material debe alinear al cumplimiento de la Resolución Ministerial N.° 501-2025-MINEDU.
- ESCUDO ANTI-ALUCINACIÓN: Trabaja únicamente sobre las preguntas y el tema provisto en el texto base. No inventes nuevas preguntas ni agregues temas que no estén en el texto base. Sin embargo, para las opciones de respuesta incorrectas (distractores) de preguntas de opción múltiple, tienes plena libertad y la obligación de formular alternativas plausibles aunque no se mencionen explícitamente en el texto original, asegurándote de que sean factualmente incorrectas.
- PUREZA DE FORMATO (STRICT TEXT-ONLY): RESPONDE ÚNICAMENTE CON EL TEXTO SOLICITADO Y LAS ETIQUETAS DE APERTURA Y CIERRE. TU RESPUESTA DEBE COMENZAR DIRECTAMENTE CON LA ETIQUETA [pregunta] Y TERMINAR CON [finpregunta]. ESTÁ ESTRICTAMENTE PROHIBIDO INCLUIR INTRODUCCIONES, COMENTARIOS ADICIONALES, SALUDOS, DESPEDIDAS O EXPLICACIONES PEDAGÓGICAS. EL FORMATO DEBE SER 100% LIMPIO DE TEXTO AUXILIAR.
- PROHIBICIÓN DE GENERACIÓN DE APLICACIONES/INTERACTIVOS: ESTÁ ESTRICTAMENTE PROHIBIDO GENERAR CÓDIGO DE PROGRAMACIÓN (COMO REACT, HTML/JS, PYTHON), APLICACIONES INTERACTIVAS, COMPONENTES DINÁMICOS O INICIAR MÓDULOS DE EJECUCIÓN. TU RESPUESTA DEBE SER EXCLUSIVAMENTE TEXTO PLANO QUE CONTIENE LAS PREGUNTAS Y ALTERNATIVAS ETIQUETADAS SEGÚN EL FORMATO SOLICITADO. NO CREES NINGÚN SISTEMA DE JUEGO O EXAMEN INTERACTIVO EN EL CHAT.`;

        navigator.clipboard.writeText(promptText).then(() => {
            setPromptCopied(true);
            setTimeout(() => setPromptCopied(false), 2000);
        }).catch(err => {
            console.error("Error al copiar prompt:", err);
            alert("No se pudo copiar automáticamente. Por favor copia el prompt manualmente.");
        });
    };

    const saveCurrentSlot = async () => {
        if (!user) return;
        
        const bytes = calculateSize(inputData);
        if (bytes > 30720) { // 30 KB
            alert(`❌ El contenido de este slot supera el límite de 30 KB (${(bytes/1024).toFixed(1)} KB). Por favor reduce el número de preguntas antes de guardar.`);
            return;
        }
        
        setIsSaving(true);
        try {
            const targetSlots = {
                ...slots,
                [activeSlot]: {
                    title: titulo,
                    grade: grado,
                    content: inputData
                }
            };
            
            if (user.plan === 'prueba') {
                localStorage.setItem(`menteactiva_exam_slots_${user.id}`, JSON.stringify(targetSlots));
                alert(`✅ Balotario del Slot ${activeSlot} guardado localmente.`);
            } else {
                if (supabase) {
                    const { error } = await supabase
                        .from('system_settings')
                        .upsert({
                            key: `exam_slots_${user.id}`,
                            value: { slots: targetSlots },
                            updated_at: new Date().toISOString()
                        });
                        
                    if (error) throw error;
                    alert(`✅ Balotario del Slot ${activeSlot} guardado en la nube (Supabase).`);
                } else {
                    throw new Error("Supabase no está disponible (modo offline)");
                }
            }
            setSlots(targetSlots);
            setQuestions(parseQuestions(inputData));
        } catch (err) {
            console.error("Error al guardar:", err);
            alert("❌ Error al guardar el balotario: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const generarExamen = () => {
        if (questions.length === 0) {
            alert("No hay preguntas disponibles en el balotario activo.");
            return;
        }
        
        setLoading(true);
        setLoaderText("Preparando Examen de Práctica...");
        
        setTimeout(() => {
            const shuffled = [...questions].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, Math.min(selectedCount, questions.length));
            
            setGeneratedExam(selected);
            setCrucigramaListo(true);
            setLoading(false);
            setVistaActual('reto');
        }, 800);
    };

    const handleFondoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setFondo(event.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleDownloadPDF = async () => {
        if (!crucigramaListo || !generatedExam || generatedExam.length === 0) return;
        
        const currentUser = globalVars.META_USERS?.find(u => u.id === user.id) || user;
        if (currentUser?.plan === 'prueba' && currentUser?.downloadsCount >= 2) {
            alert("Has alcanzado el límite de 2 descargas gratuitas en tu sesión de prueba.");
            return;
        }

        const doc = new jsPDF('p', 'mm', 'a4');
        const btn = document.getElementById('BTN_EXAM_DOWNLOAD_PDF');
        if (btn) btn.innerText = "⌛ DIBUJANDO PDF...";

        const dibujarPagina = async (esDocente) => {
            if (fondo) {
                try {
                    doc.saveGraphicsState();
                    doc.setGState(new doc.GState({ opacity: 0.18 }));
                    doc.addImage(fondo, 'JPEG', 15, 42.5, 180, 220, undefined, 'FAST');
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
            doc.text(titulo || "EXAMEN DE PRÁCTICA", 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(`NOMBRE: __________________________________________________`, 15, 32);
            doc.text(`EDAD: ${grado || "__________"}`, 140, 32);
            doc.text(`FECHA: ____/____/________`, 15, 38);

            doc.setDrawColor(0);
            doc.setLineWidth(0.8);
            doc.line(15, 42, 195, 42);

            let currentY = 50;
            const count = generatedExam.length;
            const fontSize = count > 10 ? 9 : count > 6 ? 10 : 11;
            const optFontSize = count > 10 ? 8 : count > 6 ? 9 : 9.5;
            const openLinesCount = count > 10 ? 1 : count > 6 ? 2 : 3;

            doc.setFont("helvetica", "normal");
            
            for (let idx = 0; idx < count; idx++) {
                const q = generatedExam[idx];
                const hasOptions = q.options && q.options.length > 0;
                
                doc.setFont("helvetica", "bold");
                doc.setFontSize(fontSize);
                const qText = `${idx + 1}. ${q.question}`;
                const qLines = doc.splitTextToSize(qText, 175);
                const qHeight = qLines.length * (fontSize * 0.4);
                
                let neededHeight = qHeight + 4;
                if (hasOptions) {
                    neededHeight += Math.ceil(q.options.length / 2) * (optFontSize * 0.4 + 4);
                } else {
                    neededHeight += esDocente ? 12 : openLinesCount * 7;
                }
                
                if (currentY + neededHeight > 280) {
                    doc.addPage();
                    if (fondo) {
                        try {
                            doc.saveGraphicsState();
                            doc.setGState(new doc.GState({ opacity: 0.18 }));
                            doc.addImage(fondo, 'JPEG', 15, 42.5, 180, 220, undefined, 'FAST');
                        } catch (e) {
                            console.error("Fondo PDF:", e);
                        } finally {
                            doc.restoreGraphicsState();
                        }
                    }
                    currentY = 25;
                }

                doc.setFont("helvetica", "bold");
                doc.setFontSize(fontSize);
                doc.setTextColor(15, 23, 42);
                doc.text(qLines, 15, currentY);
                currentY += qHeight + 2;

                doc.setFont("helvetica", "normal");
                doc.setFontSize(optFontSize);
                
                if (hasOptions) {
                    const colX = [20, 105];
                    
                    q.options.forEach((opt, oIdx) => {
                        const optLetter = opt.trim().charAt(0).toUpperCase();
                        const isCorrect = q.answer.trim().toUpperCase() === optLetter || 
                                          q.answer.trim().toUpperCase() === opt.trim().toUpperCase() ||
                                          (q.answer.length === 1 && opt.toUpperCase().startsWith(q.answer.toUpperCase()));
                                          
                        const colIdx = oIdx % 2;
                        const rowIdx = Math.floor(oIdx / 2);
                        
                        const x = colX[colIdx];
                        const y = currentY + (rowIdx * (optFontSize * 0.4 + 4));
                        
                        doc.setDrawColor(120);
                        doc.setLineWidth(0.2);
                        if (esDocente && isCorrect) {
                            doc.setDrawColor(16, 185, 129);
                            doc.setFillColor(209, 250, 229);
                            doc.rect(x, y - 3, 3.5, 3.5, 'FD');
                            doc.setFont("helvetica", "bold");
                            doc.setTextColor(16, 185, 129);
                            doc.text("✓", x + 0.8, y - 0.5);
                        } else {
                            doc.rect(x, y - 3, 3.5, 3.5, 'S');
                            doc.setTextColor(71, 85, 105);
                        }
                        doc.setFont("helvetica", esDocente && isCorrect ? "bold" : "normal");
                        doc.setFontSize(optFontSize);
                        doc.text(opt, x + 6, y);
                    });
                    
                    currentY += Math.ceil(q.options.length / 2) * (optFontSize * 0.4 + 4) + 2;
                } else {
                    if (esDocente) {
                        doc.setFillColor(239, 246, 255);
                        doc.setDrawColor(191, 219, 254);
                        doc.setLineWidth(0.25);
                        
                        const ansText = `Respuesta sugerida: ${q.answer}`;
                        const ansLines = doc.splitTextToSize(ansText, 165);
                        const ansHeight = ansLines.length * 4.5 + 4;
                        
                        doc.rect(20, currentY, 170, ansHeight, 'FD');
                        
                        doc.setFont("helvetica", "bold");
                        doc.setTextColor(30, 64, 175);
                        doc.text(ansLines, 23, currentY + 4.5);
                        
                        currentY += ansHeight + 3;
                    } else {
                        doc.setDrawColor(203, 213, 225);
                        doc.setLineWidth(0.2);
                        
                        for (let l = 0; l < openLinesCount; l++) {
                            const lineY = currentY + (l * 7) + 5;
                            doc.line(20, lineY, 190, lineY);
                        }
                        currentY += openLinesCount * 7 + 4;
                    }
                }
                currentY += 3;
            }

            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.setFont("helvetica", "normal");
            doc.text("Mente Activa", 15, 10);
            doc.text("Crea Quiz", 195, 10, { align: 'right' });
            doc.text("Generado con Mente Activa: Aprender en casa es más divertido", 105, 292, { align: 'center' });
        };

        try {
            await dibujarPagina(false); // Reto
            doc.addPage();
            await dibujarPagina(true); // Solución
            doc.save(`${titulo.replace(/\s+/g, '_')}_Quiz_MenteActiva.pdf`);
            
            if (btn) btn.innerText = "✅ PDF DESCARGADO";
            setTimeout(() => { if (btn) btn.innerText = "DESCARGAR PDF"; }, 3000);
            
            if (user.plan === 'prueba') {
                const newCount = await db.incrementDownloadCount(user.id);
                updateUser({ downloadsCount: newCount });
            }
            
            db.logActivity(user.id, 'DOWNLOAD_PDF', { title: titulo, mode: 'examen', questionsCount: generatedExam.length });
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

    const RenderQuestionsList = ({ questionsList, esDocente }) => {
        if (!questionsList || questionsList.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-[350px] text-slate-400 border border-dashed border-slate-300 rounded-3xl p-8 bg-slate-50/50">
                    <span className="text-4xl mb-4">📝</span>
                    <p className="font-bold text-sm text-center text-slate-700">No se ha generado ningún examen aún.</p>
                    <p className="text-xs text-center text-slate-500 mt-1">Configura el balotario a la izquierda y presiona "Generar Examen".</p>
                </div>
            );
        }
        
        const count = questionsList.length;
        const itemGap = count > 10 ? 'gap-2' : count > 6 ? 'gap-4' : 'gap-6';
        const fontSize = count > 10 ? 'text-[12px]' : count > 6 ? 'text-[14px]' : 'text-[15px]';
        const optFontSize = count > 10 ? 'text-[11px]' : count > 6 ? 'text-[13px]' : 'text-[13.5px]';
        const openLines = count > 10 ? 1 : count > 6 ? 2 : 3;

        return (
            <div className={`flex flex-col ${itemGap} w-full text-black text-left font-sans`}>
                {questionsList.map((q, idx) => {
                    const hasOptions = q.options && q.options.length > 0;
                    
                    return (
                        <div key={idx} className="space-y-2 break-inside-avoid">
                            <div className={`${fontSize} font-bold text-slate-900 flex gap-2`}>
                                <span>{idx + 1}.</span>
                                <p className="leading-tight"><MathText text={q.question} /></p>
                            </div>
                            
                            {hasOptions ? (
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pl-6">
                                    {q.options.map((opt, oIdx) => {
                                        const optLetter = opt.trim().charAt(0).toUpperCase();
                                        const isCorrect = q.answer.trim().toUpperCase() === optLetter || 
                                                          q.answer.trim().toUpperCase() === opt.trim().toUpperCase() ||
                                                          (q.answer.length === 1 && opt.toUpperCase().startsWith(q.answer.toUpperCase()));
                                                          
                                        return (
                                            <div 
                                                key={oIdx} 
                                                className={`flex items-center gap-2 ${optFontSize} ${esDocente && isCorrect ? 'text-emerald-600 font-bold' : 'text-slate-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0
                                                    ${esDocente && isCorrect ? 'border-emerald-600 bg-emerald-50 text-emerald-600 font-black' : 'border-slate-400 bg-white'}`}
                                                >
                                                    {esDocente && isCorrect ? '✓' : ''}
                                                </div>
                                                <span>{opt}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="pl-6 space-y-1">
                                    {esDocente ? (
                                        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-3 text-xs leading-relaxed">
                                            <span className="font-bold">Respuesta sugerida: </span>
                                            <MathText text={q.answer} />
                                        </div>
                                    ) : (
                                        Array.from({ length: openLines }).map((_, lIdx) => (
                                            <div key={lIdx} className="border-b border-dashed border-slate-300 h-6 w-full"></div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderSheet = (esDocente) => {
        return (
            <div className="shrink-0 relative w-[516px] h-[730px] mb-[40px] print:w-[210mm] print:h-[297mm] print:mb-0">
                <div 
                    className="hoja-preview bg-white flex flex-col justify-between text-black absolute top-0 left-0 print:relative w-[794px] h-[1123px] overflow-hidden"
                    style={{ 
                        padding: '45px 55px',
                        color: '#000000',
                        backgroundImage: fondo ? `url(${fondo})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    {fondo && (
                        <div 
                            className="absolute inset-0 bg-white/80 pointer-events-none"
                        />
                    )}
                    
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <header>
                                <h1 className="text-center uppercase m-0 text-3xl text-[#001f5b] font-bold tracking-tight">
                                    {titulo || "EXAMEN DE PRÁCTICA"}
                                </h1>
                                <div className="flex justify-between items-center font-bold mt-6 text-[12px] uppercase text-black">
                                    <div>NOMBRE: __________________________________________________</div>
                                    <div>EDAD: {grado || "__________"}</div>
                                </div>
                                <div className="flex justify-between items-center font-bold mt-2 text-[12px] uppercase text-slate-500">
                                    <div>FECHA: ____/____/________</div>
                                    <div>SLOT: {activeSlot}</div>
                                </div>
                                <div className="border-b-[2px] border-black my-4"></div>
                            </header>

                            <div className="my-2 overflow-y-auto max-h-[750px] premium-scrollbar pr-2">
                                <RenderQuestionsList questionsList={generatedExam} esDocente={esDocente} />
                            </div>
                        </div>

                        <footer className="border-t border-slate-200 pt-4 flex justify-between items-center text-[10px] text-slate-400 mt-auto">
                            <span>Mente Activa</span>
                            <span>Generado con Mente Activa: Aprender en casa es más divertido</span>
                            <span>Crea Quiz</span>
                        </footer>
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
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Tutorial: Cómo usar EduExamen en 2 min</span>
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
                            <p className="text-slate-400 text-lg">¡Esperamos que te haya gustado Crea Quiz! 🚀</p>
                            <div className="bg-emerald-500/10 p-8 rounded-[2rem] border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                                <h3 className="text-emerald-400 font-black text-xl mb-4 uppercase tracking-tighter">🔥 Oferta de Lanzamiento 🔥</h3>
                                <div className="space-y-2 text-left inline-block">
                                    <p className="text-sm font-bold text-slate-200">✅ ACCESO POR UN AÑO</p>
                                    <p className="text-sm font-bold text-slate-200">✅ CREA QUIZ: ILIMITADOS</p>
                                    <p className="text-sm font-bold text-slate-200">✅ CRUCIGRAMAS Y PUPILETRAS: ILIMITADOS</p>
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
                        {/* 1. IDENTIFICACIÓN */}
                        <div className="space-y-3">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">1. Identificación del Material</label>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">Título del Examen</label>
                                <input 
                                    id="INPUT_EXAM_TITLE" 
                                    value={titulo} 
                                    onChange={(e) => setTitulo(e.target.value)} 
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50" 
                                    placeholder="Ej: EXAMEN DE MATEMÁTICAS" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">Edad o Grado del niño(a)</label>
                                <input 
                                    id="INPUT_EXAM_GRADE" 
                                    value={grado} 
                                    onChange={(e) => setGrado(e.target.value)} 
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50" 
                                    placeholder="Ej: 9 años" 
                                />
                            </div>
                        </div>

                        {/* 2. EL ENSAMBLADOR DE INSTRUCCIONES */}
                        <div className="space-y-3">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">2. El Ensamblador de Instrucciones</label>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">Slot de Almacenamiento (Max 3)</label>
                                <div className="grid grid-cols-3 gap-1.5 bg-[#0f172a] p-1 rounded-xl border border-slate-700">
                                    {[1, 2, 3].map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => handleSelectSlot(num)}
                                            className={`py-1.5 text-[10px] font-black rounded-lg transition-all ${activeSlot === num ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            Slot {num}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                type="button"
                                onClick={copiarPrompt} 
                                className={`w-full py-3.5 ${promptCopied ? 'bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all duration-300`}
                            >
                                <Sparkles size={13} /> {promptCopied ? '✅ ¡PROMPT LISTO!' : 'Copiar Prompt para la IA'}
                            </button>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[9px] uppercase font-bold text-slate-600">Pegar respuesta de la IA</label>
                                    <span className={`text-[9px] font-bold ${calculateSize(inputData) > 30000 ? 'text-red-500' : 'text-slate-500'}`}>
                                        {(calculateSize(inputData) / 1024).toFixed(1)} KB / 30 KB
                                    </span>
                                </div>
                                <textarea 
                                    id="INPUT_PASTE_ZONE"
                                    value={inputData} 
                                    onChange={(e) => setInputData(e.target.value)} 
                                    className="w-full h-32 bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-blue-500/50 transition-all resize-none premium-scrollbar" 
                                    placeholder="Pegue aquí el texto estructurado que le entregó la IA..." 
                                />
                            </div>

                            <button 
                                type="button"
                                onClick={saveCurrentSlot}
                                disabled={isSaving}
                                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold uppercase text-[9px] flex items-center justify-center gap-1.5 transition-all"
                            >
                                💾 {isSaving ? 'Guardando...' : 'Guardar Balotario'}
                            </button>
                        </div>

                        {/* 3. CONFIGURACIÓN DEL EXAMEN */}
                        <div className="space-y-3 pt-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">3. Configuración del Examen</label>
                            
                            <div className="bg-[#0f172a]/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Preguntas disponibles:</span>
                                    <span className="font-black text-white">{questions.length}</span>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-bold text-slate-600">Preguntas a incluir</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        max={questions.length || 1}
                                        value={selectedCount}
                                        onChange={(e) => setSelectedCount(Math.max(1, Math.min(questions.length, parseInt(e.target.value) || 1)))}
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50 font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* BOTONES DE UTILIDAD */}
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
                            <p className="text-sm text-white/70">Armando tu material personalizado</p>
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
                            📝 Hoja de Quiz (Reto)
                        </button>
                    </div>

                    {renderSheet(vistaActual === 'solucion')}
                </main>

                {/* PANEL DE ACCIONES (DERECHA) */}
                <aside className="w-[320px] flex-shrink-0 bg-[#1e293b] border-l border-slate-800 flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.3)] overflow-y-auto print:hidden">
                    <div className="p-6 pt-10 space-y-8">
                        <div className="relative overflow-hidden bg-[#0f172a] border border-slate-700/50 rounded-[2rem] p-6 shadow-xl flex flex-col items-center text-center mx-2">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-[0.05] rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5 shadow-inner" style={{ backgroundColor: '#10b98115' }}>
                                    <img src={examenIcon} alt="Crea Quiz" className="w-20 h-20 object-contain drop-shadow-lg" />
                                </div>
                                <h3 className="text-2xl uppercase font-black text-white leading-tight tracking-tight">
                                    CREA QUIZ
                                </h3>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Acciones Finales</h3>
                            <div className="space-y-3">
                                <button 
                                    id="BTN_EXAM_GENERATE" 
                                    onClick={generarExamen} 
                                    disabled={questions.length === 0}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                >
                                    <Type size={14} /> Generar Quiz
                                </button>
                                <button 
                                    id="BTN_PRINT_NATIVE"
                                    onClick={() => window.print()} 
                                    disabled={!crucigramaListo}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    🖨️ Imprimir Directo
                                </button>
                                <button 
                                    id="BTN_EXAM_DOWNLOAD_PDF"
                                    onClick={handleDownloadPDF} 
                                    disabled={!crucigramaListo || (currentUser?.plan === 'prueba' && currentUser?.downloadsCount >= 2)} 
                                    className="flex w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-black uppercase text-[10px] items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default EduExamenView;
