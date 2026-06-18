import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ChevronLeft, Play, Clock, Calendar, Video, ShieldCheck } from 'lucide-react';
import MenteActivaLogo from '../components/common/MenteActivaLogo.jsx';
import { db } from '../services/databaseService.js';

const TutorialView = () => {
    const navigate = useNavigate();
    const { globalVars, user } = useAuth();
    
    const tutorials = globalVars.META_TUTORIALS?.length > 0 
        ? globalVars.META_TUTORIALS 
        : [
            { 
                id: 't1', 
                title: 'EduCrea: Tutorial de Inicio a Fin', 
                url: 'https://www.youtube.com/embed/9forXItrWGo',
                duration: '01:29', 
                date: '6/5/2026',
                description: 'Mira el video, es corto, y con él entenderás claramente cómo usar la aplicación.'
            }
        ];

    const [selectedVideo, setSelectedVideo] = useState(tutorials[0]);

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans flex flex-col overflow-hidden">
            <header className="h-24 bg-[#1e293b]/50 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-8 z-30">
                <div className="flex items-center gap-6">
                    <div onClick={() => navigate('/')} className="cursor-pointer transition-transform active:scale-95" title="Ir a Inicio">
                        <MenteActivaLogo 
                            align="left" 
                            imgHeight="h-[100px]" 
                            className="ml-[-20px] drop-shadow-[0_0_40px_rgba(59,130,246,0.5)] transition-all" 
                            style={{ transform: 'scale(1.4175) translate(20px, 0px)', zIndex: 50 }}
                        />
                    </div>
                    <button onClick={() => navigate('/user')} className="ml-[100px] p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-white uppercase">Centro de <span className="text-blue-500">Capacitación</span></h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                <section className="flex-[3] p-6 flex flex-col gap-4 overflow-y-auto premium-scrollbar bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
                    <div className="w-full max-w-[744px] mx-auto aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group relative">
                        {/* BLINDAJE DE PRECISIÓN (Túnel de Seguridad) */}
                        <div className="absolute inset-0 z-[100] pointer-events-none">
                            {/* Bloqueo Superior (Título/Compartir) */}
                            <div className="absolute top-0 left-0 w-full h-[80px] bg-[#00000001] pointer-events-auto cursor-not-allowed" title="Protección de contenido"></div>
                            
                            {/* Bloqueo Inferior Quirúrgico (Tapa botones pero deja libre la barra de tiempo abajo) */}
                            <div className="absolute bottom-[12px] left-0 w-full h-[60px] bg-[#00000001] pointer-events-auto cursor-not-allowed" title="Protección de contenido"></div>
                        </div>
                        
                        <iframe 
                            width="100%" 
                            height="100%" 
                            src={`${selectedVideo.url}${selectedVideo.url.includes('?') ? '&' : '?'}modestbranding=1&rel=0&showinfo=0&controls=1&iv_load_policy=3&fs=0`} 
                            title={selectedVideo.title} 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        ></iframe>
                    </div>
                    <div className="max-w-[744px] mx-auto w-full">
                        <p className="text-slate-400 mt-2 text-[10px] uppercase tracking-widest font-black border-l-2 border-blue-500 pl-4 py-1 bg-blue-500/5 opacity-60">
                            Capacitación Privada EduCrea • {selectedVideo.date || '2026'}
                        </p>
                    </div>
                </section>

                <aside className="flex-1 min-w-[380px] bg-[#1e293b]/30 backdrop-blur-md border-l border-slate-800 p-4 space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Contenido Sugerido</h3>
                    {tutorials.map((video) => (
                        <div 
                            key={video.id} 
                            onClick={() => {
                                setSelectedVideo(video);
                                if (user?.id) {
                                    db.logActivity(user.id, 'VIO_TUTORIAL', { 
                                        video_id: video.id,
                                        video_title: video.title 
                                    });
                                }
                            }} 
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedVideo.id === video.id ? 'bg-blue-600 border-blue-500' : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/60'}`}
                        >
                            <h4 className="text-[11px] font-bold">{video.title}</h4>
                        </div>
                    ))}
                </aside>
            </main>
        </div>
    );
};

export default TutorialView;
