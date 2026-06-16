import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useAuth();

    return (
        <button
            id="GLOBAL_THEME_TOGGLE"
            onClick={toggleTheme}
            className="group relative flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:border-[#c5a059]/50 hover:bg-[#c5a059]/5 transition-all duration-300 shadow-lg overflow-hidden"
            title={theme === 'light' ? 'Activar Modo Noche' : 'Activar Modo Día'}
        >
            <div className={`absolute transition-all duration-500 transform ${theme === 'light' ? 'rotate-0 opacity-100 scale-100' : 'rotate-90 opacity-0 scale-0'}`}>
                <Sun size={14} className="text-amber-500" />
            </div>
            <div className={`absolute transition-all duration-500 transform ${theme === 'dark' ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-0'}`}>
                <Moon size={14} className="text-blue-400" />
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-tr from-[#c5a059]/0 to-[#c5a059]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
    );
};

export default ThemeToggle;
