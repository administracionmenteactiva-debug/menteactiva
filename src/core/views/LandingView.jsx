import React from 'react';
import { useNavigate } from 'react-router-dom';
import MenteActivaLogo from '../components/common/MenteActivaLogo.jsx';
import ThemeToggle from '../components/common/ThemeToggle.jsx';
import { ArrowRight, Brain, Sparkles, LayoutGrid, CheckCircle2, Phone, Mail } from 'lucide-react';

const LandingView = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[var(--edu-bg)] text-[var(--edu-text-main)] transition-colors duration-500 overflow-x-hidden font-sans">
            {/* Header / Navbar */}
            <header className="fixed top-0 left-0 right-0 bg-[var(--edu-bg)]/80 backdrop-blur-md border-b border-[var(--edu-border)] z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <MenteActivaLogo className="scale-90 origin-left" />
                    
                    <div className="flex items-center gap-6">
                        <ThemeToggle />
                        <button 
                            onClick={() => navigate('/login')}
                            className="bg-[var(--edu-accent)] text-white px-6 py-2.5 rounded-full font-bold text-sm tracking-wide hover:brightness-110 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                        >
                            Acceder <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-6 relative">
                {/* Background Blobs */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] -z-10"></div>
                <div className="absolute top-40 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] -z-10"></div>

                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--edu-bg-card)] border border-[var(--edu-border)] shadow-sm mb-8 animate-fade-in">
                        <Sparkles size={16} className="text-orange-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--edu-text-muted)]">Plataforma Pedagógica Inteligente</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        Conéctalos con su <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">mente</span>.
                    </h1>
                    
                    <p className="text-lg md:text-xl text-[var(--edu-text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
                        Crea material educativo interactivo en segundos. Genera crucigramas, sopas de letras y sudokus personalizados para transformar el aprendizaje de tus estudiantes.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full sm:w-auto bg-[var(--edu-accent)] text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-xl hover:shadow-blue-500/20 active:scale-95"
                        >
                            Iniciar Sesión
                        </button>
                        <a 
                            href="#caracteristicas"
                            className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm text-[var(--edu-text-main)] hover:bg-[var(--edu-bg-card)] transition-all border border-transparent hover:border-[var(--edu-border)]"
                        >
                            Ver Herramientas
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="caracteristicas" className="py-24 px-6 bg-[var(--edu-bg-card)] border-y border-[var(--edu-border)] relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-black mb-4">Materiales diseñados para aprender</h2>
                        <p className="text-[var(--edu-text-muted)]">Herramientas poderosas y fáciles de usar para docentes y creadores de contenido.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-[var(--edu-bg)] p-8 rounded-3xl border border-[var(--edu-border)] shadow-sm hover:shadow-xl transition-all group">
                            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <LayoutGrid className="text-blue-500" size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Sopa de Letras</h3>
                            <p className="text-[var(--edu-text-muted)] text-sm leading-relaxed mb-6">
                                Diseña sopas de letras con palabras temáticas. Ideal para mejorar el vocabulario y la concentración visual de los estudiantes.
                            </p>
                            <ul className="space-y-2 text-sm text-[var(--edu-text-muted)]">
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Exportación en PDF</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Plantillas personalizables</li>
                            </ul>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-[var(--edu-bg)] p-8 rounded-3xl border border-[var(--edu-border)] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl">Popular</div>
                            <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Brain className="text-orange-500" size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Crucigramas</h3>
                            <p className="text-[var(--edu-text-muted)] text-sm leading-relaxed mb-6">
                                Genera crucigramas automáticos a partir de tus propias palabras y pistas. Fomenta el pensamiento crítico de forma divertida.
                            </p>
                            <ul className="space-y-2 text-sm text-[var(--edu-text-muted)]">
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Auto-generación inteligente</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Claves de respuesta incluidas</li>
                            </ul>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-[var(--edu-bg)] p-8 rounded-3xl border border-[var(--edu-border)] shadow-sm hover:shadow-xl transition-all group">
                            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Sparkles className="text-purple-500" size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Sudokus Educativos</h3>
                            <p className="text-[var(--edu-text-muted)] text-sm leading-relaxed mb-6">
                                Crea cuadrículas de Sudoku con distintos niveles de dificultad. Perfecto para desarrollar habilidades lógicas y matemáticas.
                            </p>
                            <ul className="space-y-2 text-sm text-[var(--edu-text-muted)]">
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Niveles configurables</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Formato de impresión óptimo</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[var(--edu-bg)] py-12 px-6 border-t border-[var(--edu-border)]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col items-center md:items-start gap-4">
                        <MenteActivaLogo className="scale-75 origin-left" />
                        <p className="text-xs text-[var(--edu-text-muted)]">
                            &copy; {new Date().getFullYear()} Mente Activa. Todos los derechos reservados.
                        </p>
                    </div>

                    <div className="flex gap-6 text-sm font-bold text-[var(--edu-text-muted)]">
                        <a href="mailto:administracionmenteactiva@gmail.com" className="hover:text-[var(--edu-accent)] transition-colors flex items-center gap-2">
                            <Mail size={16} /> Contacto
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingView;
