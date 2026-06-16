import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Hexagon } from 'lucide-react';

const MenteActivaLogo = ({ className = "", showDetails = true, align = "center", imgHeight = "h-full", style = {} }) => {
    const { theme } = useAuth();
    
    const alignClasses = {
        left: 'items-start',
        center: 'items-center',
        right: 'items-end'
    };

    const nameStyles = {
        fontFamily: "'Quicksand', sans-serif",
        letterSpacing: '-0.5px',
    };

    return (
        <div className={`flex flex-col ${alignClasses[align] || 'items-center'} justify-center ${className}`} style={style}>
            <Hexagon 
                size={showDetails ? 120 : 48}
                strokeWidth={1.5}
                className={`text-blue-500 transition-all duration-500 pointer-events-none ${showDetails ? 'mb-4' : ''}`}
                style={{ 
                    zIndex: 50,
                    filter: theme === 'dark' 
                        ? 'drop-shadow(0 0 25px rgba(59,130,246,0.3)) drop-shadow(0 8px 20px rgba(0,0,0,0.6))' 
                        : 'drop-shadow(0 8px 20px rgba(59,130,246,0.2))' 
                }}
            />
            {showDetails && (
                <div className={`flex flex-col ${alignClasses[align] || 'items-center'} animate-fade-in`}>
                    <h1 className="text-4xl font-black text-[var(--edu-text-main)]" style={{ ...nameStyles, textShadow: theme === 'dark' ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none' }}>
                        Mente<span className="text-blue-500">Activa</span>
                    </h1>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-[var(--edu-text-muted)] mt-1 opacity-60">
                        Plataforma SaaS Base
                    </p>
                </div>
            )}
        </div>
    );
};

export default MenteActivaLogo;
