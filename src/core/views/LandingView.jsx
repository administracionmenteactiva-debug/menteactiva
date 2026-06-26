import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../services/databaseService.js';
import MenteActivaLogo from '../components/common/MenteActivaLogo.jsx';
import ThemeToggle from '../components/common/ThemeToggle.jsx';
import { LayoutGrid, Brain, Sparkles, MonitorOff, GraduationCap, Users, MousePointerClick, Settings2, Printer } from 'lucide-react';
import iconoSopa from '../../assets/icono_sopa_1.png';
import iconoCrucigrama from '../../assets/icono_crucigrama-1.png';
import iconoSudoku from '../../assets/ICONO SUDOKU.PNG';
import iconoCrucimate from '../../assets/icono_crucimate.png';
import iconoExamen from '../../assets/icono_examen.png';

const LandingView = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const ref = searchParams.get('ref');
    const [referredWalink, setReferredWalink] = useState(null);

    useEffect(() => {
        if (ref) {
            db.getPublicContact(ref)
                .then(link => {
                    if (link) setReferredWalink(link);
                })
                .catch(err => console.error("Error fetching referrer:", err));
        }
    }, [ref]);

    const handleAccessClick = () => {
        if (referredWalink) {
            let finalLink = referredWalink;
            if (!/^https?:\/\//i.test(finalLink)) {
                finalLink = 'https://' + finalLink;
            }
            window.location.href = finalLink;
        } else {
            navigate('/login' + (ref ? `?ref=${ref}` : ''));
        }
    };

    return (
        <div className="min-h-screen bg-[#f8faff] dark:bg-[var(--edu-bg)] text-[#0f172a] dark:text-[var(--edu-text-main)] transition-colors duration-500 overflow-x-hidden font-sans">
            {/* Header / Navbar */}
            <header className="bg-[#0f172a] text-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 py-1 flex items-center justify-between -my-2">
                    <MenteActivaLogo className="scale-[0.75] origin-left" forceDark={true} />
                    
                    <div className="flex items-center gap-6">
                        <ThemeToggle />
                        <button 
                            onClick={() => navigate('/login' + (ref ? `?ref=${ref}` : ''))}
                            className="bg-transparent text-white border border-white/30 px-6 py-2.5 rounded-full font-bold text-sm tracking-wide hover:bg-white/10 transition-all"
                        >
                            Iniciar Sesión
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-12 pb-20 px-6 max-w-7xl mx-auto">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    {/* Left: Text */}
                    <div className="order-2 md:order-1 text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                            ¡Une sus <span className="text-[#c28d22]">pasatiempos</span> con lo aprendido en el <span className="text-[#c28d22]">cole</span>!
                        </h1>
                        <p className="text-lg md:text-xl text-[#334155] dark:text-[var(--edu-text-muted)] mb-10 leading-relaxed font-medium">
                            La fórmula perfecta para apagar las pantallas, activar su mente y eliminar las barreras del aprendizaje en casa.
                        </p>
                        <button 
                            onClick={handleAccessClick}
                            className="w-full md:w-auto bg-[#fbbf24] hover:bg-[#f59e0b] text-[#78350f] px-10 py-5 rounded-2xl font-black text-lg tracking-wide transition-all shadow-[0_8px_30px_rgb(251,191,36,0.3)] hover:shadow-[0_8px_40px_rgb(251,191,36,0.5)] hover:-translate-y-1 active:translate-y-0"
                        >
                            [ Acceder a la plataforma ]
                        </button>
                    </div>

                    {/* Right: Image */}
                    <div className="order-1 md:order-2 relative flex justify-center">
                        <img 
                            src="/hero_child.png" 
                            alt="Adolescente concentrado resolviendo juegos mentales" 
                            className="w-full max-w-md md:max-w-lg object-contain animate-fade-in drop-shadow-2xl"
                        />
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-24 px-6 bg-[#fffbeb] dark:bg-[var(--edu-bg-card)] border-t border-[#fde68a] dark:border-[var(--edu-border)]">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-black mb-16 text-center text-[#0f172a] dark:text-white">
                        Por qué los padres prefieren nuestra fórmula de desconexión.
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        {/* Benefit 1 */}
                        <div className="bg-white dark:bg-[var(--edu-bg)] border border-[#e2e8f0] dark:border-[var(--edu-border)] rounded-[2rem] pt-6 pb-6 px-5 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center">
                            <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-widest uppercase mb-4 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                                Menos Pantallas
                            </span>
                            <div className="w-[140px] h-[140px] rounded-2xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20 p-2 flex items-center justify-center mb-4">
                                <img src="/icon_ben1.png" alt="Desconexión digital" className="w-full h-full object-contain" />
                            </div>
                            <h3 className="text-xl font-black mb-2 text-[#0f172a] dark:text-white">Desconexión digital</h3>
                            <p className="text-[#64748b] dark:text-[var(--edu-text-muted)] text-sm leading-relaxed">
                                Aleja a tus hijos de las pantallas con actividades tangibles que estimulen su cerebro.
                            </p>
                        </div>

                        {/* Benefit 2 */}
                        <div className="bg-white dark:bg-[var(--edu-bg)] border border-[#e2e8f0] dark:border-[var(--edu-border)] rounded-[2rem] pt-6 pb-6 px-5 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center">
                            <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-widest uppercase mb-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                Aprendizaje Eficaz
                            </span>
                            <div className="w-[140px] h-[140px] rounded-2xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 p-2 flex items-center justify-center mb-4">
                                <img src="/icon_ben2.png" alt="Refuerzo escolar divertido" className="w-full h-full object-contain" />
                            </div>
                            <h3 className="text-xl font-black mb-2 text-[#0f172a] dark:text-white">Refuerzo escolar divertido</h3>
                            <p className="text-[#64748b] dark:text-[var(--edu-text-muted)] text-sm leading-relaxed">
                                Ideal para repasar vocabulario, ortografía y matemáticas sin que se sientan presionados.
                            </p>
                        </div>

                        {/* Benefit 3 */}
                        <div className="bg-white dark:bg-[var(--edu-bg)] border border-[#e2e8f0] dark:border-[var(--edu-border)] rounded-[2rem] pt-6 pb-6 px-5 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center">
                            <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-widest uppercase mb-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                Conexión Real
                            </span>
                            <div className="w-[140px] h-[140px] rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 p-2 flex items-center justify-center mb-4">
                                <img src="/icon_ben3.png" alt="Tiempo en familia" className="w-full h-full object-contain" />
                            </div>
                            <h3 className="text-xl font-black mb-2 text-[#0f172a] dark:text-white">Tiempo en familia</h3>
                            <p className="text-[#64748b] dark:text-[var(--edu-text-muted)] text-sm leading-relaxed">
                                Crea momentos únicos guiándolos y celebrando sus logros.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Games Preview Section */}
            <section className="py-12 px-6 bg-white dark:bg-[var(--edu-bg-card)] border-y border-[#e2e8f0] dark:border-[var(--edu-border)]">
                <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 justify-center">
                    {/* Sopa de Letras */}
                    <div className="bg-white dark:bg-[var(--edu-bg)] border border-[#e2e8f0] dark:border-[var(--edu-border)] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all flex items-center gap-5 group">
                        <div className="w-16 h-16 flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center p-3 group-hover:scale-110 transition-transform">
                            <img src={iconoSopa} alt="Sopa de Letras" className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-black text-[#1e3a8a] dark:text-blue-400 mb-1 leading-tight">Sopa de Letras</h3>
                            <p className="text-sm text-[#64748b] dark:text-[var(--edu-text-muted)] leading-tight">Pupiletras temáticos (ej. Planetas).</p>
                        </div>
                    </div>

                    {/* Crucigrama */}
                    <div className="bg-white dark:bg-[var(--edu-bg)] border border-[#e2e8f0] dark:border-[var(--edu-border)] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all flex items-center gap-5 group">
                        <div className="w-16 h-16 flex-shrink-0 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center p-3 group-hover:scale-110 transition-transform">
                            <img src={iconoCrucigrama} alt="Crucigrama Colorido" className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-black text-[#ea580c] dark:text-orange-400 mb-1 leading-tight">Crucigrama</h3>
                            <p className="text-sm text-[#64748b] dark:text-[var(--edu-text-muted)] leading-tight">¡Tú eliges los temas!</p>
                        </div>
                    </div>

                    {/* Sudoku */}
                    <div className="bg-white dark:bg-[var(--edu-bg)] border border-[#e2e8f0] dark:border-[var(--edu-border)] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all flex items-center gap-5 group">
                        <div className="w-16 h-16 flex-shrink-0 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center p-3 group-hover:scale-110 transition-transform">
                            <img src={iconoSudoku} alt="Sudoku para Niños" className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-black text-[#16a34a] dark:text-green-400 mb-1 leading-tight">Sudoku</h3>
                            <p className="text-sm text-[#64748b] dark:text-[var(--edu-text-muted)] leading-tight">Niveles personalizables.</p>
                        </div>
                    </div>

                    {/* CruciMate */}
                    <div className="bg-white dark:bg-[var(--edu-bg)] border border-[#e2e8f0] dark:border-[var(--edu-border)] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all flex items-center gap-5 group">
                        <div className="w-16 h-16 flex-shrink-0 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center p-3 group-hover:scale-110 transition-transform">
                            <img src={iconoCrucimate} alt="CruciMate" className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-black text-[#dc2626] dark:text-red-400 mb-1 leading-tight">CruciMate</h3>
                            <p className="text-sm text-[#64748b] dark:text-[var(--edu-text-muted)] leading-tight">Matemáticas divertidas.</p>
                        </div>
                    </div>

                    {/* Crea Quiz */}
                    <div className="bg-white dark:bg-[var(--edu-bg)] border border-[#e2e8f0] dark:border-[var(--edu-border)] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all flex items-center gap-5 group">
                        <div className="w-16 h-16 flex-shrink-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center p-3 group-hover:scale-110 transition-transform">
                            <img src={iconoExamen} alt="Crea Quiz" className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-black text-[#4f46e5] dark:text-indigo-400 mb-1 leading-tight">Crea Quiz</h3>
                            <p className="text-sm text-[#64748b] dark:text-[var(--edu-text-muted)] leading-tight">Desafío gamificado.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3 Steps Section */}
            <section className="py-24 px-6 bg-[#f0f9ff] dark:bg-[var(--edu-bg)]">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-black mb-16 text-[#0f172a] dark:text-white">3 Pasos Visual Demo</h2>
                    
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 relative">
                        {/* Step 1 */}
                        <div className="flex-1 flex flex-col items-center relative z-10">
                            <div className="w-32 h-32 bg-white dark:bg-[var(--edu-bg-card)] rounded-full border-[6px] border-[#81aebf] shadow-lg flex items-center justify-center mb-6 relative overflow-hidden p-3">
                                <div className="absolute top-2 left-2 w-8 h-8 bg-[#375e8f] text-white rounded-full flex items-center justify-center font-black text-sm z-10 shadow-md border-2 border-white">1</div>
                                <img src="/icon_step1.png" alt="Elige el juego" className="w-full h-full object-contain" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">1. Elige el juego</h3>
                            <p className="text-[#64748b] dark:text-[var(--edu-text-muted)] text-sm px-4">
                                (Selecciona crucigramas, pupiletras, sudoku, crucimate o quiz interactivo).
                            </p>
                        </div>

                        <div className="hidden md:block w-32 h-1 bg-[#81aebf] dark:bg-[var(--edu-border)] absolute top-16 left-[20%] right-auto -z-0"></div>

                        {/* Step 2 */}
                        <div className="flex-1 flex flex-col items-center relative z-10 mt-12 md:mt-0">
                            <div className="w-32 h-32 bg-white dark:bg-[var(--edu-bg-card)] rounded-full border-[6px] border-[#81aebf] shadow-lg flex items-center justify-center mb-6 relative overflow-hidden p-3">
                                <div className="absolute top-2 left-2 w-8 h-8 bg-[#375e8f] text-white rounded-full flex items-center justify-center font-black text-sm z-10 shadow-md border-2 border-white">2</div>
                                <img src="/icon_step2.png" alt="Personalízalo" className="w-full h-full object-contain" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">2. Personalízalo</h3>
                            <p className="text-[#64748b] dark:text-[var(--edu-text-muted)] text-sm px-4">
                                (Escribe tus temas, preguntas, operaciones o palabras para hacerlo especial).
                            </p>
                        </div>

                        <div className="hidden md:block w-32 h-1 bg-[#81aebf] dark:bg-[var(--edu-border)] absolute top-16 right-[20%] left-auto -z-0"></div>

                        {/* Step 3 */}
                        <div className="flex-1 flex flex-col items-center relative z-10 mt-12 md:mt-0">
                            <div className="w-32 h-32 bg-white dark:bg-[var(--edu-bg-card)] rounded-full border-[6px] border-[#81aebf] shadow-lg flex items-center justify-center mb-6 relative overflow-hidden p-3">
                                <div className="absolute top-2 left-2 w-8 h-8 bg-[#375e8f] text-white rounded-full flex items-center justify-center font-black text-sm z-10 shadow-md border-2 border-white">3</div>
                                <img src="/icon_step3.png" alt="¡Aprende jugando!" className="w-full h-full object-contain" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">3. ¡Aprende jugando!</h3>
                            <p className="text-[#64748b] dark:text-[var(--edu-text-muted)] text-sm px-4">
                                (Descarga el PDF al instante o juega interactivamente en la plataforma).
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#0f172a] text-white py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                    <div>
                        <p className="font-bold mb-2">MENTE ACTIVA</p>
                        <p className="text-xs text-white/50">
                            &copy; {new Date().getFullYear()} Mente Activa. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingView;
