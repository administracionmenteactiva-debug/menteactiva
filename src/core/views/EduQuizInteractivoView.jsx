import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../context/AuthContext.jsx';
import { ChevronLeft, Sparkles, MessageSquare, Play, Trash2, Settings, LogOut, Clock, Star, Trophy, ArrowRight, Check, X, ShieldAlert, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/databaseService';
import { supabase } from '../lib/supabase';
import examIcon from '../../assets/icono_examen.png';
import MenteActivaLogo from '../components/common/MenteActivaLogo.jsx';
import astronautaImg from '../../assets/astronauta1.png';
import focoImg from '../../assets/foco1.png';
import incaImg from '../../assets/inca1.png';

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

// Parser robusto de preguntas con 5 opciones de respuesta
const parseQuestions = (text) => {
    if (!text) return [];
    
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
        } else {
            // Extracción de respaldo en caso de que falte la etiqueta de cierre [finrespuesta]
            const fallbackMatch = blockText.match(/\[respuesta\]\s*([A-Ea-e])/i);
            if (fallbackMatch) {
                answerText = fallbackMatch[1].trim();
            }
        }
        
        // 3. Obtener el texto de la pregunta (removiendo bloques de opciones y respuestas)
        let cleanedQuestion = blockText;
        cleanedQuestion = cleanedQuestion.replace(/\[opciones\][\s\S]*?\[finopciones\]/gi, '');
        cleanedQuestion = cleanedQuestion.replace(/\[respuesta\][\s\S]*?\[finrespuesta\]/gi, '');
        
        // Escudo de Robustez contra respuestas inline u omisión de etiquetas de cierre:
        // Cortamos el texto de la pregunta en la primera ocurrencia de la etiqueta [respuesta] o palabra respuesta:
        if (cleanedQuestion.toLowerCase().includes('[respuesta]')) {
            cleanedQuestion = cleanedQuestion.split(/\[respuesta\]/i)[0];
        }
        if (cleanedQuestion.toLowerCase().includes('respuesta:')) {
            cleanedQuestion = cleanedQuestion.split(/respuesta:/i)[0];
        }
        
        // Remover cualquier etiqueta huérfana sobrante que pueda haber quedado
        cleanedQuestion = cleanedQuestion.replace(/\[\/?(pregunta|opciones|respuesta|finpregunta|finopciones|finrespuesta)\]/gi, '');
        questionText = cleanedQuestion.trim();
        
        if (questionText) {
            parsed.push({
                question: questionText,
                options: options.slice(0, 5), // Forzar máximo 5 opciones
                answer: answerText
            });
        }
    });
    
    return parsed;
};

// Calcular tamaño en bytes para control de límites de almacenamiento
const calculateSize = (text) => {
    if (!text) return 0;
    return new Blob([text]).size;
};

const EduQuizInteractivoView = () => {
    const { user, logout, updateUser, globalVars, getPeruDate } = useAuth();
    const navigate = useNavigate();

    // Estados de la Sesión de Prueba
    const [trialStatus, setTrialStatus] = useState('loading'); 
    const [timeLeft, setTimeLeft] = useState(86400); 
    const [trialStarted, setTrialStarted] = useState(false);
    const [showWelcomeMessage, setShowWelcomeMessage] = useState(user?.plan === 'prueba' && !sessionStorage.getItem('edu_trial_welcomed'));

    // Estados de la herramienta (Piezas Curriculares, Banco Base y Configuración)
    const [edad, setEdad] = useState('');
    const [grado, setGrado] = useState('');
    const [area, setArea] = useState('');
    const [rawQuestions, setRawQuestions] = useState('');
    const [dificultad, setDificultad] = useState('MEDIO');
    const [activeSlot, setActiveSlot] = useState(1); // 1, 2, 3
    const [inputData, setInputData] = useState('');
    const [questions, setQuestions] = useState([]);
    const [selectedCount, setSelectedCount] = useState(10);
    const [activeQuestions, setActiveQuestions] = useState([]);
    const [noBalotario, setNoBalotario] = useState(false);
    const [numPreguntasGenerar, setNumPreguntasGenerar] = useState(10);
    
    // Slots de Almacenamiento (Bancos)
    const [slots, setSlots] = useState({
        1: { age: '', grade: '', area: '', rawQuestions: '', content: '', selectedCount: 10, updatedAt: null, timerEnabled: true, timerValue: 30, dificultad: 'MEDIO', noBalotario: false, numPreguntasGenerar: 10 },
        2: { age: '', grade: '', area: '', rawQuestions: '', content: '', selectedCount: 10, updatedAt: null, timerEnabled: true, timerValue: 30, dificultad: 'MEDIO', noBalotario: false, numPreguntasGenerar: 10 }
    });

    const [promptCopied, setPromptCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loaderText, setLoaderText] = useState('');

    // Configuración adicional del padre
    const [timerEnabled, setTimerEnabled] = useState(true);
    const [timerValue, setTimerValue] = useState(30);

    // Estados de Gamificación
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [questionTimeLeft, setQuestionTimeLeft] = useState(20);
    const [powerups, setPowerups] = useState({ fiftyFifty: 1, doubleChance: 1 });
    const [disabledOptions, setDisabledOptions] = useState([]);
    const [usedDoubleChance, setUsedDoubleChance] = useState(false);
    const [shaked, setShaked] = useState(false);
    const [starsEffect, setStarsEffect] = useState([]);

    // Estados del Flujo de Juego
    const [gameState, setGameState] = useState('setup'); // 'setup', 'playing', 'ended'
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null); // A, B, C, D, E o index
    const [answered, setAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);

    // Lógica para determinar el personaje lateral de Aventura de forma inteligente
    const isHistoricalArea = React.useMemo(() => {
        const areaText = (area || '').toUpperCase();
        const questionText = (activeQuestions[currentQuestionIdx]?.question || '').toUpperCase();
        return areaText.includes('HISTORIA') || 
               areaText.includes('SOCIALES') || 
               areaText.includes('PERÚ') || 
               areaText.includes('PERU') || 
               areaText.includes('GEOGRAFÍA') || 
               areaText.includes('GEOGRAFIA') || 
               questionText.includes('TIAHUANACO') || 
               questionText.includes('INCA') || 
               questionText.includes('PERÚ') || 
               questionText.includes('PERU') || 
               questionText.includes('HISTORIA');
    }, [area, activeQuestions, currentQuestionIdx]);

    const creatorInfo = React.useMemo(() => {
        const creator = globalVars.META_USERS?.find(u => u.username === user?.createdBy || u.email === user?.createdBy || u.id === user?.createdBy);
        return {
            name: creator?.fullName || 'Soporte',
            phone: creator?.whatsappVentas || '993125547'
        };
    }, [globalVars.META_USERS, user?.createdBy]);

    // Reloj y ciclo de validación de prueba
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

    // Cargar Slots del Usuario desde la clave de Quiz Interactivo
    useEffect(() => {
        if (!user) return;
        
        const loadSlots = async () => {
            try {
                let loadedSlots = null;
                if (user.plan === 'prueba') {
                    const localData = localStorage.getItem(`menteactiva_quiz_interactivo_slots_${user.id}`);
                    if (localData) {
                        loadedSlots = JSON.parse(localData);
                    }
                } else {
                    if (supabase) {
                        const { data, error } = await supabase
                            .from('system_settings')
                            .select('value')
                            .eq('key', `quiz_interactivo_slots_${user.id}`)
                            .maybeSingle();
                        
                        if (data && data.value && data.value.slots) {
                            loadedSlots = data.value.slots;
                        }
                    }
                }

                // Configuración por defecto para inicializar bancos
                const defaultBank = { age: '', grade: '', area: '', rawQuestions: '', content: '', selectedCount: 10, updatedAt: null, timerEnabled: true, timerValue: 30, dificultad: 'MEDIO', noBalotario: false, numPreguntasGenerar: 10 };
                const limitDate = new Date();
                limitDate.setDate(limitDate.getDate() - 14);
                let hasChanges = false;
                
                const updatedSlots = {};
                
                // Si hay datos cargados, validar expiración de 14 días para cada banco
                [1, 2].forEach(num => {
                    const bank = (loadedSlots && loadedSlots[num]) ? { ...loadedSlots[num] } : { ...defaultBank };
                    if (bank.updatedAt) {
                        const updatedAt = new Date(bank.updatedAt);
                        if (updatedAt < limitDate) {
                            // Expirado: Limpiar preguntas y contenido, manteniendo la config pedagógica
                            bank.rawQuestions = '';
                            bank.content = '';
                            bank.updatedAt = null;
                            hasChanges = true;
                        }
                    }
                    updatedSlots[num] = bank;
                });

                // Si hubo cambios por expiración, guardar el estado limpio silenciosamente
                if (hasChanges) {
                    if (user.plan === 'prueba') {
                        localStorage.setItem(`menteactiva_quiz_interactivo_slots_${user.id}`, JSON.stringify(updatedSlots));
                    } else if (supabase) {
                        await supabase
                            .from('system_settings')
                            .upsert({
                                key: `quiz_interactivo_slots_${user.id}`,
                                value: { slots: updatedSlots },
                                updated_at: new Date().toISOString()
                            });
                    }
                }

                setSlots(updatedSlots);
                const active = updatedSlots[1] || { ...defaultBank };
                setEdad(active.age || '');
                setGrado(active.grade || '');
                setArea(active.area || '');
                setRawQuestions(active.rawQuestions || '');
                setDificultad(active.dificultad || 'MEDIO');
                setNoBalotario(active.noBalotario || false);
                setNumPreguntasGenerar(active.numPreguntasGenerar || 10);
                setInputData(active.content || '');
                setSelectedCount(active.selectedCount || 10);
                setTimerEnabled(active.timerEnabled !== undefined ? active.timerEnabled : true);
                setTimerValue(active.timerValue || 30);
                setQuestions(parseQuestions(active.content || ''));
            } catch (err) {
                console.error("Error al cargar slots del Quiz:", err);
            }
        };
        
        loadSlots();
    }, [user]);

    // Parseo reactivo del input retornado
    useEffect(() => {
        const parsed = parseQuestions(inputData);
        setQuestions(parsed);
        if (parsed.length > 0) {
            setSelectedCount(prev => Math.min(prev, parsed.length));
        }
    }, [inputData]);

    // Sincronizar el slot activo al escribir edad, grado, area, rawQuestions, inputData, selectedCount, timerEnabled, timerValue, dificultad, noBalotario o numPreguntasGenerar
    useEffect(() => {
        setSlots(prev => ({
            ...prev,
            [activeSlot]: {
                age: edad,
                grade: grado,
                area: area,
                rawQuestions: rawQuestions,
                content: inputData,
                selectedCount: selectedCount,
                updatedAt: slots[activeSlot]?.updatedAt || null,
                timerEnabled: timerEnabled,
                timerValue: timerValue,
                dificultad: dificultad,
                noBalotario: noBalotario,
                numPreguntasGenerar: numPreguntasGenerar
            }
        }));
    }, [edad, grado, area, rawQuestions, inputData, selectedCount, timerEnabled, timerValue, dificultad, noBalotario, numPreguntasGenerar, activeSlot]);

    const handleSelectSlot = (slotNum) => {
        setActiveSlot(slotNum);
        const targetSlot = slots[slotNum] || { age: '', grade: '', area: '', rawQuestions: '', content: '', selectedCount: 10, updatedAt: null, timerEnabled: true, timerValue: 30, dificultad: 'MEDIO', noBalotario: false, numPreguntasGenerar: 10 };
        setEdad(targetSlot.age || '');
        setGrado(targetSlot.grade || '');
        setArea(targetSlot.area || '');
        setRawQuestions(targetSlot.rawQuestions || '');
        setDificultad(targetSlot.dificultad || 'MEDIO');
        setNoBalotario(targetSlot.noBalotario || false);
        setNumPreguntasGenerar(targetSlot.numPreguntasGenerar || 10);
        setInputData(targetSlot.content || '');
        setSelectedCount(targetSlot.selectedCount || 10);
        setTimerEnabled(targetSlot.timerEnabled !== undefined ? targetSlot.timerEnabled : true);
        setTimerValue(targetSlot.timerValue || 30);
        setQuestions(parseQuestions(targetSlot.content || ''));
    };

    // --- EFECTOS DE GAMIFICACIÓN ---

    // Efecto para controlar el temporizador por pregunta
    useEffect(() => {
        if (gameState !== 'playing' || !timerEnabled || answered) return;

        const interval = setInterval(() => {
            setQuestionTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Tiempo agotado: incorrecto, racha a 0
                    setAnswered(true);
                    setSelectedOption('EXPIRED');
                    setStreak(0);
                    setShaked(true);
                    setTimeout(() => setShaked(false), 500);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState, timerEnabled, answered, currentQuestionIdx]);

    // Reiniciar estados temporales en cada cambio de pregunta
    useEffect(() => {
        if (gameState === 'playing') {
            setQuestionTimeLeft(timerValue);
            setDisabledOptions([]);
            setUsedDoubleChance(false);
            setShaked(false);
            setStarsEffect([]);
        }
    }, [currentQuestionIdx, gameState, timerValue]);

    // Usar el comodín 50/50
    const usarCincuentaCincuenta = () => {
        if (answered || powerups.fiftyFifty === 0) return;
        
        const currentQuestion = activeQuestions[currentQuestionIdx];
        const rawAnswer = currentQuestion.answer.trim().toUpperCase();
        
        // Encontrar las letras de todas las opciones incorrectas
        const incorrectLetters = currentQuestion.options.map(opt => {
            return opt.trim().charAt(0).toUpperCase();
        }).filter(letter => {
            const isCorrect = rawAnswer === letter || rawAnswer.startsWith(letter);
            return !isCorrect;
        });
        
        // Elegir 2 opciones incorrectas al azar para deshabilitar
        const toDisable = [];
        while (toDisable.length < 2 && incorrectLetters.length > 0) {
            const randIdx = Math.floor(Math.random() * incorrectLetters.length);
            const letter = incorrectLetters.splice(randIdx, 1)[0];
            toDisable.push(letter);
        }
        
        setDisabledOptions(prev => [...prev, ...toDisable]);
        setPowerups(prev => ({ ...prev, fiftyFifty: 0 }));
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
                `¡Gracias por probar MenteActiva! 🚀\n\n` +
                `🔥 OFERTA DE LANZAMIENTO - ACCESO POR UN AÑO 🔥\n` +
                `✅ Duración: 1 AÑO\n` +
                `✅ Desafíos Interactivos: ILIMITADOS\n` +
                `✅ Costo: 🔥 S/15 PAGO ÚNICO 🔥\n\n` +
                `Comuníquese a WhatsApp: ${creatorInfo.phone}\n\n` +
                `¿Desea cerrar sesión ahora?`
            );
            if (!confirmLogout) return;
        }
        logout();
        navigate('/login');
    };

    // Ensamblador de Instrucciones (Molde) que incluye la lista de preguntas base del padre
    const copiarPrompt = () => {
        const edadVal = edad || "9 años";
        const gradoVal = grado || "4to grado";
        const areaVal = area || "Matemáticas";
        const rawPreguntasVal = rawQuestions || "No se especificó un tema.";
        const dificultadVal = dificultad || "MEDIO";
        
        const promptText = noBalotario
        ? `Actúa como un creador de cuestionarios y diseñador de contenido pedagógico infantil.
Tu tarea es generar un cuestionario estructurado de preguntas de opción múltiple desde cero basándote en el tema académico proporcionado.

obligatorio: Bajo ninguna circunstancia generes un quiz interactivo. Responde con los parámetros del prompt, lee todo hasta el final.

A continuación se detallan los datos pedagógicos:
- Edad del niño: ${edadVal}
- Grado escolar: ${gradoVal}
- Área de estudio: ${areaVal}
- Nivel de dificultad para las opciones y distractores: ${dificultadVal}
- Tema de estudio sobre el cual crear las preguntas: ${rawPreguntasVal}
- Cantidad exacta de preguntas que debes generar: Genera exactamente ${numPreguntasGenerar} preguntas. No más, no menos.

Debes redactar y estructurar cada pregunta del material según las siguientes reglas de formato:

Estructura para preguntas de opción múltiple (SIEMPRE debes generar EXACTAMENTE 5 opciones de respuesta para cada una, etiquetadas de la A a la E):
[pregunta]
¿Cuál es la pregunta o reto?
[opciones]
A) Primera opción
B) Segunda opción
C) Tercera opción
D) Cuarta opción
E) Quinta opción
[finopciones]
[respuesta]
Letra de la respuesta correcta (ej. C)
[finrespuesta]
[finpregunta]

REGLAS DE OBLIGATORIEDAD CRÍTICA DE ETIQUETAS Y FORMATO:
1. CADA pregunta DEBE estar contenida exactamente entre [pregunta] y [finpregunta].
2. Las opciones DEBEN estar contenidas exactamente entre [opciones] y [finopciones] y ser exactamente 5 (A, B, C, D, E).
3. La respuesta de la pregunta DEBE estar contenida exactamente entre [respuesta] y [finrespuesta] y debe ser solo la letra correspondiente (A, B, C, D o E).
4. ESTÁ PROHIBIDO omitir cualquiera de estas etiquetas de apertura y cierre. Cierra cada etiqueta de forma exacta. NUNCA escribas la etiqueta [respuesta] o la letra de la respuesta correcta dentro del enunciado de la pregunta. La respuesta debe ir siempre al final de toda la estructura de la pregunta, después de [finopciones].
5. No agregues números de lista antes de las etiquetas.
6. Mantén el texto limpio y fácil de leer.
7. Las preguntas deben estar perfectamente adecuadas al nivel cognitivo de un niño de ${edadVal} (${gradoVal}) en el área de ${areaVal}.
8. REGLA DE DIFICULTAD PARA DISTRACTORES: El nivel de dificultad seleccionado es "${dificultadVal}". Debes actuar bajo las siguientes normas para construir las 4 opciones incorrectas (distractores) de cada pregunta:
   - Si el nivel es FÁCIL: Las opciones incorrectas deben ser extremadamente obvias de descartar, de alto contraste conceptual y sin trampas ni confusiones.
   - Si el nivel es MEDIO: Las opciones incorrectas deben ser distractores plausibles acordes a la edad del niño, con errores conceptuales típicos pero claros.
   - Si el nivel es DIFÍCIL: Las opciones incorrectas deben ser de alta complejidad, muy parecidas en redacción o concepto a la respuesta correcta para exigir un análisis discriminatorio fino.

NORMAS DE SEGURIDAD PEDAGÓGICA Y FORMATO (RM 501):
- Este material debe alinear al cumplimiento de la Resolución Ministerial N.° 501-2025-MINEDU.
- REGLA CRÍTICA DE CANTIDAD ININTERRUMPIDA: Debes generar obligatoriamente la cantidad exacta de ${numPreguntasGenerar} preguntas que se te ha solicitado en el encabezado. Está terminantemente prohibido detener la salida de texto, recortar el cuestionario o resumir las preguntas. Debes formular preguntas variadas que cubran el tema a profundidad hasta alcanzar exactamente las ${numPreguntasGenerar} preguntas completas con sus 5 alternativas y respuesta respectiva.
- PUREZA DE FORMATO (STRICT TEXT-ONLY): RESPONDE ÚNICAMENTE CON EL TEXTO SOLICITADO Y LAS ETIQUETAS DE APERTURA Y CIERRE. TU RESPUESTA DEBE COMENZAR DIRECTAMENTE CON LA ETIQUETA [pregunta] Y TERMINAR CON [finpregunta]. ESTÁ ESTRICTAMENTE PROHIBIDO INCLUIR INTRODUCCIONES, COMENTARIOS ADICIONALES, SALUDOS, DESPEDIDAS O EXPLICACIONES PEDAGÓGICAS. EL FORMATO DEBE SER 100% LIMPIO DE TEXTO AUXILIAR.
- PROHIBICIÓN DE GENERACIÓN DE APLICACIONES/INTERACTIVOS: ESTÁ ESTRICTAMENTE PROHIBIDO GENERAR CÓDIGO DE PROGRAMACIÓN (COMO REACT, HTML/JS, PYTHON), APLICACIONES INTERACTIVAS, COMPONENTES DINÁMICOS O INICIAR MÓDULOS DE EJECUCIÓN. TU RESPUESTA DEBE SER EXCLUSIVAMENTE TEXTO PLANO QUE CONTIENE LAS PREGUNTAS Y ALTERNATIVAS ETIQUETADAS SEGÚN EL FORMATO SOLICITADO. NO CREES NINGÚN SISTEMA DE JUEGO INTERACTIVO EN EL CHAT.`
        : `Actúa como un creador de cuestionarios y diseñador de contenido pedagógico infantil.
Tu tarea es tomar una lista de preguntas de estudio y transformarlas en un cuestionario estructurado de preguntas de opción múltiple. Si la lista que te dan ya contiene la respuesta solamente debes agregar opciones incorrectas de acuerdo al nivel de dificultad indicado.

obligatorio: Bajo ninguna circunstancia generes un quiz interactivo. Responde con los parámetros del prompt, lee todo hasta el final.

A continuación se detallan los datos pedagógicos:
- Edad del niño: ${edadVal}
- Grado escolar: ${gradoVal}
- Área de estudio: ${areaVal}
- Nivel de dificultad para las opciones incorrectas: ${dificultadVal}

Esta es la lista de preguntas base proporcionada por el padre de familia que debes transcribir y adaptar:
---
${rawPreguntasVal}
---

Debes transcribir y adaptar cada pregunta del material según las siguientes reglas de formato:

Estructura para preguntas de opción múltiple (SIEMPRE debes generar EXACTAMENTE 5 opciones de respuesta para cada una, etiquetadas de la A a la E):
[pregunta]
¿Cuál es la pregunta o reto?
[opciones]
A) Primera opción
B) Segunda opción
C) Tercera opción
D) Cuarta opción
E) Quinta opción
[finopciones]
[respuesta]
Letra de la respuesta correcta (ej. C)
[finrespuesta]
[finpregunta]

REGLAS DE OBLIGATORIEDAD CRÍTICA DE ETIQUETAS Y FORMATO:
1. CADA pregunta DEBE estar contenida exactamente entre [pregunta] y [finpregunta].
2. Las opciones DEBEN estar contenidas exactamente entre [opciones] y [finopciones] y ser exactamente 5 (A, B, C, D, E).
3. La respuesta de la pregunta DEBE estar contenida exactamente entre [respuesta] y [finrespuesta] y debe ser solo la letra correspondiente (A, B, C, D o E).
4. ESTÁ PROHIBIDO omitir cualquiera de estas etiquetas de apertura y cierre. Cierra cada etiqueta de forma exacta. NUNCA escribas la etiqueta [respuesta] o la letra de la respuesta correcta dentro del enunciado de la pregunta. La respuesta debe ir siempre al final de toda la estructura de la pregunta, después de [finopciones].
5. No agregues números de lista antes de las etiquetas.
6. Mantén el texto limpio y fácil de leer.
7. Transcribe exactamente el contenido del material escolar, pero adáptalo a este formato.
8. REGLA DE RESPUESTA FIJA: Si la lista de preguntas base proporcionada por el usuario incluye la respuesta correcta para una pregunta (por ejemplo, con prefijos 'R:', 'Respuesta:' o similar), debes utilizar de manera obligatoria esa respuesta exacta como una de las 5 opciones de la A a la E, y definir su letra correspondiente en el bloque [respuesta]. Bajo ninguna circunstancia debes modificar, contradecir o ignorar la respuesta provista por el usuario. Las otras 4 alternativas restantes deben ser distractores incorrectos pero plausibles redactados por ti.
9. REGLA DE DIFICULTAD PARA DISTRACTORES: El nivel de dificultad seleccionado es "${dificultadVal}". Debes actuar bajo las siguientes normas para construir las 4 opciones incorrectas (distractores) de cada pregunta:
   - Si el nivel es FÁCIL: Las opciones incorrectas deben ser extremadamente obvias de descartar, de alto contraste conceptual y sin trampas ni confusiones.
   - Si el nivel es MEDIO: Las opciones incorrectas deben ser distractores plausibles acordes a la edad del niño, con errores conceptuales típicos pero claros.
   - Si el nivel es DIFÍCIL: Las opciones incorrectas deben ser de alta complejidad, muy parecidas en redacción o concepto a la respuesta correcta para exigir un análisis discriminatorio fino.
   - REGLA SUPREMA: NUNCA cambies, resumas o alteres la redacción de la pregunta original ni de su respuesta correcta. Ambas deben transcribirse de forma 100% literal tal como las ingresó el usuario.

NORMAS DE SEGURIDAD PEDAGÓGICA Y FORMATO (RM 501):
- Este material debe alinear al cumplimiento de la Resolución Ministerial N.° 501-2025-MINEDU.
- ESCUDO ANTI-ALUCINACIÓN: Trabaja únicamente sobre las preguntas y el tema provisto en el texto base. No inventes nuevas preguntas ni agregues temas que no estén en el texto base. Sin embargo, para las opciones de respuesta incorrectas (distractores), tienes plena libertad y la obligación de formular alternativas plausibles aunque no se mencionen explícitamente en el texto original, asegurándote de que sean factualmente incorrectas.
- PUREZA DE FORMATO (STRICT TEXT-ONLY): RESPONDE ÚNICAMENTE CON EL TEXTO SOLICITADO Y LAS ETIQUETAS DE APERTURA Y CIERRE. TU RESPUESTA DEBE COMENZAR DIRECTAMENTE CON LA ETIQUETA [pregunta] Y TERMINAR CON [finpregunta]. ESTÁ ESTRICTAMENTE PROHIBIDO INCLUIR INTRODUCCIONES, COMENTARIOS ADICIONALES, SALUDOS, DESPEDIDAS O EXPLICACIONES PEDAGÓGICAS. EL FORMATO DEBE SER 100% LIMPIO DE TEXTO AUXILIAR.
- PROHIBICIÓN DE GENERACIÓN DE APLICACIONES/INTERACTIVOS: ESTÁ ESTRICTAMENTE PROHIBIDO GENERAR CÓDIGO DE PROGRAMACIÓN (COMO REACT, HTML/JS, PYTHON), APLICACIONES INTERACTIVAS, COMPONENTES DINÁMICOS O INICIAR MÓDULOS DE EJECUCIÓN. TU RESPUESTA DEBE SER EXCLUSIVAMENTE TEXTO PLANO QUE CONTIENE LAS PREGUNTAS Y ALTERNATIVAS ETIQUETADAS SEGÚN EL FORMATO SOLICITADO. NO CREES NINGÚN SISTEMA DE JUEGO INTERACTIVO EN EL CHAT.`;

        navigator.clipboard.writeText(promptText).then(() => {
            setPromptCopied(true);
            setTimeout(() => setPromptCopied(false), 2000);
        }).catch(err => {
            console.error("Error al copiar prompt:", err);
            alert("No se pudo copiar automáticamente. Por favor copia el prompt manualmente.");
        });
    };

    // Limpiar Banco seleccionado (rawQuestions, content, questions y persistir)
    const limpiarBanco = async () => {
        const confirmClear = window.confirm(`¿Seguro que deseas limpiar todas las preguntas del Banco ${activeSlot}? Se borrarán las preguntas base y el cuestionario estructurado.`);
        if (!confirmClear) return;
        
        setRawQuestions('');
        setInputData('');
        setQuestions([]);
        
        const clearedSlot = {
            ...slots[activeSlot],
            rawQuestions: '',
            content: '',
            updatedAt: null
        };
        const updatedSlots = {
            ...slots,
            [activeSlot]: clearedSlot
        };
        setSlots(updatedSlots);
        
        try {
            if (user.plan === 'prueba') {
                localStorage.setItem(`menteactiva_quiz_interactivo_slots_${user.id}`, JSON.stringify(updatedSlots));
            } else if (supabase) {
                const { error } = await supabase
                    .from('system_settings')
                    .upsert({
                        key: `quiz_interactivo_slots_${user.id}`,
                        value: { slots: updatedSlots },
                        updated_at: new Date().toISOString()
                    });
                if (error) throw error;
            }
            alert(`✅ Banco ${activeSlot} limpiado con éxito.`);
        } catch (err) {
            console.error("Error al limpiar el banco:", err);
            alert("❌ Error al persistir la limpieza: " + err.message);
        }
    };

    // Guardado Silencioso de todas las piezas del slot
    const saveCurrentSlot = async () => {
        if (!user) return;
        
        const bytes = calculateSize(inputData) + calculateSize(rawQuestions);
        if (bytes > 35840) { // Límite de 35 KB
            alert(`❌ El contenido de este slot supera el límite de 35 KB (${(bytes/1024).toFixed(1)} KB). Por favor reduce el número de preguntas antes de guardar.`);
            return;
        }
        
        setIsSaving(true);
        try {
            const sanitizedTimerValue = Math.max(5, Math.min(300, parseInt(timerValue, 10) || 30));
            setTimerValue(sanitizedTimerValue);
            
            const targetSlots = {
                ...slots,
                [activeSlot]: {
                    age: edad,
                    grade: grado,
                    area: area,
                    rawQuestions: rawQuestions,
                    content: inputData,
                    selectedCount: selectedCount,
                    updatedAt: new Date().toISOString(),
                    timerEnabled: timerEnabled,
                    timerValue: sanitizedTimerValue,
                    dificultad: dificultad,
                    noBalotario: noBalotario,
                    numPreguntasGenerar: numPreguntasGenerar
                }
            };
            
            if (user.plan === 'prueba') {
                localStorage.setItem(`menteactiva_quiz_interactivo_slots_${user.id}`, JSON.stringify(targetSlots));
                alert(`✅ Balotario del Banco ${activeSlot} guardado localmente.`);
            } else {
                if (supabase) {
                    const { error } = await supabase
                        .from('system_settings')
                        .upsert({
                            key: `quiz_interactivo_slots_${user.id}`,
                            value: { slots: targetSlots },
                            updated_at: new Date().toISOString()
                        });
                        
                    if (error) throw error;
                    alert(`✅ Balotario del Banco ${activeSlot} guardado en la nube (Supabase).`);
                } else {
                    throw new Error("Supabase no está disponible (modo offline)");
                }
            }
            setSlots(targetSlots);
            setQuestions(parseQuestions(inputData));
        } catch (err) {
            console.error("Error al guardar:", err);
            alert("❌ Error al guardar el banco: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Inicializar el juego del niño con barajado aleatorio y estados de racha/comodines
    const iniciarDesafio = () => {
        if (questions.length === 0) {
            alert("No hay preguntas estructuradas cargadas. Pegue la respuesta de la herramienta externa.");
            return;
        }
        setLoading(true);
        setLoaderText("Ensamblando el Quiz Interactivo...");
        
        setTimeout(() => {
            // Barajado aleatorio de preguntas
            const shuffled = [...questions].sort(() => Math.random() - 0.5);
            // Recorte de cantidad seleccionada
            const selected = shuffled.slice(0, Math.min(selectedCount, questions.length));
            
            setActiveQuestions(selected);
            setCurrentQuestionIdx(0);
            setSelectedOption(null);
            setAnswered(false);
            setScore(0);
            setCorrectCount(0);
            
            // Inicializar estados de gamificación
            setStreak(0);
            setMaxStreak(0);
            setPowerups({ fiftyFifty: 1, doubleChance: 1 });
            setDisabledOptions([]);
            setUsedDoubleChance(false);
            setShaked(false);
            setStarsEffect([]);
            const finalTimerValue = Math.max(5, Math.min(300, parseInt(timerValue, 10) || 30));
            setTimerValue(finalTimerValue);
            setQuestionTimeLeft(finalTimerValue);
            
            setGameState('playing');
            setLoading(false);
            db.logActivity(user.id, 'INICIA_QUIZ_INTERACTIVO', { title: area, totalQuestions: selected.length });
        }, 1000);
    };

    // Validar respuesta del niño con bonus y comodines
    const handleOptionSelect = (optionLetter) => {
        if (answered) return;
        
        const currentQuestion = activeQuestions[currentQuestionIdx];
        const rawAnswer = currentQuestion.answer.trim().toUpperCase();
        const isCorrect = rawAnswer === optionLetter || rawAnswer.startsWith(optionLetter);
        
        if (isCorrect) {
            // Racha
            const newStreak = streak + 1;
            setStreak(newStreak);
            setMaxStreak(prev => Math.max(prev, newStreak));
            
            // Puntos
            const basePoints = 100;
            const streakBonus = (newStreak - 1) * 25;
            const speedBonus = timerEnabled ? (questionTimeLeft * 5) : 0;
            const totalPoints = basePoints + streakBonus + speedBonus;
            
            setScore(prev => prev + totalPoints);
            setCorrectCount(prev => prev + 1);
            setAnswered(true);
            setSelectedOption(optionLetter);

            // Estrellitas flotantes
            const newStars = Array.from({ length: 10 }).map((_, i) => ({
                id: i,
                left: Math.random() * 80 + 10,
                top: Math.random() * 60 + 20,
                delay: Math.random() * 0.4
            }));
            setStarsEffect(newStars);
            setTimeout(() => setStarsEffect([]), 2000);
        } else {
            // Respuesta incorrecta
            if (powerups.doubleChance === 1 && !usedDoubleChance) {
                alert("❌ ¡Respuesta incorrecta! Pero tienes activa la 'Segunda Oportunidad' 🛡️. ¡Elige otra vez!");
                setPowerups(prev => ({ ...prev, doubleChance: 0 }));
                setUsedDoubleChance(true);
                setDisabledOptions(prev => [...prev, optionLetter]);
            } else {
                // Fallo definitivo
                setStreak(0);
                setAnswered(true);
                setSelectedOption(optionLetter);
                setShaked(true);
                setTimeout(() => setShaked(false), 500);
            }
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIdx + 1 < activeQuestions.length) {
            setCurrentQuestionIdx(prev => prev + 1);
            setSelectedOption(null);
            setAnswered(false);
        } else {
            setGameState('ended');
            db.logActivity(user.id, 'TERMINA_QUIZ_INTERACTIVO', { title: area, score: score, correctas: correctCount, total: activeQuestions.length });
        }
    };

    const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const renderStars = () => {
        const ratio = correctCount / activeQuestions.length;
        let starsCount = 0;
        if (ratio >= 0.9) starsCount = 3;
        else if (ratio >= 0.6) starsCount = 2;
        else if (ratio > 0) starsCount = 1;

        return (
            <div className="flex gap-4 justify-center py-4">
                {[1, 2, 3].map(starNum => (
                    <Star 
                        key={starNum} 
                        size={48} 
                        className={starNum <= starsCount ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-110 transition-all duration-500' : 'text-slate-600'} 
                    />
                ))}
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
                            <p className="text-slate-400 text-sm">Verificando disponibilidad de la cuenta. Un momento por favor...</p>
                        </div>
                    )}
                    {trialStatus === 'waiting' && (
                        <>
                            <h2 className="text-3xl font-black uppercase tracking-tight">Tu sesión de prueba está agendada</h2>
                            <p className="text-slate-400 text-lg">Para: <span className="text-blue-400 font-bold">{new Date(currentUser.scheduledTime).toLocaleString()}</span></p>
                            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                <p className="text-sm leading-relaxed">
                                    ¡Prepárate! En tu sesión de 24 horas podrás interactuar con tus hijos mediante desafíos interactivos en vivo.
                                    Disfruta de la experiencia completa en tablet, laptop o PC.
                                </p>
                            </div>
                            <div className="aspect-video bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-700">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Tutorial: Cómo usar Crea Quiz en 2 min</span>
                            </div>
                        </>
                    )}

                    {trialStatus === 'ready' && (
                        <>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-emerald-400">¡Tu sesión está lista!</h2>
                            <p className="text-slate-400 text-lg">¿Estás listo para empezar?</p>
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
                                    <p className="text-sm font-bold text-slate-200">✅ DESAFÍOS INTERACTIVOS: ILIMITADOS</p>
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

    // Confeti de celebración
    const confettis = React.useMemo(() => {
        if (gameState !== 'ended') return [];
        return Array.from({ length: 35 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 3,
            duration: Math.random() * 2 + 2,
            color: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 5)]
        }));
    }, [gameState]);

    return (
        <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans select-none">
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-8px); }
                    75% { transform: translateX(8px); }
                }
                .animate-shake {
                    animation: shake 0.3s ease-in-out;
                }
                @keyframes starFloat {
                    0% { transform: translateY(0) scale(0.5); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(-120px) scale(1.3); opacity: 0; }
                }
                .animate-star-float {
                    animation: starFloat 1.2s ease-out forwards;
                }
                @keyframes confettiFall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
                }
                .animate-confetti-fall {
                    animation: confettiFall 4s linear infinite;
                }
                @keyframes floatSlow {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-12px) rotate(2deg); }
                }
                @keyframes floatReverse {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(12px) rotate(-2deg); }
                }
                .animate-float-slow {
                    animation: floatSlow 5s ease-in-out infinite;
                }
                .animate-float-reverse {
                    animation: floatReverse 5s ease-in-out infinite;
                }
                @keyframes pulseGlow {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(249, 115, 22, 0.4)); }
                    50% { transform: scale(1.05); filter: drop-shadow(0 0 15px rgba(249, 115, 22, 0.8)); }
                }
                .animate-pulse-glow {
                    animation: pulseGlow 1.8s infinite ease-in-out;
                }
                @keyframes portalSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .animate-portal-spin {
                    animation: portalSpin 20s linear infinite;
                }
                @keyframes floatSymbol1 {
                    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
                    50% { transform: translateY(-15px) rotate(10deg); opacity: 0.95; }
                }
                @keyframes floatSymbol2 {
                    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.5; }
                    50% { transform: translateY(12px) rotate(-12deg); opacity: 0.85; }
                }
                .animate-symbol-1 {
                    animation: floatSymbol1 4.5s ease-in-out infinite;
                }
                .animate-symbol-2 {
                    animation: floatSymbol2 5.5s ease-in-out infinite;
                }
                .text-neon-cyan {
                    text-shadow: 0 0 5px #22d3ee, 0 0 12px rgba(34, 211, 238, 0.6), 0 0 25px rgba(6, 182, 212, 0.4);
                }
                .text-neon-pink {
                    text-shadow: 0 0 5px #f472b6, 0 0 12px rgba(244, 114, 182, 0.6), 0 0 25px rgba(219, 39, 119, 0.4);
                }
            ` }} />
            
            {/* Banner de prueba si aplica */}
            {user?.plan === 'prueba' && (
                <div className="bg-purple-600 text-white px-6 py-2 flex items-center justify-between shadow-lg relative z-[100] animate-slide-down">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase">Sesión de Prueba</div>
                        <span className="text-xs font-bold opacity-90">Hola, {user.fullName}</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className={`flex items-center gap-3 px-4 py-1 rounded-xl font-black text-lg ${timeLeft < 300 ? 'bg-red-500 animate-pulse' : 'bg-black/20'}`}>
                            <Clock size={18} />
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                </div>
            )}

            {/* Cargador */}
            {loading && (
                <div className="fixed inset-0 bg-[#001f5b]/90 z-50 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-12 h-12 border-[5px] border-white/30 border-t-[#00adc1] rounded-full animate-spin"></div>
                    <h2 className="text-xl font-black text-white">{loaderText}</h2>
                    <p className="text-sm text-white/70">Armando tu entorno interactivo</p>
                </div>
            )}

            {/* FLUJO 1: CONFIGURACIÓN (SETUP) */}
            {gameState === 'setup' && (
                <div className="flex flex-1 overflow-hidden">
                    {/* PANEL DE CONTROL (IZQUIERDA) */}
                    <aside className="w-[350px] bg-[#1e293b] border-r border-slate-800 flex flex-col z-20 shadow-2xl overflow-hidden">
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

                            {/* PANEL SUPERIOR DE NAVEGACIÓN Y CONFIGURACIÓN */}
                            <div className="px-6 pt-3 pb-5 border-b border-slate-800 bg-[#1e293b] space-y-3">
                                <div className="flex justify-end items-center px-1">
                                    <button onClick={handlePanelRedirect} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-blue-400 transition-colors uppercase tracking-wider">
                                        <Settings size={14} /> Panel
                                    </button>
                                </div>
                                {/* Accesos rápidos */}
                                <div className="grid grid-cols-3 gap-2">
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
                                        <Play size={12} fill="white" /> Tutorial
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* CUERPO CONFIGURACIÓN */}
                        <div className="flex-1 overflow-y-auto premium-scrollbar p-6 space-y-6">
                            
                            {/* 1. IDENTIFICACIÓN */}
                            <div className="space-y-3">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">1. Identificación del Material</label>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">Edad del niño(a)</label>
                                    <input 
                                        id="INPUT_QUIZ_AGE" 
                                        value={edad} 
                                        onChange={(e) => setEdad(e.target.value)} 
                                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50" 
                                        placeholder="Ej: 9 años" 
                                    />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[9px] uppercase font-bold text-slate-650 ml-1">Grado escolar</label>
                                      <input 
                                          id="INPUT_QUIZ_GRADE" 
                                          value={grado} 
                                          onChange={(e) => setGrado(e.target.value)} 
                                          className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50" 
                                          placeholder="Ej: 4to grado" 
                                      />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[9px] uppercase font-bold text-slate-650 ml-1">Área curricular</label>
                                      <input 
                                          id="INPUT_QUIZ_AREA" 
                                          value={area} 
                                          onChange={(e) => setArea(e.target.value)} 
                                          className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50" 
                                          placeholder="Ej: Ciencias Sociales" 
                                      />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-bold text-slate-650 ml-1">Nivel de dificultad</label>
                                    <div className="grid grid-cols-3 gap-1 bg-[#0f172a] p-1 rounded-xl border border-slate-700">
                                        {['FÁCIL', 'MEDIO', 'DIFÍCIL'].map((level) => (
                                            <button
                                                key={level}
                                                type="button"
                                                id={`BTN_QUIZ_DIFFICULTY_${level}`}
                                                onClick={() => setDificultad(level)}
                                                className={`py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all select-none ${
                                                    dificultad === level 
                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                                                }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-1 flex items-center gap-2 select-none">
                                    <input 
                                        type="checkbox"
                                        id="INPUT_QUIZ_NO_BALOTARIO"
                                        checked={noBalotario}
                                        onChange={(e) => setNoBalotario(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-700 bg-[#0f172a] text-blue-600 focus:ring-blue-500/50 cursor-pointer"
                                    />
                                    <label 
                                        htmlFor="INPUT_QUIZ_NO_BALOTARIO" 
                                        className="text-[9px] uppercase font-black text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                                    >
                                        No tengo balotario de preguntas
                                    </label>
                                </div>
                            </div>

                            {/* 2. EL ENSAMBLADOR DE INSTRUCCIONES */}
                            <div className="space-y-3">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">2. El Ensamblador de Instrucciones</label>

                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">
                                        {noBalotario ? 'Tema para generar preguntas' : 'Preguntas base del padre'}
                                    </label>
                                    <textarea 
                                        id="INPUT_QUIZ_RAW_QUESTIONS"
                                        value={rawQuestions} 
                                        onChange={(e) => setRawQuestions(e.target.value)} 
                                        className="w-full h-24 bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-blue-500/50 transition-all resize-none premium-scrollbar" 
                                        placeholder={noBalotario ? "Ej: El ciclo del agua, la fotosíntesis, el imperio Inca..." : "Redacte o pegue su lista de preguntas base aquí..."} 
                                    />
                                </div>

                                {noBalotario && (
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">Preguntas a generar (Máx. 40)</label>
                                        <div className="flex items-center gap-2 bg-[#0f172a] border border-slate-700 rounded-xl p-1.5 w-full justify-between">
                                            <button 
                                                type="button"
                                                onClick={() => setNumPreguntasGenerar(prev => Math.max(1, prev - 1))}
                                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center transition-all select-none active:scale-90"
                                            >
                                                -
                                            </button>
                                            <span className="text-xs font-black text-white">{numPreguntasGenerar}</span>
                                            <button 
                                                type="button"
                                                onClick={() => setNumPreguntasGenerar(prev => Math.min(40, prev + 1))}
                                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center transition-all select-none active:scale-90"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    id="BTN_QUIZ_COPY_PROMPT"
                                    type="button"
                                    onClick={copiarPrompt} 
                                    className={`w-full py-3.5 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all duration-300 ${promptCopied ? 'bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'}`}
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
                                        id="INPUT_QUIZ_PASTE"
                                        value={inputData} 
                                        onChange={(e) => setInputData(e.target.value)} 
                                        className="w-full h-32 bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-blue-500/50 transition-all resize-none premium-scrollbar" 
                                        placeholder="Pegue aquí el texto estructurado que le entregó la IA..." 
                                    />
                                </div>

                                <button 
                                    id="BTN_QUIZ_SAVE_SLOT"
                                    type="button"
                                    onClick={saveCurrentSlot}
                                    disabled={isSaving}
                                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold uppercase text-[9px] flex items-center justify-center gap-1.5 transition-all tracking-widest shadow-lg shadow-slate-950/20"
                                >
                                    💾 {isSaving ? 'Guardando...' : 'Guardar Balotario'}
                                </button>
                            </div>
                        </div>

                        {/* BOTÓN SALIR FIJO AL FINAL DEL PANEL */}
                        <div className="flex-shrink-0 p-6 border-t border-slate-800/50 bg-[#1e293b] flex justify-end">
                            <button onClick={handleLogout} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-wider">
                                <LogOut size={16} /> Salir
                            </button>
                        </div>
                    </aside>

                    {/* INTERFAZ CENTRAL: PREVISUALIZACIÓN DE PREGUNTAS (PADRE) */}
                    <main className={`flex-1 bg-[#0f172a] p-12 overflow-y-auto premium-scrollbar flex flex-col items-center gap-6 ${questions.length === 0 ? 'justify-center' : 'justify-start'}`}>
                        <div className="w-full max-w-3xl space-y-6">
                            
                            {/* Caja Guía - Patrón Ámbar (Ayuda/Nota Pedagógica) */}
                            <div className="bg-amber-50 border border-amber-100 border-l-4 border-l-amber-500 text-amber-900 rounded-2xl p-5 shadow-sm space-y-2">
                                <h4 className="font-black text-sm flex items-center gap-2 text-amber-900">
                                    <ShieldAlert className="text-amber-600" size={18} /> Guía de Desafío Interactivo
                                </h4>
                                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                    1. Ingresa a la izquierda el Nivel del niño (Edad, Grado y Área) y escribe/pega tus preguntas base en el cuadro correspondiente. <br />
                                    2. Presiona **Copiar Prompt** y pégalo en la herramienta de generación externa. Este llevará incorporada tu lista de preguntas base. <br />
                                    3. Copia el resultado devuelto por la herramienta externa y pégalo en el cuadro de texto inferior izquierdo. <br />
                                    4. Una vez que las preguntas con opciones se listen abajo, presiona **Iniciar Desafío** a la derecha para jugar con tu hijo.
                                </p>
                            </div>

                            {/* Listado de preguntas cargadas */}
                            {questions.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">BANCO {activeSlot}: PREGUNTAS LISTAS ({questions.length})</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {questions.map((q, idx) => (
                                            <div key={idx} className="bg-[#1e293b] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
                                                <div className="text-xs font-bold text-white flex gap-2">
                                                    <span className="text-blue-400">{idx + 1}.</span>
                                                    <p><MathText text={q.question} /></p>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-4 text-[10px]">
                                                    {q.options.map((opt, oIdx) => {
                                                        const optLetter = opt.trim().charAt(0).toUpperCase();
                                                        const isCorrect = q.answer.trim().toUpperCase() === optLetter || 
                                                                          q.answer.trim().toUpperCase() === opt.trim().toUpperCase() ||
                                                                          (q.answer.length === 1 && opt.toUpperCase().startsWith(q.answer.toUpperCase()));
                                                        return (
                                                            <div 
                                                                key={oIdx} 
                                                                className={`px-3 py-1.5 rounded-lg border ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold' : 'bg-slate-900/40 border-slate-800 text-slate-400'}`}
                                                            >
                                                                <MathText text={opt} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center bg-[#1e293b]/40 border-2 border-dashed border-slate-800 rounded-3xl p-8">
                                    <span className="text-5xl mb-4">🎮</span>
                                    <h3 className="text-base font-black text-slate-350">Ningún desafío activo</h3>
                                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                        Pega la respuesta de la herramienta externa para estructurar las piezas lúdicas del Quiz.
                                    </p>
                                </div>
                            )}
                        </div>
                    </main>

                    {/* PANEL DE ACCIONES (DERECHA) */}
                    <aside className="w-[320px] flex-shrink-0 bg-[#1e293b] border-l border-slate-800 flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.3)] overflow-y-auto">
                        <div className="p-6 pt-10 space-y-8 flex-1 flex flex-col justify-between">
                            <div className="space-y-8">
                                <div className="relative overflow-hidden bg-[#0f172a] border border-slate-700/50 rounded-[2rem] p-6 shadow-xl flex flex-col items-center text-center mx-2">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-[0.05] rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5 shadow-inner" style={{ backgroundColor: '#10b98115' }}>
                                            <img src={examIcon} alt="Crea Quiz" className="w-20 h-20 object-contain drop-shadow-lg" />
                                        </div>
                                        <h3 className="text-2xl uppercase font-black text-white leading-tight tracking-tight">
                                            CREA QUIZ
                                        </h3>
                                        <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mt-1">Lúdico & Interactivo</p>
                                    </div>
                                </div>

                                {/* BANCO DE PREGUNTAS */}
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">Banco de Preguntas</h3>
                                    <div className="grid grid-cols-2 gap-1.5 bg-[#0f172a] p-1 rounded-xl border border-slate-700">
                                        {[1, 2].map(num => (
                                            <button
                                                key={num}
                                                id={`SELECT_QUIZ_SLOT_${num}`}
                                                type="button"
                                                onClick={() => handleSelectSlot(num)}
                                                className={`py-1.5 text-[10px] font-black rounded-lg transition-all ${activeSlot === num ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                Banco {num}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        id="BTN_QUIZ_CLEAR_BANK"
                                        type="button"
                                        onClick={limpiarBanco}
                                        disabled={!rawQuestions && !inputData}
                                        className="w-full mt-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 disabled:border-slate-850/40 text-rose-400 disabled:text-slate-600 disabled:opacity-40 disabled:bg-transparent rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <Trash2 size={11} /> Limpiar Banco {activeSlot}
                                    </button>
                                </div>

                                {/* CONFIGURACIÓN DEL RETO */}
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">Configuración del Reto</h3>
                                    
                                    <div className="bg-[#0f172a]/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className="text-slate-400">Preguntas en el balotario:</span>
                                            <span className="font-black text-white">{questions.length}</span>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-slate-400">Preguntas a incluir</label>
                                            <input 
                                                id="INPUT_QUIZ_SELECTED_COUNT"
                                                type="number"
                                                min="1"
                                                max={questions.length || 1}
                                                value={selectedCount}
                                                onChange={(e) => setSelectedCount(Math.max(1, Math.min(questions.length, parseInt(e.target.value) || 1)))}
                                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50 font-bold"
                                            />
                                        </div>

                                        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 pt-2 border-t border-slate-800/40">
                                            <span>Tiempo Límite:</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    id="INPUT_QUIZ_TIMER_ENABLED"
                                                    type="checkbox" 
                                                    checked={timerEnabled} 
                                                    onChange={(e) => setTimerEnabled(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                                            </label>
                                        </div>

                                        {timerEnabled && (
                                            <div className="space-y-1 pt-1">
                                                <label className="text-[9px] uppercase font-bold text-slate-400">Segundos por pregunta</label>
                                                <input 
                                                    id="INPUT_QUIZ_TIMER_VALUE"
                                                    type="number"
                                                    min="5"
                                                    max="300"
                                                    value={timerValue}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '') {
                                                            setTimerValue('');
                                                        } else {
                                                            const parsed = parseInt(val, 10);
                                                            setTimerValue(isNaN(parsed) ? '' : parsed);
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        const parsed = parseInt(timerValue, 10);
                                                        if (isNaN(parsed) || parsed < 5) {
                                                            setTimerValue(5);
                                                        } else if (parsed > 300) {
                                                            setTimerValue(300);
                                                        } else {
                                                            setTimerValue(parsed);
                                                        }
                                                    }}
                                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50 font-bold"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">Acciones</h3>
                                    
                                    <button 
                                        id="BTN_QUIZ_GENERATE" 
                                        onClick={iniciarDesafio} 
                                        disabled={questions.length === 0}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all shadow-emerald-500/10 cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <Play size={14} fill="currentColor" /> Iniciar Desafío
                                    </button>
                                </div>
                            </div>
                            
                            <div className="text-[9px] text-center text-slate-600 tracking-wider">
                                MenteActiva v4.0 - Standalone <br />
                                Diseñado para el aprendizaje en familia
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            {/* FLUJO 2: MODO JUEGO DEL NIÑO (PLAYING) */}
            {gameState === 'playing' && (
                <div className="flex-1 flex flex-col bg-gradient-to-br from-[#12072b] via-[#0b1026] to-[#040817] overflow-y-auto relative">
                    
                    {/* HUD / Barra Superior de Progreso */}
                    <header className="h-16 px-6 md:px-12 bg-[#101430]/90 backdrop-blur-md border-b border-purple-950/40 flex justify-between items-center shrink-0 z-50">
                        <button 
                            onClick={() => {
                                if (window.confirm("¿Seguro que deseas salir del juego? Se perderá el puntaje acumulado.")) {
                                    setGameState('setup');
                                }
                            }}
                            className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={16} /> Salir
                        </button>
                        
                        <div className="flex-1 max-w-xs mx-6">
                            <div className="flex justify-between items-center text-[10px] uppercase font-black text-slate-450 mb-1">
                                <span>Progreso</span>
                                <span>Pregunta {currentQuestionIdx + 1} de {activeQuestions.length}</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-purple-950/50 shadow-inner">
                                <div 
                                    className="h-full bg-gradient-to-r from-pink-500 via-purple-500 via-blue-500 via-green-500 via-yellow-500 to-orange-500 transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                                    style={{ width: `${((currentQuestionIdx + 1) / activeQuestions.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {streak > 0 && (
                                <div className="bg-gradient-to-r from-orange-500 to-red-650 border border-orange-400/40 px-4 py-2 rounded-2xl flex items-center gap-2 animate-pulse-glow shrink-0 shadow-lg shadow-orange-500/20">
                                    <span className="text-xs">🔥</span>
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Racha x{streak}</span>
                                </div>
                            )}
                            
                            <div className="bg-[#161e2b] border border-yellow-500/40 px-5 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-yellow-500/10 shrink-0">
                                <Trophy size={15} className="text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)] animate-bounce" />
                                <span className="text-xs font-black tracking-widest text-yellow-400">{score} PTS</span>
                            </div>
                        </div>
                    </header>

                    {/* Barra de Tiempo Regresiva */}
                    {timerEnabled && (
                        <div className="w-full h-1.5 bg-slate-900 overflow-hidden relative">
                            <div 
                                className={`h-full transition-all duration-1000 ${questionTimeLeft > 5 ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}
                                style={{ width: `${(questionTimeLeft / timerValue) * 100}%` }}
                            ></div>
                        </div>
                    )}

                    {/* Contenedor del Juego */}
                    <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
                        {/* Panel Izquierdo: ¡AVENTURA! con Portal Mágico, Personaje Inteligente y Cartas Flotantes */}
                        <div className="hidden lg:flex flex-col items-center justify-center w-60 select-none pointer-events-none absolute left-4 xl:left-12 top-20 bottom-10 z-10">
                            
                            {/* 1. Tarjetas del Saber en el Fondo */}
                            <div className="absolute inset-0 overflow-hidden opacity-25">
                                {/* Carta 1: Templo (Historia) */}
                                <div className="absolute top-10 left-4 w-16 h-20 bg-slate-900/60 border border-slate-700/30 rounded-xl flex items-center justify-center transform -rotate-12 translate-y-2 animate-float-slow">
                                    <svg className="w-10 h-10 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M4 21h16M4 18h16M6 6v12M10 6v12M14 6v12M18 6v12M3 6l9-4 9 4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                {/* Carta 2: Átomo (Ciencias) */}
                                <div className="absolute top-6 right-6 w-16 h-20 bg-slate-900/60 border border-slate-700/30 rounded-xl flex items-center justify-center transform rotate-12 -translate-y-2 animate-float-reverse" style={{ animationDelay: '1s' }}>
                                    <svg className="w-10 h-10 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <circle cx="12" cy="12" r="3" />
                                        <ellipse cx="12" cy="12" rx="10" ry="3" transform="rotate(30 12 12)" />
                                        <ellipse cx="12" cy="12" rx="10" ry="3" transform="rotate(-30 12 12)" />
                                    </svg>
                                </div>
                                {/* Carta 3: Globo Terráqueo (Geografía) */}
                                <div className="absolute bottom-24 left-6 w-16 h-20 bg-slate-900/60 border border-slate-700/30 rounded-xl flex items-center justify-center transform rotate-6 translate-x-1 animate-float-slow" style={{ animationDelay: '2s' }}>
                                    <svg className="w-10 h-10 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                    </svg>
                                </div>
                                {/* Carta 4: Pergamino (Literatura) */}
                                <div className="absolute bottom-16 right-4 w-16 h-20 bg-slate-900/60 border border-slate-700/30 rounded-xl flex items-center justify-center transform -rotate-12 -translate-x-1 animate-float-reverse" style={{ animationDelay: '1.5s' }}>
                                    <svg className="w-10 h-10 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>

                            {/* 2. Portal Espacial con órbita */}
                            <div className="absolute w-44 h-72 bg-[#070b1e]/40 rounded-full border-2 border-cyan-500/20 shadow-[0_0_40px_rgba(34,211,238,0.15)] flex items-center justify-center overflow-hidden transform -translate-x-10 scale-90">
                                {/* Fondo de portal */}
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,47,73,0.9),rgba(3,7,18,0.95))]"></div>
                                {/* Remolino de portal */}
                                <svg className="absolute w-full h-full opacity-60 animate-portal-spin" viewBox="0 0 200 200">
                                    <defs>
                                        <radialGradient id="portalGlow" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                                            <stop offset="60%" stopColor="#0891b2" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#030712" stopOpacity="0" />
                                        </radialGradient>
                                    </defs>
                                    <circle cx="100" cy="100" r="90" fill="url(#portalGlow)" />
                                    <path d="M100 10 C150 10, 190 50, 190 100 C190 150, 150 190, 100 190 C50 190, 10 150, 10 100" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="5 15" fill="none" opacity="0.8" />
                                    <path d="M100 30 C138 30, 170 62, 170 100 C170 138, 138 170, 100 170 C62 170, 30 138, 30 100" stroke="#a78bfa" strokeWidth="1" strokeDasharray="3 10" fill="none" opacity="0.6" />
                                </svg>
                            </div>

                            {/* 3. Personaje Dinámico Inteligentemente Renderizado */}
                            <div className="relative w-44 h-64 flex items-center justify-center animate-float-slow z-20">
                                {isHistoricalArea ? (
                                    /* GUERRERO INCA / TIAHUANACO */
                                    <img src={incaImg} className="w-40 h-56 object-contain drop-shadow-[0_15px_25px_rgba(245,158,11,0.35)]" alt="Guerrero Inca" />
                                ) : (
                                    /* ASTRONAUTA */
                                    <img src={astronautaImg} className="w-36 h-52 object-contain drop-shadow-[0_15px_25px_rgba(59,130,246,0.35)]" alt="Astronauta" />
                                )}
                            </div>

                            {/* 4. Letrero de ¡AVENTURA! en Neón Violeta */}
                            <div className="mt-4 bg-purple-950/40 border border-purple-500/25 px-5 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.15)] backdrop-blur-sm z-20 animate-bounce" style={{ animationDuration: '3s' }}>
                                <span className="text-sm font-black text-pink-400 uppercase tracking-widest text-neon-pink select-none">¡AVENTURA! 🧭</span>
                            </div>
                        </div>

                        <div className={`w-full max-w-2xl bg-[#121625]/95 border border-purple-500/10 rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-md flex flex-col justify-between min-h-[500px] relative overflow-hidden ${shaked ? 'animate-shake' : ''}`}>
                            
                            {/* Efecto de Estrellas Flotantes */}
                            {starsEffect.map(star => (
                                <div 
                                    key={star.id} 
                                    className="absolute text-yellow-400 font-black text-2xl animate-star-float pointer-events-none select-none"
                                    style={{ 
                                        left: `${star.left}%`, 
                                        top: `${star.top}%`,
                                        animationDelay: `${star.delay}s`
                                    }}
                                >
                                    ★
                                </div>
                            ))}

                            {/* Cuerpo de la pregunta */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">DESAFÍO DEL NIÑO</span>
                                    
                                    {/* Comodines */}
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={usarCincuentaCincuenta}
                                            disabled={powerups.fiftyFifty === 0 || answered}
                                            className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${
                                                powerups.fiftyFifty > 0 
                                                ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer active:scale-95' 
                                                : 'bg-slate-800/40 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                                            }`}
                                            title="Descarta 2 opciones incorrectas"
                                        >
                                            🎯 50/50
                                        </button>
                                        <div
                                            className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${
                                                powerups.doubleChance > 0 
                                                ? 'bg-purple-600/15 border-purple-500/30 text-purple-400' 
                                                : 'bg-slate-800/40 border-slate-800 text-slate-655 opacity-40'
                                            }`}
                                            title="Si fallas, tienes una segunda oportunidad pasiva"
                                        >
                                            🛡️ {powerups.doubleChance > 0 ? 'Segunda Op. (Disponible)' : 'Segunda Op. (Usado)'}
                                        </div>
                                    </div>
                                </div>
                                <h2 className="text-xl md:text-2xl font-black text-white leading-snug">
                                    <MathText text={activeQuestions[currentQuestionIdx]?.question} />
                                </h2>
                            </div>

                            {/* Opciones de juego (Los 5 Botones) */}
                            <div className="space-y-3 my-8">
                                {activeQuestions[currentQuestionIdx]?.options.map((opt, idx) => {
                                    const optLetter = opt.trim().charAt(0).toUpperCase();
                                    const isSelected = selectedOption === optLetter;
                                    const isDisabled = disabledOptions.includes(optLetter);
                                    
                                    // Verificación lógica de respuesta
                                    const currentQuestion = activeQuestions[currentQuestionIdx];
                                    const rawAnswer = currentQuestion.answer.trim().toUpperCase();
                                    const isOptCorrect = rawAnswer === optLetter || rawAnswer.startsWith(optLetter);
                                    
                                    // Colorear opciones en la retroalimentación
                                    let btnStyle = "bg-[#0f172a]/95 hover:bg-[#12192c] border-slate-800 hover:border-purple-500/50 text-slate-200 cursor-pointer shadow-md";
                                    let iconElement = null;

                                    if (isDisabled) {
                                        btnStyle = "bg-slate-950/40 border-slate-900/60 text-slate-700 opacity-30 cursor-not-allowed pointer-events-none";
                                    } else if (answered) {
                                        if (isOptCorrect) {
                                            btnStyle = "bg-emerald-500/15 border-2 border-emerald-500 text-emerald-400 font-bold scale-[1.01] shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                                            iconElement = <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black"><Check size={12} /></div>;
                                        } else if (isSelected) {
                                            btnStyle = "bg-rose-500/15 border-2 border-rose-500 text-rose-400 font-bold scale-[0.99] shadow-[0_0_15px_rgba(244,63,94,0.2)]";
                                            iconElement = <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black"><X size={12} /></div>;
                                        } else {
                                            btnStyle = "bg-slate-900/20 border-slate-900/80 text-slate-600 opacity-50";
                                        }
                                    }

                                    const getOptionEmoji = (text) => {
                                        const txt = text.toUpperCase();
                                        if (txt.includes('KERO')) return '🏺';
                                        if (txt.includes('TUMI')) return '🪓';
                                        if (txt.includes('HUACO')) return '🏺';
                                        if (txt.includes('PLATO')) return '🍽️';
                                        if (txt.includes('VASO')) return '🥛';
                                        if (txt.includes('COPA')) return '🍷';
                                        return null;
                                    };
                                    const optionEmoji = getOptionEmoji(opt);

                                    return (
                                        <button
                                            key={idx}
                                            id={`BTN_QUIZ_OPTION_${optLetter}`}
                                            disabled={answered || isDisabled}
                                            onClick={() => handleOptionSelect(optLetter)}
                                            className={`w-full py-4 px-6 rounded-2xl border text-left text-xs md:text-sm font-semibold flex justify-between items-center transition-all ${btnStyle} active:scale-95 disabled:pointer-events-none`}
                                        >
                                            <span className="leading-snug flex items-center gap-2">
                                                <MathText text={opt} />
                                                {optionEmoji && <span className="text-sm animate-pulse">{optionEmoji}</span>}
                                            </span>
                                            {iconElement}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Zona de avance */}
                            <div className="h-16 flex items-center justify-end">
                                {answered && (
                                    <button
                                        id="BTN_QUIZ_NEXT_QUESTION"
                                        onClick={handleNextQuestion}
                                        className="py-3 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                                    >
                                        {currentQuestionIdx + 1 < activeQuestions.length ? 'Siguiente Pregunta' : 'Finalizar Quiz'}
                                        <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Ilustración Derecha Animada - Bombilla Inteligente con Símbolos */}
                        <div className="hidden lg:flex flex-col items-center justify-center w-96 select-none pointer-events-none absolute right-2 xl:right-8 top-20 bottom-10 z-10">
                            
                            {/* 1. Símbolos Científicos Orbitantes */}
                            <div className="absolute inset-0">
                                {/* Símbolo x */}
                                <span className="absolute top-12 left-6 text-cyan-400/60 font-black text-xl animate-symbol-1">x</span>
                                {/* Símbolo raíz cuadrada */}
                                <span className="absolute top-4 right-10 text-emerald-400/50 font-black text-2xl animate-symbol-2">√</span>
                                {/* Símbolo pi */}
                                <span className="absolute top-32 right-2 text-purple-400/50 font-black text-lg animate-symbol-1" style={{ animationDelay: '1s' }}>π</span>
                                {/* Símbolo división */}
                                <span className="absolute top-44 left-2 text-yellow-400/50 font-black text-xl animate-symbol-2" style={{ animationDelay: '0.5s' }}>÷</span>
                                {/* Llaves de código */}
                                <span className="absolute bottom-36 left-4 text-pink-400/50 font-black text-base animate-symbol-1" style={{ animationDelay: '2s' }}>{"{ }"}</span>
                                {/* Símbolo sumatoria */}
                                <span className="absolute bottom-28 right-8 text-blue-400/50 font-black text-xl animate-symbol-2" style={{ animationDelay: '1.5s' }}>Σ</span>
                                {/* Símbolo ab */}
                                <span className="absolute bottom-48 right-4 text-orange-400/50 font-bold text-xs animate-symbol-1" style={{ animationDelay: '2.5s' }}>ab</span>
                                {/* Operación 1+1 */}
                                <span className="absolute bottom-12 left-10 text-teal-400/50 font-bold text-sm animate-symbol-2" style={{ animationDelay: '3s' }}>1+1</span>
                            </div>

                            {/* 2. Bombilla Inteligente con destellos */}
                            <div className="relative w-80 h-80 flex items-center justify-center animate-float-reverse z-20">
                                {/* Círculo difuso trasero (resplandor dorado de neón) */}
                                <div className="absolute w-64 h-64 rounded-full bg-yellow-400/20 blur-3xl z-10 animate-pulse" style={{ animationDuration: '3s' }} />
                                
                                {/* Rayos/destellos decorativos en un SVG de fondo */}
                                <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none z-10">
                                    <g stroke="#fef08a" strokeWidth="4" strokeLinecap="round" opacity="0.8">
                                        <line x1="100" y1="20" x2="100" y2="35" />
                                        <line x1="40" y1="50" x2="54" y2="64" />
                                        <line x1="18" y1="105" x2="33" y2="105" />
                                        <line x1="160" y1="50" x2="146" y2="64" />
                                        <line x1="182" y1="105" x2="167" y2="105" />
                                    </g>
                                </svg>

                                {/* Imagen PNG del Foco Inteligente */}
                                <img 
                                    src={focoImg} 
                                    className="w-72 h-72 object-contain drop-shadow-[0_20px_45px_rgba(234,179,8,0.45)] z-20" 
                                    alt="Foco Inteligente" 
                                />
                            </div>

                            {/* 3. Letrero de ¡CONOCIMIENTO! en Neón Celesta */}
                            <div className="mt-4 bg-cyan-950/40 border border-cyan-500/25 px-5 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.15)] backdrop-blur-sm z-20">
                                <span className="text-sm font-black text-cyan-400 uppercase tracking-widest text-neon-cyan select-none">¡CONOCIMIENTO! 🧠</span>
                            </div>
                        </div>
                    </main>
                </div>
            )}

            {/* FLUJO 3: PANTALLA DE RESULTADOS (ENDED) */}
            {gameState === 'ended' && (() => {
                const ratio = correctCount / (activeQuestions.length || 1);
                let medalEmoji = "🥉";
                let medalTitle = "Medalla de Bronce";
                let rankTitle = "¡Explorador de Saberes!";
                let rankColor = "text-amber-500";

                if (ratio >= 0.9) {
                    medalEmoji = "🥇";
                    medalTitle = "Medalla de Oro";
                    rankTitle = "¡Sabio MenteActiva!";
                    rankColor = "text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]";
                } else if (ratio >= 0.6) {
                    medalEmoji = "🥈";
                    medalTitle = "Medalla de Plata";
                    rankTitle = "¡Gran Investigador!";
                    rankColor = "text-slate-350";
                }

                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0f172a] overflow-y-auto relative overflow-hidden">
                        
                        {/* Confeti de celebración en cascada */}
                        {confettis.map(c => (
                            <div 
                                key={c.id}
                                className="absolute top-[-20px] w-2.5 h-2.5 rounded-full animate-confetti-fall pointer-events-none"
                                style={{
                                    left: `${c.left}%`,
                                    backgroundColor: c.color,
                                    animationDelay: `${c.delay}s`,
                                    animationDuration: `${c.duration}s`
                                }}
                            />
                        ))}

                        <div className="max-w-md w-full bg-[#1e293b] border border-slate-800 rounded-[3rem] p-10 md:p-12 shadow-2xl text-center space-y-8 relative z-10">
                            
                            <div className="w-24 h-24 bg-blue-600/10 border border-blue-500/20 rounded-full flex flex-col items-center justify-center mx-auto shadow-inner text-yellow-400 drop-shadow-[0_0_20px_rgba(30,64,175,0.4)] relative">
                                <span className="text-4xl">{medalEmoji}</span>
                            </div>

                            <div className="space-y-2">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${rankColor}`}>
                                    {rankTitle}
                                </span>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tight">{medalTitle}</h2>
                                <p className="text-slate-550 text-[10px] font-semibold uppercase tracking-wider">Desafío MenteActiva Completado</p>
                            </div>

                            {/* Estrellas dinámicas */}
                            {renderStars()}

                            <div className="bg-[#0f172a]/60 border border-slate-800 p-6 rounded-3xl space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-550 font-bold uppercase">Preguntas acertadas:</span>
                                    <span className="text-white font-black text-sm">{correctCount} / {activeQuestions.length}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-555 font-bold uppercase">Racha Máxima:</span>
                                    <span className="text-orange-400 font-black text-sm flex items-center gap-1">
                                        {maxStreak} 🔥
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-550 font-bold uppercase">Puntaje acumulado:</span>
                                    <span className="text-yellow-400 font-black text-sm">{score} PTS</span>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <button
                                    id="BTN_QUIZ_RESTART"
                                    onClick={() => {
                                        setGameState('setup');
                                    }}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all shadow-emerald-500/20 cursor-pointer"
                                >
                                    Crear Nuevo Desafío
                                </button>
                                
                                <button
                                    onClick={() => {
                                        setCurrentQuestionIdx(0);
                                        setSelectedOption(null);
                                        setAnswered(false);
                                        setScore(0);
                                        setCorrectCount(0);
                                        setStreak(0);
                                        setMaxStreak(0);
                                        setPowerups({ fiftyFifty: 1, doubleChance: 1 });
                                        setDisabledOptions([]);
                                        setUsedDoubleChance(false);
                                        setShaked(false);
                                        setStarsEffect([]);
                                        setQuestionTimeLeft(20);
                                        setGameState('playing');
                                    }}
                                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-2xl font-bold uppercase text-[10px] border border-slate-700 active:scale-95 transition-all cursor-pointer"
                                >
                                    Intentar de Nuevo
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default EduQuizInteractivoView;
