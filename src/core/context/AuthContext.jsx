import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { db, mapFromDB } from '../services/databaseService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showIds, setShowIds] = useState(false);
    const [referrerContact, setReferrerContact] = useState({ walink: 'https://wa.me/51993125547', phone: '993125547' });
    const [theme, setTheme] = useState(() => localStorage.getItem('educrea_theme') || 'dark');

    // --- 1. UTILIDADES BÁSICAS (Primero para que estén disponibles) ---
    /**
     * Obtiene la fecha y hora REAL de Perú (UTC-5)
     * No depende de la hora local del dispositivo del usuario.
     */
    const getPeruDate = React.useCallback(() => {
        const now = new Date();
        // Peru es UTC-5
        const peruOffset = -5;
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * peruOffset));
    }, []);

    // --- 2. ESTADO GLOBAL ---
    const [globalVars, setGlobalVars] = useState({
        // --- PROPIEDADES ORIGINALES PUNTA DE LANZA ---
        META_PERIOD: '2026',
        META_INSTITUCION: 'Institución Educativa Modelo',
        META_DOCENTE: 'Nombre del Docente',
        META_ESTUDIANTES: '0',
        META_DRE: '--',
        META_UGEL: '--',
        META_DIRECTOR: '--',
        META_LEVEL: 'Primaria',
        META_GRADE: '1',
        META_AREA: '',
        META_CICLO: '--',
        META_SECCION: '--',
        META_CALENDARS: {},
        META_METODOLOGIA_ABP: false,
        META_EDITORIAL: 'CNEB Libre',
        META_ENFOQUES_PRIORITARIOS: [],
        META_HITOS: [],
        
        // --- PROPIEDADES CORE EDUCREA ---
        META_PROJECT: 'EduCrea',
        META_USERS: [],
        META_TUTORIALS: [],
        META_EMAIL_CONFIG: {
            current: 'welcome',
            welcome: { subject: '🚀 ¡Bienvenido!', body: 'Bienvenido...', footer: 'EduCrea' },
            trial: { subject: '🎁 Prueba', body: 'Tu prueba...', footer: 'EduCrea' }
        }
    });

    const logout = React.useCallback(() => {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('edu_auth_token');
        sessionStorage.removeItem('edu_auth_raw_pwd');
    }, []);

    const updateUser = React.useCallback(async (newData) => {
        const updatedUser = { ...user, ...newData };
        setUser(updatedUser);
        
        // Si se cambió la contraseña, actualizamos sessionStorage
        if (newData.password) {
            sessionStorage.setItem('edu_auth_raw_pwd', newData.password);
        }
        
        try {
            // Persistencia inmediata en base de datos (Pasamos credenciales para la ventanilla segura)
            await db.upsertUser(updatedUser, user?.email, user?.password);
            
            // Si el usuario está en la lista global (META_USERS), también lo actualizamos allí
            if (globalVars.META_USERS?.length > 0) {
                const updatedMeta = globalVars.META_USERS.map(u => u.id === updatedUser.id ? updatedUser : u);
                setGlobalVars(prev => ({ ...prev, META_USERS: updatedMeta }));
            }
        } catch (err) {
            console.error("Error al persistir usuario:", err.message);
            throw err; // Re-lanzamos para que la UI sepa que falló
        }
    }, [user, globalVars.META_USERS]);

    const toggleTheme = React.useCallback(() => setTheme(prev => prev === 'light' ? 'dark' : 'light'), []);
    const toggleShowIds = React.useCallback(() => setShowIds(prev => !prev), []);

    // --- 3. LÓGICA DE NEGOCIO ---
    const login = React.useCallback(async (identifier, password) => {
        try {
            const idLower = identifier.toLowerCase();
            
            // 1. Caso Especial: Super Admin Local (Failsafe)
            // 1. Caso Especial: Eliminado por seguridad (Ya no es necesario)
            
            // 2. Consulta Real a Supabase
            const dbUser = await db.getUserByCredentials(identifier, password);
            
            if (dbUser) {
                // Guardamos el password raw TEMPORALMENTE en el estado para las ventanillas RPC
                const sessionUser = { ...dbUser, password: password };
                setUser(sessionUser); setIsAuthenticated(true);
                localStorage.setItem('edu_auth_token', dbUser.id);
                sessionStorage.setItem('edu_auth_raw_pwd', password);

                // Si es admin, cargamos la lista completa de usuarios (vía segura)
                if (dbUser.role?.includes('admin')) {
                    const allUsers = await db.fetchUsers(dbUser.email, dbUser.password);
                    setGlobalVars(prev => ({ ...prev, META_USERS: allUsers }));
                }

                // Cargar contacto del referente (dinámico)
                const creatorId = dbUser.createdBy || 'admin_1';
                const contact = await db.getFullContact(creatorId);
                if (contact) setReferrerContact(contact);

                // AUDITORÍA: Sensor de inicio de sesión silencioso
                db.logActivity(dbUser.id, 'LOGIN_SUCCESS', {
                    device: navigator.userAgent.includes('Mobi') ? 'Mobile' : 'Desktop',
                    userAgent: navigator.userAgent,
                    screen: `${window.innerWidth}x${window.innerHeight}`
                });
                
                return { success: true, user: dbUser };
            }
            return { success: false };
        } catch (err) {
            console.error("Login Error:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const updateGlobalVars = React.useCallback(async (newVars) => {
        // 1. Actualización inmediata del estado local para fluidez de la UI
        setGlobalVars(prev => ({ ...prev, ...newVars }));
        
        // 2. Persistencia Inteligente (Sync) segura
        try {
            if (newVars.META_USERS) {
                // Usamos el nuevo método de bulk upsert seguro
                await db.upsertUsers(newVars.META_USERS, user?.email, user?.password);
            }
            if (newVars.META_TUTORIALS) await db.updateSetting('tutorials', newVars.META_TUTORIALS, user?.email, user?.password);
            if (newVars.META_EMAIL_CONFIG) await db.updateSetting('email_config', newVars.META_EMAIL_CONFIG, user?.email, user?.password);
            if (newVars.TRIAL_REQUESTS) await db.updateSetting('trial_requests', newVars.TRIAL_REQUESTS, user?.email, user?.password);
            
            return { success: true };
        } catch (err) {
            console.error("❌ Sync Error:", err.message);
            throw err;
        }
    }, [user]); // Agregamos user a las dependencias

    // --- 4. EFECTOS Y CARGA INICIAL ---
    useEffect(() => {
        localStorage.setItem('educrea_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        const bootstrap = async () => {
            setIsLoading(true);
            try {
                // 1. Cargamos solo configuraciones del sistema (Rápido)
                const settings = await db.fetchSettings();
                setGlobalVars(prev => ({ ...prev, ...settings }));

                // 2. Verificamos Sesión Existente
                const savedToken = localStorage.getItem('edu_auth_token');
                if (savedToken) {
                    // Si es el admin master
                    if (savedToken === 'admin_1') {
                        // El admin master ya no usa bypass local. Redirigimos a login si no hay sesión activa.
                        localStorage.removeItem('edu_auth_token');
                    } else {
                        // Buscamos al usuario por ID para refrescar sus datos
                        const { data } = supabase ? await supabase.from('users').select('*').eq('id', savedToken).maybeSingle() : { data: null };
                        if (data) {
                            const dbUser = mapFromDB(data);
                            // Restauramos el password raw desde sessionStorage si existe
                            const rawPwd = sessionStorage.getItem('edu_auth_raw_pwd');
                            const sessionUser = { ...dbUser, password: rawPwd || dbUser.password };
                            
                            setUser(sessionUser); setIsAuthenticated(true);
                            if (dbUser.role?.includes('admin')) {
                                const users = await db.fetchUsers(dbUser.email, sessionUser.password);
                                setGlobalVars(prev => ({ ...prev, META_USERS: users }));
                            }

                            // Cargar contacto del referente (dinámico)
                            const creatorId = dbUser.createdBy || 'admin_1';
                            const contact = await db.getFullContact(creatorId);
                            if (contact) setReferrerContact(contact);
                        }
                    }
                }
            } catch (err) { 
                console.error("Bootstrap Error:", err.message);
            } finally { 
                setIsLoading(false); 
            }
        };
        bootstrap();
    }, []);

    const contextValue = React.useMemo(() => ({ 
        isAuthenticated, setIsAuthenticated, user, setUser, 
        login, logout, updateUser,
        globalVars, updateGlobalVars, 
        showIds, toggleShowIds,
        referrerContact,
        theme, toggleTheme,
        getPeruDate
    }), [
        isAuthenticated, user, login, logout, updateUser,
        globalVars, updateGlobalVars, 
        showIds, toggleShowIds,
        theme, toggleTheme,
        getPeruDate
    ]);

    return (
        <AuthContext.Provider value={contextValue}>
            {isLoading ? (
                <div style={{ 
                    height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#0f172a', color: 'white', fontFamily: 'sans-serif'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                            width: '40px', height: '40px', border: '3px solid #3b82f6', 
                            borderTopColor: 'transparent', borderRadius: '50%', 
                            animation: 'spin 1s linear infinite', margin: '0 auto 15px'
                        }}></div>
                        <p style={{ fontSize: '14px', opacity: 0.8 }}>Conectando con Mente Activa</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
