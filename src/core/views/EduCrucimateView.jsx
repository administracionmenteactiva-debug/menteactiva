import React, { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../context/AuthContext.jsx';
import { ChevronLeft, Download, FileText, Sparkles, MessageSquare, Play, Settings, LogOut, Clock, Calculator, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/databaseService';
import MenteActivaLogo from '../components/common/MenteActivaLogo.jsx';
import crucigramaIcon from '../../assets/icono_crucigrama-1.png';
import crucimateIcon from '../../assets/icono_crucimate.png';

// Componente para renderizar celdas con soporte para fracciones en KaTeX
const MathCellRender = ({ text }) => {
    if (!text) return null;
    if (text.includes('\\frac')) {
        try {
            return (
                <span 
                    className="inline-block"
                    dangerouslySetInnerHTML={{ 
                        __html: katex.renderToString(text, { throwOnError: false, displayMode: false }) 
                    }} 
                />
            );
        } catch (e) {
            return <span>{text.replace(/\\frac\{(\d+)\}\{(\d+)\}/g, '$1/$2')}</span>;
        }
    }
    return <span>{text}</span>;
};

// Generador de ecuaciones individuales válidas
const generateSingleEquation = (age, numberType, allowedOps) => {
    let maxVal = 20;
    if (age === '5-6') maxVal = 10;
    else if (age === '7-8') maxVal = 30;
    else if (age === '9-10') maxVal = 50;
    else maxVal = 100;

    const activeOps = [];
    if (allowedOps.add) activeOps.push('+');
    if (allowedOps.sub) activeOps.push('-');
    if (allowedOps.mul) activeOps.push('x');
    if (allowedOps.div) activeOps.push(':');
    if (allowedOps.comp) activeOps.push('comp');

    if (activeOps.length === 0) activeOps.push('+');
    const op = activeOps[Math.floor(Math.random() * activeOps.length)];

    if (numberType === 'racionales') {
        const getRational = () => {
            return (Math.floor(Math.random() * (maxVal * 2)) + 1) / 2;
        };
        const formatRational = (val) => {
            if (val % 1 === 0) return val.toString();
            const double = val * 2;
            return `\\frac{${double}}{2}`;
        };

        if (op === '+') {
            const A = getRational();
            const B = getRational();
            const C = A + B;
            return [formatRational(A), '+', formatRational(B), '=', formatRational(C)];
        } else if (op === '-') {
            const A = getRational();
            const B = getRational();
            const minuend = Math.max(A, B);
            const subtrahend = Math.min(A, B);
            const C = minuend - subtrahend;
            return [formatRational(minuend), '-', formatRational(subtrahend), '=', formatRational(C)];
        } else if (op === 'x') {
            const A = (Math.floor(Math.random() * 8) + 1) / 2;
            const B = Math.floor(Math.random() * 10) + 1;
            const C = A * B;
            return [formatRational(A), 'x', formatRational(B), '=', formatRational(C)];
        } else if (op === ':') {
            const B = (Math.floor(Math.random() * 4) + 1) / 2;
            const C = Math.floor(Math.random() * 8) + 1;
            const A = B * C;
            return [formatRational(A), ':', formatRational(B), '=', formatRational(C)];
        } else {
            const A = getRational();
            const B = getRational();
            const compOp = A > B ? '>' : (A < B ? '<' : '=');
            return [formatRational(A), compOp, formatRational(B)];
        }
    } else if (numberType === 'enteros') {
        const getInteger = () => {
            const sign = Math.random() > 0.4 ? 1 : -1;
            return (Math.floor(Math.random() * maxVal) + 1) * sign;
        };
        if (op === '+') {
            const A = getInteger();
            const B = getInteger();
            const C = A + B;
            return [A.toString(), '+', B.toString(), '=', C.toString()];
        } else if (op === '-') {
            const A = getInteger();
            const B = getInteger();
            const C = A - B;
            return [A.toString(), '-', B.toString(), '=', C.toString()];
        } else if (op === 'x') {
            const A = (Math.floor(Math.random() * 10) + 1) * (Math.random() > 0.5 ? 1 : -1);
            const B = (Math.floor(Math.random() * 10) + 1) * (Math.random() > 0.5 ? 1 : -1);
            const C = A * B;
            return [A.toString(), 'x', B.toString(), '=', C.toString()];
        } else if (op === ':') {
            const B = (Math.floor(Math.random() * 9) + 1) * (Math.random() > 0.5 ? 1 : -1);
            const C = (Math.floor(Math.random() * 9) + 1) * (Math.random() > 0.5 ? 1 : -1);
            const A = B * C;
            return [A.toString(), ':', B.toString(), '=', C.toString()];
        } else {
            const A = getInteger();
            const B = getInteger();
            const compOp = A > B ? '>' : (A < B ? '<' : '=');
            return [A.toString(), compOp, B.toString()];
        }
    } else {
        const getNatural = () => Math.floor(Math.random() * maxVal) + 1;
        if (op === '+') {
            const A = getNatural();
            const B = getNatural();
            const C = A + B;
            return [A.toString(), '+', B.toString(), '=', C.toString()];
        } else if (op === '-') {
            const A = getNatural();
            const B = getNatural();
            const minuend = Math.max(A, B);
            const subtrahend = Math.min(A, B);
            const C = minuend - subtrahend;
            return [minuend.toString(), '-', subtrahend.toString(), '=', C.toString()];
        } else if (op === 'x') {
            const A = Math.floor(Math.random() * 9) + 2;
            const B = Math.floor(Math.random() * 9) + 2;
            const C = A * B;
            return [A.toString(), 'x', B.toString(), '=', C.toString()];
        } else if (op === ':') {
            const B = Math.floor(Math.random() * 9) + 2;
            const C = Math.floor(Math.random() * 9) + 2;
            const A = B * C;
            return [A.toString(), ':', B.toString(), '=', C.toString()];
        } else {
            const A = getNatural();
            const B = getNatural();
            const compOp = A > B ? '>' : (A < B ? '<' : '=');
            return [A.toString(), compOp, B.toString()];
        }
    }
};

// Buscar ecuación con restricción de valor en una posición y con longitud exacta
const generateEquationWithConstraint = (age, numberType, allowedOps, targetValue, targetIndex, targetLength) => {
    for (let attempts = 0; attempts < 1000; attempts++) {
        const eq = generateSingleEquation(age, numberType, allowedOps);
        if (eq && eq.length === targetLength && eq.length > targetIndex && eq[targetIndex] === targetValue) {
            return eq;
        }
    }
    return null;
};

// Algoritmo de cruzamiento principal
const runMathCrosswordMotor = (age, numberType, allowedOps, cantidadOperaciones = 10) => {
    const size = 19;
    let bestGrid = null;
    let bestEquations = [];

    for (let attempt = 0; attempt < 300; attempt++) {
        let grid = Array(size).fill(null).map(() => Array(size).fill(null));
        let placedEqs = [];

        const firstEq = generateSingleEquation(age, numberType, allowedOps);
        if (!firstEq) continue;

        const startR = 9;
        const startC = Math.floor((size - firstEq.length) / 2);

        for (let k = 0; k < firstEq.length; k++) {
            const val = firstEq[k];
            const isOp = ['+', '-', 'x', ':', '=', '<', '>'].includes(val);
            grid[startR][startC + k] = { char: val, isOp, isBlank: false, eqId: 1 };
        }
        placedEqs.push({ tokens: firstEq, r: startR, c: startC, h: true, id: 1 });

        let eqIdCounter = 2;
        let noProgressCount = 0;

        while (placedEqs.length < cantidadOperaciones && noProgressCount < 30) {
            let candidates = [];
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    const cell = grid[r][c];
                    if (cell && !cell.isOp) {
                        const eq = placedEqs.find(e => e.id === cell.eqId);
                        if (eq) {
                            candidates.push({ r, c, val: cell.char, h: eq.h, eqId: cell.eqId });
                        }
                    }
                }
            }

            candidates.sort(() => Math.random() - 0.5);

            let placedInThisStep = false;
            for (let cand of candidates) {
                const newIsHorizontal = !cand.h;
                const tryLengths = Math.random() > 0.4 ? [5, 3] : [3, 5];

                for (let len of tryLengths) {
                    // Si comparaciones no está activo, no permitimos longitud 3
                    if (len === 3 && !allowedOps.comp) continue;

                    const indices = len === 5 ? [0, 2, 4] : [0, 2];
                    indices.sort(() => Math.random() - 0.5);

                    for (let idx of indices) {
                        const newEq = generateEquationWithConstraint(age, numberType, allowedOps, cand.val, idx, len);
                        if (!newEq) continue;

                        const newStartR = newIsHorizontal ? cand.r : cand.r - idx;
                        const newStartC = newIsHorizontal ? cand.c - idx : cand.c;

                        let fits = true;

                        if (newIsHorizontal) {
                            if (newStartC < 0 || newStartC + len > size) fits = false;
                        } else {
                            if (newStartR < 0 || newStartR + len > size) fits = false;
                        }

                        if (!fits) continue;

                        for (let k = 0; k < len; k++) {
                            const currR = newIsHorizontal ? newStartR : newStartR + k;
                            const currC = newIsHorizontal ? newStartC + k : newStartC;
                            const currentVal = newEq[k];
                            const currentIsOp = ['+', '-', 'x', ':', '=', '<', '>'].includes(currentVal);

                            const existingCell = grid[currR][currC];

                            if (existingCell) {
                                if (existingCell.char !== currentVal || existingCell.isOp !== currentIsOp) {
                                    fits = false;
                                    break;
                                }
                            } else {
                                if (newIsHorizontal) {
                                    if (currR > 0 && grid[currR - 1][currC]) { fits = false; break; }
                                    if (currR < size - 1 && grid[currR + 1][currC]) { fits = false; break; }
                                } else {
                                    if (currC > 0 && grid[currR][currC - 1]) { fits = false; break; }
                                    if (currC < size - 1 && grid[currR][currC + 1]) { fits = false; break; }
                                }
                            }
                        }

                        if (fits) {
                            if (newIsHorizontal) {
                                if (newStartC > 0 && grid[newStartR][newStartC - 1]) fits = false;
                                if (newStartC + len < size && grid[newStartR][newStartC + len]) fits = false;
                            } else {
                                if (newStartR > 0 && grid[newStartR - 1][newStartC]) fits = false;
                                if (newStartR + len < size && grid[newStartR + len][newStartC]) fits = false;
                            }
                        }

                        if (fits) {
                            for (let k = 0; k < len; k++) {
                                const currR = newIsHorizontal ? newStartR : newStartR + k;
                                const currC = newIsHorizontal ? newStartC + k : newStartC;
                                const currentVal = newEq[k];
                                const currentIsOp = ['+', '-', 'x', ':', '=', '<', '>'].includes(currentVal);

                                if (!grid[currR][currC]) {
                                    grid[currR][currC] = { char: currentVal, isOp: currentIsOp, isBlank: false, eqId: eqIdCounter };
                                }
                            }
                            placedEqs.push({ tokens: newEq, r: newStartR, c: newStartC, h: newIsHorizontal, id: eqIdCounter });
                            eqIdCounter++;
                            placedInThisStep = true;
                            break;
                        }
                    }
                    if (placedInThisStep) break;
                }
                if (placedInThisStep) break;
            }

            if (placedInThisStep) {
                noProgressCount = 0;
            } else {
                noProgressCount++;
            }
        }

        if (!bestGrid || placedEqs.length > bestEquations.length) {
            bestGrid = JSON.parse(JSON.stringify(grid));
            bestEquations = [...placedEqs];
            if (bestEquations.length >= cantidadOperaciones) break;
        }
    }

    return { grid: bestGrid, placedEquations: bestEquations };
};

// Ocultar casillas según dificultad
const applyBlankCells = (grid, difficulty) => {
    if (!grid) return;

    let hidePercent = 0.35;
    if (difficulty === 'medio') hidePercent = 0.55;
    else if (difficulty === 'dificil') hidePercent = 0.75;

    let eligible = [];
    const size = grid.length;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = grid[r][c];
            if (cell) {
                if (cell.char === '=') continue;
                if (!cell.isOp) {
                    eligible.push({ r, c });
                } else if (difficulty !== 'facil' && cell.char !== '=') {
                    eligible.push({ r, c });
                }
            }
        }
    }

    eligible.sort(() => Math.random() - 0.5);
    const countToHide = Math.floor(eligible.length * hidePercent);
    for (let i = 0; i < countToHide; i++) {
        const { r, c } = eligible[i];
        grid[r][c].isBlank = true;
    }
};

const EduCrucimateView = () => {
    const { theme, user, logout, getPeruDate, updateGlobalVars, globalVars, updateUser } = useAuth();
    const navigate = useNavigate();

    // Estados de la Sesión de Prueba
    const [trialStatus, setTrialStatus] = useState('loading');
    const [timeLeft, setTimeLeft] = useState(86400);
    const [trialStarted, setTrialStarted] = useState(false);
    const [showWelcomeMessage, setShowWelcomeMessage] = useState(user?.plan === 'prueba' && !sessionStorage.getItem('edu_trial_welcomed'));

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
        if (isAdmin) navigate('/admin');
        else navigate('/user');
    };

    const handleLogout = () => {
        if (user?.plan === 'prueba') {
            const confirmLogout = window.confirm(
                `¡Gracias por probar Crucimate! 🚀\n\n` +
                `Comuníquese a WhatsApp: ${creatorInfo.phone}\n\n` +
                `¿Desea cerrar sesión ahora?`
            );
            if (!confirmLogout) return;
        }
        logout();
        navigate('/login');
    };

    // Estados del Generador
    const [titulo, setTitulo] = useState('Crucimate de Aritmética');
    const [grado, setGrado] = useState('8 años'); // Reutilizado para la Edad del niño
    const [dificultad, setDificultad] = useState('medio');
    const [tipoNumero, setTipoNumero] = useState('naturales');
    const [cantidadOperaciones, setCantidadOperaciones] = useState(10);
    const [allowedOps, setAllowedOps] = useState({
        add: true,
        sub: true,
        mul: false,
        div: false,
        comp: false
    });

    const [grid, setGrid] = useState(null);
    const [placedWords, setPlacedWords] = useState([]);
    const [crucigramaListo, setCrucigramaListo] = useState(false);
    const [vistaActual, setVistaActual] = useState('reto');
    const [fondo, setFondo] = useState(null);
    const [fondoCasillasBlanco, setFondoCasillasBlanco] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loaderText, setLoaderText] = useState('');

    // Ajustes automáticos basados en la Edad
    useEffect(() => {
        const numericAge = parseInt(grado.replace(/\D/g, '')) || 8;
        if (numericAge <= 6) {
            setAllowedOps({ add: true, sub: true, mul: false, div: false, comp: true });
            if (tipoNumero !== 'naturales') setTipoNumero('naturales');
        } else if (numericAge <= 8) {
            setAllowedOps({ add: true, sub: true, mul: true, div: false, comp: false });
        } else {
            setAllowedOps({ add: true, sub: true, mul: true, div: true, comp: false });
        }
    }, [grado]);

    // Generador Local Aritmético
    const generarTablero = () => {
        setLoading(true);
        setLoaderText("Diseñando Crucimate...");

        setTimeout(() => {
            const ageGroup = parseInt(grado.replace(/\D/g, '')) <= 6 ? '5-6' : 
                             parseInt(grado.replace(/\D/g, '')) <= 8 ? '7-8' : 
                             parseInt(grado.replace(/\D/g, '')) <= 10 ? '9-10' : '11-12+';

            const { grid: finalGrid, placedEquations: finalEqs } = runMathCrosswordMotor(ageGroup, tipoNumero, allowedOps, cantidadOperaciones);
            applyBlankCells(finalGrid, dificultad);

            // Mapear ecuaciones a placedWords para compatibilidad con la vista
            const formattedWords = finalEqs.map((eq, idx) => ({
                id: eq.id,
                w: eq.tokens.join(''),
                d: eq.tokens.join(' '), // Representación textual para el log
                r: eq.r,
                c: eq.c,
                h: eq.h
            }));

            setGrid(finalGrid);
            setPlacedWords(formattedWords);
            setCrucigramaListo(true);
            setLoading(false);

            if (user) {
                db.logActivity(user.id, 'GENERATE_CRUCIMATE', { grado, dificultad, tipoNumero });
            }
        }, 600);
    };

    // Generación inicial al cargar
    useEffect(() => {
        generarTablero();
    }, []);

    const fondoInputRef = useRef(null);

    const handleFondoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setFondo(event.target.result);
            reader.readAsDataURL(file);
        }
    };

    const cleanLaTeXForPDF = (val) => {
        return val.replace(/\\frac\{(\d+)\}\{(\d+)\}/g, '$1/$2');
    };

    // Exportación a PDF de alta fidelidad (Dos páginas)
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
            const gridS = grid.length;
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
            const availableH = 144; 
            const cellS = Math.min(8.5, availableH / activeRows, 180 / activeCols);
            
            const gridW = activeCols * cellS;
            const gridH = activeRows * cellS;
            const offsetX = (210 - gridW) / 2;
            const offsetY = 46 + (availableH - gridH) / 2;

            if (fondo) {
                try {
                    doc.saveGraphicsState();
                    doc.setGState(new doc.GState({ opacity: fondoCasillasBlanco ? 1.0 : 0.18 }));
                    const topY = 42.5;
                    const bottomY = 195;
                    doc.addImage(fondo, 'JPEG', 15, topY, 180, bottomY - topY, undefined, 'FAST');
                } catch (e) { 
                    console.error("Fondo PDF:", e); 
                } finally {
                    doc.restoreGraphicsState();
                }
            }

            // Encabezado
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

            // Grilla Vectorial
            doc.setLineWidth(0.2);
            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const x = offsetX + ((c - minC) * cellS);
                    const y = offsetY + ((r - minR) * cellS);
                    const cell = grid[r][c];

                    if (cell) {
                        doc.setDrawColor(0);
                        if (cell.isOp) {
                            if (cell.char === '+') doc.setFillColor(209, 250, 229);
                            else if (cell.char === '-') doc.setFillColor(254, 243, 199);
                            else if (cell.char === 'x') doc.setFillColor(224, 231, 255);
                            else if (cell.char === ':') doc.setFillColor(243, 232, 255);
                            else doc.setFillColor(241, 245, 249);

                            doc.rect(x, y, cellS, cellS, 'FD');
                            doc.setFont("helvetica", "bold");
                            doc.setFontSize(cellS > 7 ? 12 : 9);
                            doc.setTextColor(0);
                            
                            if (!esDocente && cell.isBlank && cell.char !== '=') {
                                // Dejar vacío
                            } else {
                                doc.text(cell.char, x + (cellS/2), y + (cellS*0.7), { align: 'center' });
                            }
                        } else {
                            if (esDocente) {
                                if (cell.isBlank) {
                                    doc.setFillColor(179, 229, 252);
                                    doc.rect(x, y, cellS, cellS, 'FD');
                                } else {
                                    doc.setFillColor(255, 255, 255);
                                    doc.rect(x, y, cellS, cellS, 'FD');
                                }
                                doc.setFont("helvetica", "bold");
                                doc.setFontSize(cellS > 7 ? 11 : 9);
                                doc.setTextColor(0);
                                doc.text(cleanLaTeXForPDF(cell.char), x + (cellS/2), y + (cellS*0.7), { align: 'center' });
                            } else {
                                doc.setFillColor(255, 255, 255);
                                doc.rect(x, y, cellS, cellS, 'FD');
                                if (!cell.isBlank) {
                                    doc.setFont("helvetica", "normal");
                                    doc.setFontSize(cellS > 7 ? 11 : 9);
                                    doc.setTextColor(45, 52, 54);
                                    doc.text(cleanLaTeXForPDF(cell.char), x + (cellS/2), y + (cellS*0.7), { align: 'center' });
                                }
                            }
                        }
                    }
                }
            }

            // Instrucciones abajo
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.rect(15, 192, 180, 24, 'S');
            doc.text("INSTRUCCIONES:", 18, 197);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text("1. Completa las celdas vacías para que las operaciones horizontales y verticales sean válidas.", 18, 202);
            doc.text("2. En los casilleros de comparación, dibuja el signo correspondiente (>, < o =).", 18, 207);
            doc.text("3. Puedes usar el espacio de abajo para realizar tus cálculos.", 18, 212);

            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text("Crucimate", 15, 10);
            doc.text("Crucimate", 195, 10, { align: 'right' });
            doc.text("Generado con Mente Activa: Aprender en casa es más divertido", 105, 292, { align: 'center' });
        };

        try {
            await dibujarPagina(false); // Reto
            doc.addPage();
            await dibujarPagina(true);  // Solucionario
            doc.save(`${titulo.replace(/\s+/g, '_')}_Crucimate.pdf`);
            if (btn) btn.innerText = "✅ PDF DESCARGADO";
            setTimeout(() => { if (btn) btn.innerText = "DESCARGAR PDF"; }, 3000);
            
            if (user.plan === 'prueba') {
                const newCount = await db.incrementDownloadCount(user.id);
                updateUser({ downloadsCount: newCount });
            }
            db.logActivity(user.id, 'DOWNLOAD_CRUCIMATE_PDF', { title: titulo });
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

    // Componentes de la Hoja Central A4
    const RenderGrid = ({ grid, isDocente, modo, fondo }) => {
        if (!grid) return <div className="relative w-full h-[540px] flex items-center justify-center flex-shrink-0"></div>;
        
        const gridS = grid.length;
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
            <div className="relative w-full h-[540px] flex items-center justify-center flex-shrink-0 overflow-hidden bg-slate-50/10">
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
                                            const cell = grid[r][c];

                                            if (!cell) {
                                                return (
                                                    <td 
                                                        key={c}
                                                        style={{ width: `${dynamicCellS}px`, height: `${dynamicCellS}px` }}
                                                        className="border border-transparent bg-transparent"
                                                    />
                                                );
                                            }

                                            const showChar = isDocente || !cell.isBlank;
                                            const isSolutionHighlight = isDocente && cell.isBlank;

                                            return (
                                                <td 
                                                    key={c}
                                                    style={{ width: `${dynamicCellS}px`, height: `${dynamicCellS}px` }}
                                                    className={`text-center relative font-bold p-0 box-border border-[1.5px] border-black
                                                         ${cell.isOp ? (cell.char === '+' ? 'bg-emerald-100/80 text-emerald-800' : cell.char === '-' ? 'bg-amber-100/80 text-amber-800' : cell.char === 'x' ? 'bg-indigo-100/80 text-indigo-800' : cell.char === ':' ? 'bg-purple-100/80 text-purple-800' : 'bg-slate-100 text-slate-700') : (isSolutionHighlight ? 'bg-[#b3e5fc]' : (fondoCasillasBlanco ? 'bg-white' : 'bg-transparent'))}`}
                                                >
                                                    <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: `${dynamicCellS * 0.55}px` }}>
                                                        {showChar ? (
                                                            <span className="relative z-[5] text-black leading-none pt-[2px]">
                                                                <MathCellRender text={cell.char} />
                                                            </span>
                                                        ) : null}
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

                    <RenderGrid grid={grid} isDocente={esDocente} modo="crucigrama" fondo={fondo} />

                    <div className="w-full flex flex-col mt-4">
                        <div className="border-2 border-black p-4 rounded-xl text-left font-bold mb-2 text-[11px] leading-relaxed text-black">
                            <h4 className="text-xs font-black uppercase text-black mb-1">Instrucciones para el Niño(a):</h4>
                            <p className="font-normal text-slate-700">
                                1. Completa las casillas vacías de forma que las sumas, restas, multiplicaciones y divisiones se cumplan correctamente.<br/>
                                2. Escribe el signo correspondiente en los espacios de comparación (&gt;, &lt; o =).<br/>
                                3. Puedes usar el espacio de abajo para realizar tus cálculos.
                            </p>
                        </div>
                    </div>

                    {/* Espacio visual para cálculos del alumno */}
                    <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl my-4 flex items-center justify-center text-slate-400 text-xs italic pointer-events-none">
                        Espacio para realizar tus operaciones y cálculos
                    </div>

                    <div className="text-center text-[10px] text-slate-400 mt-auto pb-4 italic">
                        Generado con Mente Activa: Aprender en casa es más divertido
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
                                </p>
                            </div>
                        </>
                    )}

                    {trialStatus === 'ready' && (
                        <>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-emerald-400">¡Tu sesión está lista!</h2>
                            <p className="text-slate-400 text-lg">¿Estás listo para empezar?</p>
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
                            <p className="text-slate-400 text-lg">¡Esperamos que te haya gustado Crucimate! 🚀</p>
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
                        <div className="h-[180px] px-6 border-b border-slate-800 flex justify-center items-center bg-[#1e293b]/50 backdrop-blur-md relative">
                            <div onClick={() => navigate('/')} className="cursor-pointer transition-transform active:scale-95 flex justify-center items-center h-full w-full" title="Ir a Inicio">
                                <MenteActivaLogo 
                                    smallHeight="140px"
                                    align="center" 
                                    className="w-auto transition-all" 
                                />
                            </div>
                        </div>

                        <div className="px-6 pt-3 pb-5 border-b border-slate-800 bg-[#1e293b] space-y-3">
                            <div className="flex justify-end items-center px-1">
                                <button onClick={handlePanelRedirect} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-blue-400 transition-colors uppercase tracking-wider">
                                    <Settings size={14} /> Panel
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <a 
                                    href="https://gemini.google.com/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                                >
                                    <Sparkles size={12} /> Gemini
                                </a>
                                <a 
                                    href="https://chatgpt.com/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                                >
                                    <MessageSquare size={12} /> ChatGPT
                                </a>
                                <button 
                                    onClick={() => navigate('/tutorial')}
                                    className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-red-600 to-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-red-500/20"
                                >
                                    <Play size={12} fill="white" /> Tutorial
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto premium-scrollbar p-6 space-y-6">
                        {/* Edad del Niño */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">1. Edad del niño(a)</label>
                            <input 
                                id="SEL_CRUCIMATE_AGE"
                                value={grado} 
                                onChange={(e) => setGrado(e.target.value)} 
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50" 
                                placeholder="Ej: 8 años" 
                            />
                        </div>

                        {/* Dificultad */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">2. Dificultad</label>
                            <select 
                                id="SEL_CRUCIMATE_DIFF"
                                value={dificultad}
                                onChange={(e) => setDificultad(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50 font-bold"
                            >
                                <option value="facil">Fácil (Menos celdas vacías)</option>
                                <option value="medio">Medio</option>
                                <option value="dificil">Difícil (Más celdas vacías)</option>
                            </select>
                        </div>

                        {/* Cantidad de Operaciones */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">2.5 Cantidad de Operaciones</label>
                            <select 
                                id="SEL_CRUCIMATE_OP_COUNT"
                                value={cantidadOperaciones}
                                onChange={(e) => setCantidadOperaciones(parseInt(e.target.value))}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50 font-bold"
                            >
                                <option value={6}>Pequeño (6 operaciones)</option>
                                <option value={10}>Medio (10 operaciones)</option>
                                <option value={14}>Grande (14 operaciones)</option>
                                <option value={18}>Gigante (18 operaciones)</option>
                            </select>
                        </div>

                        {/* Tipo de Números */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">3. Conjunto Numérico</label>
                            <select 
                                id="SEL_CRUCIMATE_NUM_TYPE"
                                value={tipoNumero}
                                disabled={parseInt(grado.replace(/\D/g, '')) <= 6}
                                onChange={(e) => setTipoNumero(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50 font-bold disabled:opacity-50"
                            >
                                <option value="naturales">Números Naturales (Positivos)</option>
                                <option value="enteros">Números Enteros (Con Negativos)</option>
                                <option value="racionales">Números Racionales (Fracciones)</option>
                            </select>
                        </div>

                        {/* Operaciones */}
                        <div className="space-y-2.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">4. Operaciones Habilitadas</label>
                            <div className="grid grid-cols-1 gap-2 pl-1">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                    <input 
                                        id="CHK_CRUCIMATE_OP_ADD"
                                        type="checkbox" 
                                        checked={allowedOps.add}
                                        onChange={(e) => setAllowedOps(prev => ({ ...prev, add: e.target.checked }))}
                                        className="rounded border-slate-700 bg-[#0f172a] text-blue-500 focus:ring-blue-500"
                                    />
                                    Suma (+)
                                </label>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                    <input 
                                        id="CHK_CRUCIMATE_OP_SUB"
                                        type="checkbox" 
                                        checked={allowedOps.sub}
                                        onChange={(e) => setAllowedOps(prev => ({ ...prev, sub: e.target.checked }))}
                                        className="rounded border-slate-700 bg-[#0f172a] text-blue-500 focus:ring-blue-500"
                                    />
                                    Resta (-)
                                </label>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 disabled:opacity-50">
                                    <input 
                                        id="CHK_CRUCIMATE_OP_MUL"
                                        type="checkbox" 
                                        checked={allowedOps.mul}
                                        disabled={parseInt(grado.replace(/\D/g, '')) <= 6}
                                        onChange={(e) => setAllowedOps(prev => ({ ...prev, mul: e.target.checked }))}
                                        className="rounded border-slate-700 bg-[#0f172a] text-blue-500 focus:ring-blue-500"
                                    />
                                    Multiplicación (x)
                                </label>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 disabled:opacity-50">
                                    <input 
                                        id="CHK_CRUCIMATE_OP_DIV"
                                        type="checkbox" 
                                        checked={allowedOps.div}
                                        disabled={parseInt(grado.replace(/\D/g, '')) <= 8}
                                        onChange={(e) => setAllowedOps(prev => ({ ...prev, div: e.target.checked }))}
                                        className="rounded border-slate-700 bg-[#0f172a] text-blue-500 focus:ring-blue-500"
                                    />
                                    División (:)
                                </label>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 disabled:opacity-50">
                                    <input 
                                        id="CHK_CRUCIMATE_OP_COMP"
                                        type="checkbox" 
                                        checked={allowedOps.comp}
                                        disabled={parseInt(grado.replace(/\D/g, '')) > 6}
                                        onChange={(e) => setAllowedOps(prev => ({ ...prev, comp: e.target.checked }))}
                                        className="rounded border-slate-700 bg-[#0f172a] text-blue-500 focus:ring-blue-500"
                                    />
                                    Comparaciones (&gt;, &lt;, =)
                                </label>
                            </div>
                            <p className="text-[9px] leading-relaxed text-slate-400 mt-3 italic px-1">
                                ℹ️ Las operaciones permitidas se auto-ajustan según la edad del niño para asegurar que el reto sea adecuado para su aprendizaje.
                            </p>
                        </div>

                        {/* Título */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">5. Título de la Hoja</label>
                            <input 
                                id="INP_CRUCIMATE_TITLE"
                                value={titulo} 
                                onChange={(e) => setTitulo(e.target.value)} 
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50" 
                                placeholder="Crucimate de Aritmética" 
                            />
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-800/50 flex justify-end items-center px-1 pb-10">
                            <button onClick={handleLogout} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-wider">
                                <LogOut size={16} /> Salir
                            </button>
                        </div>
                    </div>
                </aside>

                {/* LIENZO/HOJA DE TRABAJO (CENTRO) */}
                <main className="flex-1 bg-[#0f172a] p-12 overflow-y-auto premium-scrollbar flex flex-col items-center gap-6 print:p-0 print:m-0 print:bg-white print:overflow-visible">
                    {loading && (
                        <div className="fixed inset-0 bg-[#001f5b]/90 z-50 flex flex-col items-center justify-center gap-4 text-center">
                            <div className="w-12 h-12 border-[5px] border-white/30 border-t-[#00adc1] rounded-full animate-spin"></div>
                            <h2 className="text-xl font-black text-white">{loaderText}</h2>
                            <p className="text-sm text-white/70">Calculando conexiones del tablero...</p>
                        </div>
                    )}

                    <div className="flex gap-2 mb-2 bg-[#1e293b] p-1.5 rounded-2xl shadow-xl border border-slate-800 shrink-0 print:hidden">
                        <button 
                            id="BTN_CRUCIMATE_TOGGLE_SOL"
                            onClick={() => setVistaActual('solucion')}
                            className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all duration-300 ${vistaActual === 'solucion' ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            📄 Hoja de Respuestas (Solución)
                        </button>
                        <button 
                            id="BTN_CRUCIMATE_TOGGLE_RETO"
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
                        {/* TARJETA IDENTIFICADORA DE LA HERRAMIENTA */}
                        <div className="relative overflow-hidden bg-[#0f172a] border border-slate-700/50 rounded-[2rem] p-6 shadow-xl flex flex-col items-center text-center mx-2">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500 opacity-[0.05] rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5 shadow-inner" style={{ backgroundColor: '#e11d4815' }}>
                                    <img src={crucimateIcon} alt="Crucimate" className="w-20 h-20 object-contain drop-shadow-lg" />
                                </div>
                                <h3 className="text-2xl uppercase font-black text-white leading-tight tracking-tight">
                                    CRUCIMATE
                                </h3>
                            </div>
                        </div>

                        {/* ACCIONES FINALES */}
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Acciones Finales</h3>
                            <div className="space-y-3">
                                <button 
                                    id="BTN_CRUCIMATE_GENERATE"
                                    onClick={generarTablero} 
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                >
                                    <FileText size={14} /> Generar Crucimate
                                </button>
                                <button 
                                    id="BTN_CRUCIMATE_PRINT_NATIVE"
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

                        {/* PERSONALIZACIÓN */}
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Personalización</h3>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Imagen de Fondo</label>
                                <button onClick={() => fondoInputRef.current.click()} className="w-full py-3 border border-dashed border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:border-blue-500/50 hover:bg-slate-800/50 flex items-center justify-center gap-2 transition-all">
                                    <ImageIcon size={14} /> {fondo ? "✅ Imagen Cargada" : "📁 Seleccionar Imagen"}
                                </button>
                                <input type="file" ref={fondoInputRef} onChange={handleFondoChange} className="hidden" accept="image/*" />
                                
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
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default EduCrucimateView;
