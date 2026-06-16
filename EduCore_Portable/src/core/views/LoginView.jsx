import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import EduCreaLogo from '../components/common/EduCreaLogo.jsx';
import ThemeToggle from '../components/common/ThemeToggle.jsx';
import { Mail, Calendar, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { sendWelcomeEmail } from '../services/emailService';
import { db } from '../services/databaseService';

const LoginView = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, theme, getPeruDate, setIsAuthenticated, setUser } = useAuth();
    const navigate = useNavigate();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        try {
            const result = await login(email, password);
            if (result?.success) {
                const role = result.user?.role;
                if (role === 'admin_general' || role === 'admin_aux') {
                    navigate('/admin');
                } else {
                    navigate('/profile');
                }
            } else {
                alert('Credenciales incorrectas. Por favor verifica tu usuario y contraseña.');
            }
        } catch (err) {
            alert('Error al conectar con el servidor: ' + err.message);
        } finally {
            setIsLoggingIn(false);
        }
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let pass = '';
        for (let i = 0; i < 6; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return pass;
    };

    const handleForgotPassword = async () => {
        if (!email) {
            alert("Por favor, escribe tu correo electrónico en el campo superior antes de recuperar la contraseña.");
            return;
        }
        
        setIsResetting(true);
        try {
            const emailLower = email.toLowerCase();
            const dbUser = await db.getUserByEmail(emailLower);
            if (!dbUser) {
                alert("⚠️ No encontramos ninguna cuenta con ese correo.");
                return;
            }

            const newPassword = generatePassword();
            const updatedUser = { ...dbUser, password: newPassword };
            
            await db.upsertUser(updatedUser);
            
            const resetTemplate = {
                subject: '🔑 Tu Nueva Contraseña de Educrea',
                body: `<p>Hola {{fullName}},</p><p>Has solicitado restablecer tu contraseña. Tu nueva clave de acceso es:</p><h2 style="color: #2E5BFF; letter-spacing: 2px;">{{password}}</h2><p>Te recomendamos iniciar sesión y cambiarla en tu perfil.</p>`,
                footer: 'El equipo de Educrea'
            };
            
            await sendWelcomeEmail(emailLower, dbUser.fullName || 'Docente', newPassword, resetTemplate, new Date().toISOString());
            
            alert(`✅ ¡Nueva contraseña enviada! \n\nRevisa la bandeja de entrada o spam de ${emailLower}.`);
        } catch (err) {
            alert("Error al restablecer contraseña: " + err.message);
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--edu-bg)] flex items-center justify-center p-6 transition-colors duration-500 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--edu-accent)]/5 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--edu-accent)]/5 rounded-full blur-[100px]"></div>

            <div className="max-w-md w-full z-10">
                <div className="bg-[var(--edu-bg-card)] rounded-[2.5rem] shadow-2xl border border-[var(--edu-border)] p-10 backdrop-blur-sm relative">
                    <div className="absolute top-6 left-6 z-50">
                        <button 
                            onClick={() => navigate('/')}
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] hover:text-[var(--edu-accent)] transition-colors"
                        >
                            <ArrowLeft size={14} /> Volver
                        </button>
                    </div>
                    <div className="absolute top-6 right-6 z-50">
                        <ThemeToggle />
                    </div>

                    <div className="text-center mb-10">
                        <EduCreaLogo className="mx-auto mb-2" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black tracking-widest text-[var(--edu-text-muted)] ml-1">Usuario / Email</label>
                            <input
                                type="text"
                                required
                                className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-main)] focus:ring-2 focus:ring-[var(--edu-accent)]/20 focus:border-[var(--edu-accent)]/50 outline-none transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Ej: pepito"
                            />
                        </div>
                        <div className="space-y-1.5 relative">
                            <div className="flex justify-between items-end">
                                <label className="text-[10px] uppercase font-black tracking-widest text-[var(--edu-text-muted)] ml-1">Contraseña</label>
                                <button 
                                    type="button" 
                                    onClick={handleForgotPassword}
                                    disabled={isResetting}
                                    className="text-[9px] font-bold text-[var(--edu-accent)] hover:underline opacity-80"
                                >
                                    {isResetting ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-[var(--edu-text-main)] focus:ring-2 focus:ring-[var(--edu-accent)]/20 focus:border-[var(--edu-accent)]/50 outline-none transition-all pr-12"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--edu-text-muted)] hover:text-[var(--edu-text-main)] transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div className="pt-2 flex flex-col gap-4">
                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="w-full bg-[var(--edu-accent)] hover:brightness-110 text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl transition-all shadow-lg active:scale-95 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoggingIn ? 'Verificando...' : 'Ingresar al Sistema'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[10px] text-[var(--edu-text-muted)] opacity-70">
                            &copy; 2026 Educrea. Potenciando la educación con IA.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
