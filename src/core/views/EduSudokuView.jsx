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
import sudokuIcon from '../../assets/ICONO SUDOKU.PNG';
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

const EduSudokuView = () => {
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
    const [titulo, setTitulo] = useState('DESAFÍO NUMÉRICO');
    const [grado, setGrado] = useState('9 AÑOS');
    const [size, setSize] = useState(9); // 4, 6, 9
    const [difficulty, setDifficulty] = useState('medio'); // facil, medio, dificil
    const [fondo, setFondo] = useState(null);
    const [fondoCasillasBlanco, setFondoCasillasBlanco] = useState(false);
    const [coloresActivos, setColoresActivos] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loaderText, setLoaderText] = useState('');
    
    // Estados del motor
    const [grids, setGrids] = useState(null);
    const [solutionGrids, setSolutionGrids] = useState(null);
    const [modo, setModo] = useState('sudoku');
    const [crucigramaListo, setCrucigramaListo] = useState(false);
    const [vistaActual, setVistaActual] = useState('reto');

    // Referencias para el fondo
    const fondoInputRef = useRef(null);

    // --- MOTOR DE SUDOKU ---
    
    const runSudokuMotor = (boardSize, diff) => {
        const gridData = Array(boardSize).fill().map(() => Array(boardSize).fill(0));
        let boxR, boxC;
        if (boardSize === 4) { boxR = 2; boxC = 2; }
        else if (boardSize === 6) { boxR = 2; boxC = 3; }
        else { boxR = 3; boxC = 3; }

        const isValid = (gridData, r, c, num) => {
            for (let i = 0; i < boardSize; i++) {
                if (gridData[r][i] === num) return false;
                if (gridData[i][c] === num) return false;
            }
            let startRow = Math.floor(r / boxR) * boxR;
            let startCol = Math.floor(c / boxC) * boxC;
            for (let i = 0; i < boxR; i++) {
                for (let j = 0; j < boxC; j++) {
                    if (gridData[startRow + i][startCol + j] === num) return false;
                }
            }
            return true;
        };

        const solve = (gridData) => {
            for (let r = 0; r < boardSize; r++) {
                for (let c = 0; c < boardSize; c++) {
                    if (gridData[r][c] === 0) {
                        const nums = Array.from({length: boardSize}, (_, i) => i + 1).sort(() => Math.random() - 0.5);
                        for (let num of nums) {
                            if (isValid(gridData, r, c, num)) {
                                gridData[r][c] = num;
                                if (solve(gridData)) return true;
                                gridData[r][c] = 0;
                            }
                        }
                        return false;
                    }
                }
            }
            return true;
        };

        // Generar grilla completa
        solve(gridData);
        const solvedGrid = JSON.parse(JSON.stringify(gridData));

        // Determinar agujeros
        let holesToDig = 0;
        if (boardSize === 4) holesToDig = diff === 'facil' ? 4 : diff === 'medio' ? 6 : 8;
        if (boardSize === 6) holesToDig = diff === 'facil' ? 12 : diff === 'medio' ? 16 : 20;
        if (boardSize === 9) holesToDig = diff === 'facil' ? 30 : diff === 'medio' ? 45 : 55;

        let puzzleGrid = JSON.parse(JSON.stringify(solvedGrid));
        let cells = [];
        for (let r=0; r<boardSize; r++) for(let c=0; c<boardSize; c++) cells.push({r, c});
        cells.sort(() => Math.random() - 0.5);

        for (let i = 0; i < holesToDig && i < cells.length; i++) {
            puzzleGrid[cells[i].r][cells[i].c] = null;
        }
        
        return { grid: puzzleGrid, solution: solvedGrid };
    };

    const generarSudoku = () => {
        setLoading(true);
        setLoaderText("Diseñando Sudokus...");
        setTimeout(() => {
            const numBoards = size === 4 ? 4 : size === 6 ? 2 : 1;
            const newGrids = [];
            const newSolutions = [];
            for (let i = 0; i < numBoards; i++) {
                const res = runSudokuMotor(size, difficulty);
                newGrids.push(res.grid);
                newSolutions.push(res.solution);
            }
            setGrids(newGrids);
            setSolutionGrids(newSolutions);
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
        if (!crucigramaListo || !grids || grids.length === 0) return;
        
        const currentUser = globalVars.META_USERS?.find(u => u.id === user.id) || user;
        if (currentUser?.plan === 'prueba' && currentUser?.downloadsCount >= 2) {
            alert("Has alcanzado el límite de 2 descargas gratuitas en tu sesión de prueba.");
            return;
        }

        const doc = new jsPDF('p', 'mm', 'a4');
        const btn = document.getElementById('BTN_DOWNLOAD_PDF');
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
            doc.text(titulo || "SUDOKU DIVERTIDO", 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(`NOMBRE: __________________________________________________`, 15, 35);
            doc.text(`EDAD: ${grado || "__________"}`, 140, 35);

            doc.setDrawColor(0);
            doc.setLineWidth(0.8);
            doc.line(15, 42, 195, 42);

            // LAYOUT MULTIPLE
            let cols = 1, rows = 1;
            let totalW = 180;
            let totalH = 170;
            
            if (size === 4) { cols = 2; rows = 2; }
            else if (size === 6) { cols = 2; rows = 1; totalH = 85; } // Más corto verticalmente para centrar

            const cellS = Math.min(
                16,
                (totalW / cols) / size * 0.85, // 0.85 para dar margen interno
                (totalH / rows) / size * 0.85
            );

            const gridW = size * cellS;
            const gridH = size * cellS;
            
            // Distribuir el espacio sobrante
            const remainingW = 210 - (cols * gridW);
            const startX = remainingW / (cols + 1);
            const paddingX = startX;

            const remainingH = (totalH === 85 ? 120 : totalH) - (rows * gridH); // 120 es el espacio disponible en Y
            const startY = 70 + (remainingH / (rows + 1));
            const paddingY = remainingH / (rows + 1);

            let boxR, boxC;
            if (size === 4) { boxR = 2; boxC = 2; }
            else if (size === 6) { boxR = 2; boxC = 3; }
            else { boxR = 3; boxC = 3; }

            grids.forEach((currentGrid, idx) => {
                const cIdx = idx % cols;
                const rIdx = Math.floor(idx / cols);
                
                const offsetX = startX + (cIdx * (gridW + paddingX));
                const offsetY = startY + (rIdx * (gridH + paddingY));

                // Borde exterior grueso
                doc.setDrawColor(0);
                doc.setLineWidth(1.5);
                doc.rect(offsetX, offsetY, gridW, gridH, 'S');

                // GRILLA VECTORIAL
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        const x = offsetX + (c * cellS);
                        const y = offsetY + (r * cellS);
                        const isGiven = currentGrid[r][c] !== null;
                        const val = esDocente ? solutionGrids[idx][r][c] : currentGrid[r][c];

                        // Dibujar celda
                        doc.setDrawColor(0);
                        doc.setLineWidth(0.2);
                        doc.rect(x, y, cellS, cellS, 'S');

                        // Bordes gruesos internos
                        doc.setLineWidth(1.0);
                        if ((c + 1) % boxC === 0 && c !== size - 1) doc.line(x + cellS, y, x + cellS, y + cellS);
                        if ((r + 1) % boxR === 0 && r !== size - 1) doc.line(x, y + cellS, x + cellS, y + cellS);

                        // Texto
                        if (val !== null) {
                            doc.setFont("helvetica", isGiven ? "bold" : "normal");
                            doc.setFontSize(cellS * 0.6);
                            doc.setTextColor(isGiven ? 0 : 50);
                            doc.text(val.toString(), x + (cellS/2), y + (cellS*0.75), { align: 'center' });
                        }
                    }
                }
            });

            // Texto inferior
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`REGLA DEL JUEGO: Rellena las casillas vacías con números del 1 al ${size}`, 105, startY + (rows * gridH) + (paddingY * (rows-1)) + 18, { align: 'center' });
            doc.text("sin que se repitan en ninguna fila, columna o bloque resaltado.", 105, startY + (rows * gridH) + (paddingY * (rows-1)) + 23, { align: 'center' });

            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.setFont("helvetica", "normal");
            doc.text("Mente Activa", 15, 10);
            doc.text("Sudoku", 195, 10, { align: 'right' });
            doc.text("Generado con Mente Activa: Aprender en casa es más divertido", 105, 292, { align: 'center' });
        };

        try {
            await dibujarPagina(true);
            doc.addPage();
            await dibujarPagina(false);
            doc.save(`${titulo.replace(/\s+/g, '_')}_Sudoku.pdf`);
            if (btn) btn.innerText = "✅ PDF DESCARGADO";
            setTimeout(() => { if (btn) btn.innerText = "DESCARGAR PDF"; }, 3000);
            
            if (user.plan === 'prueba') {
                const newCount = await db.incrementDownloadCount(user.id);
                updateUser({ downloadsCount: newCount });
            }
            
            db.logActivity(user.id, 'DOWNLOAD_PDF', { title: titulo, mode: 'sudoku', size, difficulty });
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

    const RenderGrid = ({ grid, solutionGrid, isDocente, size, fondo, containerSize = 540, coloresActivos }) => {
        if (!grid || !solutionGrid || grid.length !== size || solutionGrid.length !== size) return <div className="relative w-full flex items-center justify-center flex-shrink-0" style={{ height: `${containerSize}px` }}></div>;
        
        const activeRows = size;
        const activeCols = size;
        const dynamicCellS = Math.min(55, Math.floor(containerSize / size)); 
        
        let boxR, boxC;
        if (size === 4) { boxR = 2; boxC = 2; }
        else if (size === 6) { boxR = 2; boxC = 3; }
        else { boxR = 3; boxC = 3; }

        return (
            <div className="relative flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ width: '100%', height: `${containerSize}px` }}>
                {fondo && (
                    <div 
                        className={`absolute inset-0 bg-center bg-no-repeat bg-contain opacity-[0.18] pointer-events-none`}
                        style={{ backgroundImage: `url(${fondo})` }}
                    />
                )}
                <div className="relative z-10 bg-white shadow-sm border-[4px] border-black p-0" style={{lineHeight: 0}}>
                    <table className="border-collapse border-spacing-0 bg-transparent border-none m-0 p-0">
                        <tbody>
                            {Array.from({ length: activeRows }).map((_, r) => {
                                return (
                                    <tr key={r} className="p-0 m-0">
                                        {Array.from({ length: activeCols }).map((_, c) => {
                                            const isGiven = grid[r][c] !== null;
                                            const val = isDocente ? solutionGrid[r][c] : grid[r][c];
                                            
                                            const borderRight = (c + 1) % boxC === 0 && c !== activeCols - 1 ? 'border-r-[4px] border-r-black' : 'border-r-[1px] border-r-slate-400';
                                            const borderBottom = (r + 1) % boxR === 0 && r !== activeRows - 1 ? 'border-b-[4px] border-b-black' : 'border-b-[1px] border-b-slate-400';
                                            
                                            
                                            const colorMap = {
                                                1: 'bg-red-200',
                                                2: 'bg-orange-200',
                                                3: 'bg-yellow-200',
                                                4: 'bg-lime-300',
                                                5: 'bg-emerald-300',
                                                6: 'bg-sky-200',
                                                7: 'bg-indigo-300',
                                                8: 'bg-purple-300',
                                                9: 'bg-pink-300'
                                            };
                                            
                                            const bgColorClass = (coloresActivos && val !== null) ? colorMap[val] : 'bg-transparent';
                                            
                                            return (
                                                <td 
                                                    key={c}
                                                    style={{ width: `${dynamicCellS}px`, height: `${dynamicCellS}px` }}
                                                    className={`text-center relative p-0 m-0 box-border print:exact-colors ${borderRight} ${borderBottom} ${bgColorClass}`}
                                                >
                                                    <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: `${dynamicCellS * 0.6}px` }}>
                                                        {val !== null && (
                                                            <span className={`relative z-[5] leading-none pt-[3px] ${isGiven ? 'text-black font-black' : 'text-blue-600 font-bold'}`}>
                                                                {val}
                                                            </span>
                                                        )}
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
                            {titulo || "DESAFÍO NUMÉRICO"}
                        </h1>
                        <div className="flex justify-between items-center font-bold mt-6 text-[14px] uppercase text-black">
                            <div>NOMBRE: __________________________________________________</div>
                            <div>EDAD: {grado || "__________"}</div>
                        </div>
                        <div className="border-b-[3px] border-black my-3"></div>
                    </header>

                    <div className={`flex-1 w-full grid ${size === 4 ? 'grid-cols-2 grid-rows-2 gap-8' : size === 6 ? 'grid-cols-2 grid-rows-1 gap-12' : 'grid-cols-1'} justify-center items-center py-6 px-4`}>
                        {grids?.map((g, idx) => (
                            <div key={idx} className="flex justify-center items-center w-full">
                                <RenderGrid 
                                    grid={g} 
                                    solutionGrid={solutionGrids[idx]} 
                                    isDocente={esDocente} 
                                    size={size} 
                                    fondo={fondo} 
                                    containerSize={size === 4 ? 260 : size === 6 ? 320 : 540} 
                                    coloresActivos={coloresActivos}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="w-full flex flex-col mt-auto pb-4">
                        <div className="text-center text-[10px] text-slate-500 font-bold uppercase mb-4 tracking-widest bg-slate-100 py-3 px-4 rounded-xl border border-slate-200">
                            REGLA DEL JUEGO: Rellena las casillas vacías con números del 1 al {size} sin que se repitan en ninguna fila, columna o bloque resaltado.
                        </div>
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
        <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
            {showWelcomeMessage && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
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
                <div className="bg-purple-600 text-white px-6 py-2 flex items-center justify-between shadow-lg relative z-[100] animate-slide-down">
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
            
            <div className="flex flex-1 overflow-hidden">
            {/* PANEL DE CONTROL (IZQUIERDA) */}
            <aside className="w-[350px] bg-[#1e293b] border-r border-slate-800 flex flex-col z-20 shadow-2xl overflow-hidden">
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
                        {/* BOTÓN TUTORIAL */}
                        <div className="grid grid-cols-1 animate-fade-in">
                            <button 
                                onClick={() => navigate('/tutorial')}
                                className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-red-600 to-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-red-500/20 group relative overflow-hidden"
                            >
                                <Play size={14} fill="white" className="relative z-10" /> <span className="relative z-10">Ver Video Tutorial</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* CUERPO DEL PANEL CON SCROLL INDEPENDIENTE */}
                <div className="flex-1 overflow-y-auto premium-scrollbar p-6 space-y-6">

                    <div className="space-y-3">
                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">1. Identificación del Material</label>
                        <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">Título</label>
                            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50" placeholder="Ej: SUDOKU DIVERTIDO" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">Edad del niño(a)</label>
                            <input value={grado} onChange={(e) => setGrado(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50" placeholder="Ej: 9 años" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">2. Tamaño de Cuadrícula</label>
                        <div className="grid grid-cols-3 gap-2 bg-[#0f172a] p-1 rounded-xl border border-slate-700">
                            <button 
                                type="button"
                                onClick={() => setSize(4)}
                                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all ${size === 4 ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                4x4
                            </button>
                            <button 
                                type="button"
                                onClick={() => setSize(6)}
                                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all ${size === 6 ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                6x6
                            </button>
                            <button 
                                type="button"
                                onClick={() => setSize(9)}
                                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all ${size === 9 ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                9x9
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">3. Nivel de Dificultad</label>
                        <div className="grid grid-cols-3 gap-2 bg-[#0f172a] p-1 rounded-xl border border-slate-700">
                            <button 
                                type="button"
                                onClick={() => setDifficulty('facil')}
                                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all ${difficulty === 'facil' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Fácil
                            </button>
                            <button 
                                type="button"
                                onClick={() => setDifficulty('medio')}
                                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all ${difficulty === 'medio' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Medio
                            </button>
                            <button 
                                type="button"
                                onClick={() => setDifficulty('dificil')}
                                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all ${difficulty === 'dificil' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Difícil
                            </button>
                        </div>
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
            <main className="flex-1 bg-[#0f172a] p-12 overflow-y-auto premium-scrollbar flex flex-col items-center gap-6">
                {loading && (
                    <div className="fixed inset-0 bg-[#001f5b]/90 z-50 flex flex-col items-center justify-center gap-4 text-center">
                        <div className="w-12 h-12 border-[5px] border-white/30 border-t-[#00adc1] rounded-full animate-spin"></div>
                        <h2 className="text-xl font-black text-white">{loaderText}</h2>
                        <p className="text-sm text-white/70">Diseñando tu material de alta calidad</p>
                    </div>
                )}

                <div className="flex gap-2 mb-2 bg-[#1e293b] p-1.5 rounded-2xl shadow-xl border border-slate-800 shrink-0">
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
                                    <img src={sudokuIcon} alt="Sudoku" className="w-20 h-20 object-contain drop-shadow-lg" />
                                </div>
                                <h3 className="text-2xl uppercase font-black text-white leading-tight tracking-tight">
                                    SUDOKU
                                </h3>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Acciones Finales</h3>
                            <div className="space-y-3">
                                <button onClick={() => generarSudoku()} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Type size={14} /> Generar Sudoku</button>
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
                                
                                <label className="flex items-center gap-2 pt-3 cursor-pointer group w-max">
                                    <div className="relative flex items-center justify-center w-4 h-4">
                                        <input 
                                            type="checkbox" 
                                            checked={coloresActivos}
                                            onChange={(e) => setColoresActivos(e.target.checked)}
                                            className="peer appearance-none w-4 h-4 border-2 border-slate-600 rounded-sm checked:bg-blue-500 checked:border-blue-500 transition-all cursor-pointer"
                                        />
                                        <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-300 transition-colors uppercase tracking-wider">
                                        COLOREAR NÚMEROS (CELDAS)
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

export default EduSudokuView;
