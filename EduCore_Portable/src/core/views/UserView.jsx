import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import EduCreaLogo from '../components/common/EduCreaLogo.jsx';
import ThemeToggle from '../components/common/ThemeToggle.jsx';
import { User, Bell, Folder, LogOut, ChevronRight, Camera, Shield, Home } from 'lucide-react';
import DashboardSection from '../components/user/DashboardSection.jsx';
import AccountSection from '../components/user/AccountSection.jsx';
import NotificationsSection from '../components/user/NotificationsSection.jsx';

const UserView = () => {
    const { user, logout, globalVars, referrerContact } = useAuth();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('DASHBOARD');

    // Obtener información del creador para el WhatsApp
    const creatorPhone = referrerContact?.phone || '993125547';

    const handleLogout = () => {
        if (user?.plan === 'prueba') {
            const confirmLogout = window.confirm(`¡Gracias por probar EduCruci!\n\nCompre su acceso por 1 año comuníquese a WhatsApp: ${creatorPhone}\n\n¿Desea cerrar sesión ahora?`);
            if (!confirmLogout) return;
        }
        logout();
        navigate('/login');
    };

    const sections = [
        { id: 'DASHBOARD', label: 'Mi Panel', icon: <Home size={18} />, desc: 'Resumen y herramientas', color: 'var(--edu-logo-blue)' },
        { id: 'ACCOUNT', label: 'Mi Perfil', icon: <User size={18} />, desc: 'Perfil, foto y contraseña', color: 'var(--edu-logo-blue)' },
        { id: 'NOTIFICATIONS', label: 'Notificaciones', icon: <Bell size={18} />, desc: 'Avisos del sistema', color: 'var(--edu-logo-blue)' }
    ];

    const isAdmin = user?.role === 'admin_general' || user?.role === 'admin_aux';

    if (isAdmin) {
        sections.push({ id: 'ADMIN', label: 'Panel Admin', icon: <Shield size={18} />, desc: 'Regresar al tablero', color: '#f59e0b', action: () => navigate('/admin') });
    }

    const renderContent = () => {
        switch (activeSection) {
            case 'DASHBOARD': return <DashboardSection />;
            case 'ACCOUNT': return <AccountSection />;
            case 'NOTIFICATIONS': return <NotificationsSection />;
            default: return <DashboardSection />;
        }
    };

    return (
        <div className="flex h-screen bg-[var(--edu-bg)] overflow-hidden transition-colors duration-500">
            <div className="w-1/4 min-w-[320px] bg-[var(--edu-bg-sidebar)] border-r border-[var(--edu-border)] flex flex-col z-20 shadow-xl">
                <div className="h-[180px] px-6 border-b border-[var(--edu-border)] flex justify-center items-center bg-[var(--edu-bg-sidebar)]/50 backdrop-blur-md transition-all duration-500 overflow-visible relative">
                    <div onClick={() => navigate('/')} className="cursor-pointer transition-transform active:scale-95 flex justify-center items-center h-full w-full" title="Ir a Inicio">
                        <EduCreaLogo 
                            showDetails={false} 
                            align="center" 
                            className="h-[200px] w-auto transition-all duration-300" 
                            style={{ zIndex: 50 }}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 premium-scrollbar">
                    <div className="px-2 pb-4">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] opacity-60">Panel de Control</h2>
                    </div>

                    {sections.map(section => (
                        <div key={section.id} onClick={section.action || (() => setActiveSection(section.id))} className={`group p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${activeSection === section.id && !section.action ? 'bg-[var(--edu-accent)] text-white border-transparent' : 'bg-[var(--edu-bg-card)] border-[var(--edu-border)]'}`}>
                            <div className="p-2.5 rounded-xl bg-[var(--edu-bg)] group-hover:bg-[var(--edu-accent)]/10" style={{ color: activeSection === section.id && !section.action ? 'white' : section.color }}>{section.icon}</div>
                            <div className="flex-1">
                                <h3 className={`text-xs font-bold ${activeSection === section.id && !section.action ? 'text-white' : 'text-[var(--edu-text-main)]'}`}>{section.label}</h3>
                                <p className={`text-[10px] ${activeSection === section.id && !section.action ? 'text-white/80' : section.isGreenDesc ? 'text-green-500 font-bold' : 'text-[var(--edu-text-muted)]'}`}>{section.desc}</p>
                            </div>
                            <ChevronRight size={14} className={activeSection === section.id && !section.action ? 'text-white/40' : 'opacity-30'} />
                        </div>
                    ))}
                </div>

                <div className="mt-auto p-3 py-2 border-t border-[var(--edu-border)] flex flex-row items-center justify-between gap-3">
                    <ThemeToggle />
                    <button onClick={handleLogout} className="flex items-center gap-2 text-[10px] uppercase font-black text-[var(--edu-text-muted)] hover:text-red-500 transition-all py-1.5 px-4 rounded-xl border border-[var(--edu-border)] bg-[var(--edu-glass)]">
                        <LogOut size={12} /> Cerrar Sesión
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[var(--edu-bg)] relative p-10">
                {renderContent()}
            </div>
        </div>
    );
};

export default UserView;
