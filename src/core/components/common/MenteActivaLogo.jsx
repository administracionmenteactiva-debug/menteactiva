import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import logoImg from '../../../assets/mente activa logo.png';

const MenteActivaLogo = ({ className = "", showDetails = true, align = "center", imgHeight = "h-full", smallHeight = "48px", style = {} }) => {
    const { theme } = useAuth();
    
    const alignClasses = {
        left: 'items-start',
        center: 'items-center',
        right: 'items-end'
    };

    return (
        <div className={`flex flex-col ${alignClasses[align] || 'items-center'} justify-center pb-3 ${className}`} style={style}>
            <img 
                src={logoImg} 
                alt="Mente Activa Logo"
                style={{
                    height: showDetails ? '110px' : smallHeight,
                    objectFit: 'contain',
                    zIndex: 50,
                    filter: theme === 'dark' 
                        ? 'drop-shadow(0 0 15px rgba(255,255,255,0.1)) drop-shadow(0 4px 10px rgba(0,0,0,0.5))' 
                        : 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))'
                }}
                className={`transition-all duration-500 pointer-events-none`}
            />
            {showDetails && (
                <div className="flex flex-col items-center mt-2 pointer-events-none">
                    <div className="flex gap-2 text-[32px] font-black tracking-tighter leading-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        <span className={theme === 'dark' ? "text-white" : "text-slate-800"}>MENTE</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#d97706] to-[#fbbf24]">ACTIVA</span>
                    </div>
                    <div className={`text-[11px] font-bold tracking-[0.18em] mt-1 uppercase text-center ${theme === 'dark' ? "text-slate-300" : "text-slate-700"}`}>
                        Conéctalos con su mente.
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenteActivaLogo;
