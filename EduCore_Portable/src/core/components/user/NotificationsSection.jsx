import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Bell, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const NotificationsSection = () => {
    const { user } = useAuth();
    const notifications = user?.notifications || [
        { id: 'n1', text: 'Bienvenido al sistema EduCruci Studio. Ya puedes comenzar a crear materiales.', date: '2026-04-18', type: 'info' },
        { id: 'n2', text: 'El administrador ha actualizado los lineamientos del CNEB 2026.', date: '2026-04-18', type: 'warning' }
    ];

    const getIcon = (type) => {
        switch (type) {
            case 'warning': return <AlertTriangle size={18} className="text-[var(--edu-warning)]" />;
            case 'success': return <CheckCircle size={18} className="text-[var(--edu-success)]" />;
            default: return <Info size={18} className="text-[var(--edu-info)]" />;
        }
    };

    return (
        <div className="space-y-12">
            
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--edu-logo-blue)]/10 rounded-2xl flex items-center justify-center text-[var(--edu-logo-blue)]">
                    <Bell size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-[var(--edu-text-main)] tracking-tight">Notificaciones</h1>
                    <p className="text-[12px] text-[var(--edu-text-muted)] font-medium">Avisos importantes del sistema y del administrador.</p>
                </div>
            </div>

            <div className="space-y-4">
                {notifications.map(notif => (
                    <div key={notif.id} className="p-6 bg-[var(--edu-bg-card)] border border-[var(--edu-border)] rounded-[2rem] shadow-sm hover:shadow-xl transition-all flex gap-5 items-start">
                        <div className={`p-3 rounded-xl bg-[var(--edu-bg)]/50`}>
                            {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 space-y-2">
                            <p className="text-sm font-bold text-[var(--edu-text-main)] leading-relaxed">
                                {notif.text}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-[var(--edu-text-muted)] font-bold uppercase tracking-widest opacity-60">
                                <Clock size={12} />
                                {new Date(notif.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NotificationsSection;
