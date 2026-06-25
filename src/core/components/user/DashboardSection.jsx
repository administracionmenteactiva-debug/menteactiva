import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Home, Sparkles, BookOpen, Calendar, Lightbulb, ArrowRight, Zap, ShieldCheck, LayoutGrid, Lock, MessageCircle, AlertTriangle, Clock, Calculator } from 'lucide-react';
import crucigramaIcon from '../../../assets/icono_crucigrama-1.png';
import sopaIcon from '../../../assets/icono_sopa_1.png';
import sudokuIcon from '../../../assets/ICONO SUDOKU.PNG';
import examenIcon from '../../../assets/icono_examen.png';
import crucimateIcon from '../../../assets/icono_crucimate.png';

const DashboardSection = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const fullName = user?.fullName || 'Docente';
    
    const getFirstNameWithTitle = (name) => {
        if (!name) return 'Docente';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 0) return 'Docente';
        
        const firstWord = parts[0];
        const isTitle = firstWord.endsWith('.') || 
            ['lic', 'dr', 'dra', 'mg', 'prof', 'profe', 'ing', 'mag', 'magister'].includes(firstWord.toLowerCase().replace('.', ''));
            
        if (isTitle && parts.length > 1) {
            return `${firstWord} ${parts[1]}`;
        }
        return firstWord;
    };
    
    const displayFirstName = getFirstNameWithTitle(fullName);    
    const [greeting, setGreeting] = useState('');
    const [phrase, setPhrase] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Buenos días');
        else if (hour < 19) setGreeting('Buenas tardes');
        else setGreeting('Buenas noches');

        const phrases = [
            "Hoy es un gran día para inspirar a tus estudiantes.",
            "La educación es el arma más poderosa para cambiar el mundo.",
            "Tu labor transforma el futuro. ¿Qué planificaremos hoy?",
            "El arte de enseñar es el arte de asistir el descubrimiento.",
            "Siembra conocimiento hoy, cosecha líderes mañana."
        ];
        setPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
    }, []);

    const isAdmin = user?.role === 'admin_general' || user?.role === 'admin_aux';
    const showUnidocente = isAdmin || (user?.allowedTools && user.allowedTools.includes('Primaria'));
    // Feature Flag: Inicial oculto en producción para usuarios regulares hasta liberación oficial
    const showInicial = isAdmin || (user?.allowedTools && user.allowedTools.includes('Inicial'));

    // Lógica de Vencimiento
    let daysLeft = null;
    let isExpired = false;
    let showWarning = false;
    
    if (!isAdmin && user?.plan !== 'ilimitado' && user?.subscription?.end) {
        const endDate = new Date(user.subscription.end);
        const today = new Date();
        daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        isExpired = daysLeft < 0;
        showWarning = daysLeft <= 10;
    }
    
    const adminWsp = user?.whatsappVentas || '993125547';
    const wspLink = `https://wa.me/51${adminWsp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, me comunico porque mi suscripción en EduCrea ' + (isExpired ? 'ha vencido' : 'está por vencer') + ' y deseo renovarla.')}`;

    const cards = [
        {
            title: "CRUCIGRAMAS",
            dbName: "Crucigramas",
            icon: <img src={crucigramaIcon} alt="Crucigramas" className="w-20 h-20 object-contain drop-shadow-lg" />,
            color: "#f97316",
            bg: "bg-orange-500",
            hover: "hover:shadow-orange-500/20 hover:border-orange-500/50",
            path: "/crucigramas"
        },
        {
            title: "CRUCIMATE",
            dbName: "Crucigramas",
            icon: <img src={crucimateIcon} alt="Crucimate" className="w-20 h-20 object-contain drop-shadow-lg" />,
            color: "#e11d48",
            bg: "bg-rose-500",
            hover: "hover:shadow-rose-500/20 hover:border-rose-500/50",
            path: "/crucimate"
        },
        {
            title: "SOPA DE LETRAS",
            dbName: "Sopa de Letras",
            icon: <img src={sopaIcon} alt="Sopa de Letras" className="w-20 h-20 object-contain drop-shadow-lg" />,
            color: "#3b82f6",
            bg: "bg-blue-500",
            hover: "hover:shadow-blue-500/20 hover:border-blue-500/50",
            path: "/sopadeletras"
        },
        {
            title: "SUDOKU",
            dbName: "Sudoku",
            icon: <img src={sudokuIcon} alt="Sudoku" className="w-20 h-20 object-contain drop-shadow-lg" />,
            color: "#8b5cf6", // Purple color to distinguish it
            bg: "bg-violet-500",
            hover: "hover:shadow-violet-500/20 hover:border-violet-500/50",
            path: "/sudoku"
        },
        {
            title: "CREA QUIZ",
            dbName: "Exámenes",
            icon: <img src={examenIcon} alt="Crea Quiz" className="w-20 h-20 object-contain drop-shadow-lg" />,
            color: "#10b981", // Emerald green color
            bg: "bg-emerald-500",
            hover: "hover:shadow-emerald-500/20 hover:border-emerald-500/50",
            path: "/examenes"
        }
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col gap-2 animate-fade-in relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--edu-bg-card)] border border-[var(--edu-border)] w-max mb-2 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Sistema en Línea</span>
                </div>
                <h1 className="text-4xl font-black text-[var(--edu-text-main)] tracking-tight">
                    {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--edu-logo-blue)] to-[var(--edu-logo-green)]">{displayFirstName}</span>
                </h1>
                <p className="text-sm text-[var(--edu-text-muted)] font-medium max-w-xl leading-relaxed">
                    {phrase}
                </p>
                
                {showWarning && (
                    <div className={`mt-4 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4 border shadow-sm max-w-4xl ${isExpired ? 'bg-rose-500/10 border-rose-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                        <div className={`p-3 rounded-full flex-shrink-0 ${isExpired ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>
                            {isExpired ? <AlertTriangle size={24} /> : <Clock size={24} />}
                        </div>
                        <div className="flex-1">
                            <h3 className={`font-black uppercase tracking-widest text-[11px] mb-1 ${isExpired ? 'text-rose-500' : 'text-amber-500'}`}>
                                {isExpired ? 'Suscripción Vencida' : 'Aviso de Vencimiento'}
                            </h3>
                            <p className="text-sm text-[var(--edu-text-main)] font-medium">
                                {isExpired 
                                    ? 'Tu acceso a las herramientas ha sido bloqueado. Por favor, renueva tu suscripción para continuar.' 
                                    : `Tu suscripción vencerá en ${daysLeft} día${daysLeft === 1 ? '' : 's'}. Renueva anticipadamente para no perder acceso.`}
                            </p>
                        </div>
                        <a 
                            href={wspLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`px-6 py-2.5 flex-shrink-0 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105 shadow-md ${isExpired ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-amber-500 text-white shadow-amber-500/20'}`}
                        >
                            <MessageCircle size={16} />
                            Renovar Ahora
                        </a>
                    </div>
                )}
            </div>

            {/* Main Action Cards */}
            <div className="pt-2 animate-fade-in" style={{ animationDelay: '0.08s' }}>
                <h2 className="text-xl font-black text-[var(--edu-text-main)] mb-5 tracking-tight flex items-center gap-2">
                    ¿En qué vamos a trabajar hoy?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {cards.map((card, idx) => {
                        const hasAccess = isAdmin || (user?.allowedTools && user.allowedTools.includes(card.dbName));
                        const isBlockedDueToExpired = isExpired && !isAdmin;
                        const blocked = isBlockedDueToExpired || !hasAccess;
                        
                        return (
                        <div 
                            key={idx}
                            onClick={() => {
                                if (blocked) {
                                    if (isBlockedDueToExpired) {
                                        alert("⏳ Tu suscripción ha vencido. Por favor contacta a soporte para renovar y recuperar el acceso.");
                                    } else {
                                        alert("🔒 No tienes acceso a esta herramienta. Por favor contacta a soporte para adquirirla.");
                                    }
                                    window.open(wspLink, '_blank');
                                } else {
                                    navigate(card.path);
                                }
                            }}
                            className={`group relative overflow-hidden bg-[var(--edu-bg-card)] border border-[var(--edu-border)] rounded-3xl p-5 cursor-pointer transition-all duration-300 shadow-lg ${blocked ? 'opacity-60 grayscale' : `hover:-translate-y-1 ${card.hover}`}`}
                        >
                            {blocked && (
                                <div className="absolute inset-0 bg-[var(--edu-bg)]/40 z-20 flex items-center justify-center backdrop-blur-[1px]">
                                    <div className="bg-rose-500 text-white p-3 rounded-full shadow-xl">
                                        <Lock size={28} />
                                    </div>
                                </div>
                            )}
                            <div className={`absolute top-0 right-0 w-24 h-24 ${card.bg} opacity-[0.05] rounded-full blur-2xl -mr-8 -mt-8 ${!blocked ? 'group-hover:opacity-20' : ''} transition-opacity duration-500`}></div>
                            
                            <div className={`relative z-10 flex flex-col items-center text-center h-full ${blocked ? 'opacity-50' : ''}`}>
                                <div 
                                    className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-inner transition-transform duration-300 ${!blocked ? 'group-hover:scale-110' : ''}`}
                                    style={{ backgroundColor: `${card.color}15`, color: card.color }}
                                >
                                    {card.icon}
                                </div>
                                
                                <h3 className={`text-xl uppercase font-black text-[var(--edu-text-main)] leading-tight mb-1.5 transition-colors ${!blocked ? 'group-hover:text-[var(--edu-logo-blue)]' : ''} ${!card.desc ? 'flex-1' : ''}`}>
                                    {card.title}
                                </h3>
                                {card.desc && (
                                    <p className="text-[11px] text-[var(--edu-text-muted)] font-medium flex-1">
                                        {card.desc}
                                    </p>
                                )}

                                <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-colors" style={{ color: card.color }}>
                                    <span>{blocked ? 'Bloqueado' : 'Iniciar'}</span>
                                    {!blocked && <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />}
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                
                {/* Tutoriales */}
                <div className="bg-gradient-to-br from-[var(--edu-bg-card)] to-[var(--edu-bg)] border border-[var(--edu-border)] rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden group hover:border-pink-500/50 transition-colors cursor-pointer" onClick={() => navigate('/tutorial')}>
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
                        <Zap size={20} />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-pink-500 mb-1">Capacitación</h4>
                        <h3 className="text-base font-bold text-[var(--edu-text-main)] mb-1">Tutoriales</h3>
                        <p className="text-xs text-[var(--edu-text-muted)] leading-relaxed">
                            Aprende a dominar Mente Activa paso a paso con nuestros videos.
                        </p>
                    </div>
                </div>

                {/* Sabías que / Best Practice */}
                <div className="bg-gradient-to-br from-[var(--edu-bg-card)] to-[var(--edu-bg)] border border-[var(--edu-border)] rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden group">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Sparkles size={20} />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Sabías que...</h4>
                        <h3 className="text-base font-bold text-[var(--edu-text-main)] mb-1">Regresa a tu Panel</h3>
                        <p className="text-xs text-[var(--edu-text-muted)] leading-relaxed">
                            Si estás dentro de una herramienta y deseas volver a este menú principal, solo haz clic en el ícono de la tuerca ⚙️ ubicado arriba a la izquierda.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardSection;
