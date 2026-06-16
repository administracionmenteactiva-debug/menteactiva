import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { User, Camera, Mail, Shield, Check } from 'lucide-react';

const AccountSection = () => {
    const { user, updateUser } = useAuth();
    const isAdmin = user?.role === 'admin_general' || user?.role === 'admin_aux' || user?.role === 'admin';

    const formatDate = (isoString) => {
        if (!isoString) return '--/--/----';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('es-PE', { 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            });
        } catch(e) { return '--/--/----'; }
    };

    const [formData, setFormData] = useState({
        fullName: user?.fullName || 'Pepito Pérez',
        age: user?.age || 28,
        email: user?.email || 'pepito@educrea.com',
        dre: user?.dre || '',
        ugel: user?.ugel || '',
        ie: user?.ie || '',
        director: user?.director || '',
        whatsappVentas: user?.whatsappVentas || '',
        walink: user?.walink || '',
        phoneNumber: user?.phoneNumber || ''
    });
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        try {
            await updateUser(formData);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            alert("❌ Error al guardar los cambios: " + error.message);
        }
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto pb-10">
            {/* HEADER DE PERFIL */}
            <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start bg-[var(--edu-bg-card)] p-8 rounded-[2.5rem] border border-[var(--edu-border)] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--edu-logo-blue)]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                
                {/* Avatar */}
                <div className="flex-shrink-0 space-y-3">
                    <div className="w-32 h-32 md:w-36 md:h-36 rounded-[2rem] bg-gradient-to-br from-[var(--edu-logo-blue)] to-[var(--edu-logo-green)] shadow-xl relative overflow-hidden flex items-center justify-center border-4 border-[var(--edu-bg)]">
                        <span className="text-[60px] md:text-[70px] font-black text-white drop-shadow-md relative z-10" style={{ textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                            {(user?.fullName || user?.email || 'U').charAt(0).toUpperCase()}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                    </div>
                </div>

                {/* Título y Resumen */}
                <div className="flex-1 text-center sm:text-left mt-2 md:mt-1 z-10 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                        <div className="flex items-center justify-center sm:justify-start gap-3">
                            <h1 className="text-3xl font-black text-[var(--edu-text-main)] tracking-tight">Mi Perfil</h1>
                        </div>
                        
                        {/* Botón Guardar Superior (Opcional para acceso rápido) */}
                        <div className="hidden sm:flex">
                            <button 
                                onClick={handleSave}
                                disabled={saved}
                                className={`px-6 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center gap-2 shadow-lg ${
                                    saved 
                                        ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                                        : "bg-[var(--edu-accent)] hover:bg-[var(--edu-accent)]/90 text-white hover:scale-105 active:scale-95 shadow-[var(--edu-accent)]/20"
                                }`}
                            >
                                {saved ? <Check size={14} /> : <User size={14} />}
                                {saved ? "Guardado" : "Guardar Perfil"}
                            </button>
                        </div>
                    </div>
                    
                    <p className="text-[12px] text-[var(--edu-text-muted)] font-medium max-w-md mx-auto sm:mx-0 mb-4">
                        Gestiona tu identidad, datos educativos y seguridad en el sistema para personalizar tus documentos.
                    </p>

                    {/* Suscripción en el Header */}
                    {!isAdmin && (
                        <div className="flex flex-col gap-2 mt-4 bg-[var(--edu-bg)]/50 p-4 rounded-2xl border border-[var(--edu-border)]/50">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                    Suscripción Activa
                                </span>
                                <span className="text-[10px] font-bold text-[var(--edu-text-muted)]">
                                    Vence: {formatDate(user?.subscription?.end)}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] opacity-70">Niveles:</span>
                                {(user?.allowedLevels?.length > 0 ? user.allowedLevels : ['Todos']).map((level, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-[var(--edu-bg-card)] text-[var(--edu-logo-blue)] rounded-md text-[10px] font-bold border border-[var(--edu-logo-blue)]/20">
                                        {level}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-8">
                
                {/* Tarjeta: Información Personal */}
                <div className="bg-[var(--edu-bg-card)] p-8 rounded-[2rem] border border-[var(--edu-border)] shadow-sm space-y-6 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-[14px] font-black uppercase tracking-widest text-[var(--edu-text-main)]">Datos Personales</h2>
                    </div>
                    <div className="space-y-5 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] ml-1">Nombre Completo</label>
                            <input 
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-main)] focus:ring-2 focus:ring-[var(--edu-accent)]/20 focus:border-[var(--edu-accent)]/50 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] ml-1">Edad</label>
                                <input 
                                    type="number"
                                    value={formData.age}
                                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                                    className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-main)] focus:ring-2 focus:ring-[var(--edu-accent)]/20 focus:border-[var(--edu-accent)]/50 outline-none transition-all shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] ml-1">Teléfono</label>
                                <input 
                                    type="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                    placeholder="Ej: 999888777"
                                    className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-main)] focus:ring-2 focus:ring-[var(--edu-accent)]/20 focus:border-[var(--edu-accent)]/50 outline-none transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {!isAdmin && (
                    <>
                        {/* Tarjeta: Datos Educativos */}
                        <div className="bg-[var(--edu-bg-card)] p-8 rounded-[2rem] border border-[var(--edu-border)] shadow-sm space-y-6 relative">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-[14px] font-black uppercase tracking-widest text-[var(--edu-text-main)]">Datos Educativos</h2>
                            </div>
                            <p className="text-[11px] text-[var(--edu-text-muted)] font-medium -mt-4 mb-4">
                                Estos datos se autocompletarán en tus generadores de documentos.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] ml-1">DRE</label>
                                    <input 
                                        type="text"
                                        value={formData.dre}
                                        onChange={(e) => setFormData({...formData, dre: e.target.value})}
                                        placeholder="Ej: Lima Metropolitana"
                                        className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-main)] focus:ring-2 focus:ring-[var(--edu-accent)]/20 focus:border-[var(--edu-accent)]/50 outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] ml-1">UGEL</label>
                                    <input 
                                        type="text"
                                        value={formData.ugel}
                                        onChange={(e) => setFormData({...formData, ugel: e.target.value})}
                                        placeholder="Ej: 01 San Juan"
                                        className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-main)] focus:ring-2 focus:ring-[var(--edu-accent)]/20 focus:border-[var(--edu-accent)]/50 outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] ml-1">Institución Educativa</label>
                                    <input 
                                        type="text"
                                        value={formData.ie}
                                        onChange={(e) => setFormData({...formData, ie: e.target.value})}
                                        placeholder="Nombre de tu I.E."
                                        className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-main)] focus:ring-2 focus:ring-[var(--edu-accent)]/20 focus:border-[var(--edu-accent)]/50 outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] ml-1">Nombre del Director(a)</label>
                                    <input 
                                        type="text"
                                        value={formData.director}
                                        onChange={(e) => setFormData({...formData, director: e.target.value})}
                                        placeholder="Lic. Nombre Apellido"
                                        className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-main)] focus:ring-2 focus:ring-[var(--edu-accent)]/20 focus:border-[var(--edu-accent)]/50 outline-none transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Tarjeta: Seguridad */}
                <div className="bg-[var(--edu-bg-card)] p-8 rounded-[2rem] border border-[var(--edu-border)] shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield size={18} className="text-[var(--edu-text-muted)]" />
                        <h2 className="text-[14px] font-black uppercase tracking-widest text-[var(--edu-text-main)]">Seguridad</h2>
                    </div>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] ml-1">Email Registrado</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--edu-text-muted)] opacity-50" />
                                <input 
                                    type="email"
                                    value={formData.email}
                                    readOnly
                                    className="w-full pl-12 pr-5 py-4 bg-[var(--edu-bg)]/50 border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-muted)] cursor-not-allowed outline-none font-medium"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] ml-1">Contraseña</label>
                            <div className="relative flex flex-col sm:flex-row gap-3">
                                <input 
                                    type="password"
                                    readOnly
                                    value="••••••••"
                                    className="w-full px-5 py-4 bg-[var(--edu-bg)]/50 border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-muted)] opacity-70 outline-none cursor-not-allowed tracking-[0.3em] font-black"
                                />
                                <button
                                    onClick={() => {
                                        const newPwd = window.prompt("🔑 CAMBIAR CONTRASEÑA:\n\nEscribe tu nueva contraseña. Se actualizará inmediatamente en el sistema.");
                                        if (newPwd && newPwd.trim() !== "") {
                                            updateUser({ password: newPwd.trim() });
                                            alert("✅ Contraseña actualizada correctamente.");
                                        }
                                    }}
                                    className="w-full sm:w-auto px-8 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] hover:border-[var(--edu-accent)] text-[var(--edu-text-main)] rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap active:scale-95"
                                >
                                    Cambiar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                
                {isAdmin && (
                    <div className="bg-[var(--edu-bg-card)] p-8 rounded-[2rem] border border-[var(--edu-border)] shadow-sm space-y-6">
                        <h2 className="text-[14px] font-black uppercase tracking-widest text-emerald-500 mb-2">Configuración Admin</h2>
                        
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] ml-1">WhatsApp de Ventas</label>
                                <div className="relative">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-[10px] tracking-tight">+51</div>
                                    <input 
                                        type="text"
                                        value={formData.whatsappVentas || ''}
                                        onChange={(e) => setFormData({...formData, whatsappVentas: e.target.value})}
                                        placeholder="999888777"
                                        className="w-full pl-14 pr-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-main)] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all shadow-sm font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] ml-1">Enlace Directo WhatsApp (Wa.link)</label>
                                <input 
                                    type="text"
                                    value={formData.walink || ''}
                                    onChange={(e) => setFormData({...formData, walink: e.target.value})}
                                    placeholder="https://wa.link/xxxxxx"
                                    className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-main)] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all shadow-sm font-medium"
                                />
                            </div>

                            {/* Enlace de Invitación para Compartir */}
                            <div className="bg-[var(--edu-accent)]/5 border border-[var(--edu-accent)]/20 p-6 rounded-3xl mt-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-accent)]">Enlace de Invitación</label>
                                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                                    <input 
                                        type="text"
                                        readOnly
                                        value={`${window.location.origin}/?ref=${user?.username || user?.id}`}
                                        className="flex-1 px-4 py-3 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-xl text-[var(--edu-text-main)] font-mono text-[10px] outline-none select-all"
                                    />
                                    <button 
                                        onClick={() => {
                                            const link = `${window.location.origin}/?ref=${user?.username || user?.id}`;
                                            navigator.clipboard.writeText(link);
                                            alert("✅ ¡Enlace copiado! Ya puedes pegarlo en WhatsApp.");
                                        }}
                                        className="px-6 py-3 bg-[var(--edu-accent)] hover:bg-[var(--edu-accent)]/90 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                                    >
                                        Copiar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Botón Guardar Inferior */}
            <div className="flex justify-center mt-10">
                <button 
                    onClick={handleSave}
                    disabled={saved}
                    className={`w-full sm:w-auto sm:px-16 py-4 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[12px] transition-all flex items-center justify-center gap-3 shadow-lg ${
                        saved 
                            ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                            : "bg-[var(--edu-accent)] hover:bg-[var(--edu-accent)]/90 text-white hover:scale-105 active:scale-95 shadow-[var(--edu-accent)]/20"
                    }`}
                >
                    {saved ? <Check size={18} /> : <User size={18} />}
                    {saved ? "Guardado Correctamente" : "Guardar Cambios"}
                </button>
            </div>
        </div>
    );
};

export default AccountSection;
