import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import MenteActivaLogo from '../components/common/MenteActivaLogo.jsx';
import ThemeToggle from '../components/common/ThemeToggle.jsx';
import { LayoutDashboard, Calendar, User, Folder, LogOut, ChevronRight, ChevronLeft, Shield, ListChecks, Check, Trash2, Video, Play, Users, Clock, Mail, Info, CreditCard, X, FileSearch, Sparkles, Monitor, Smartphone, ChevronDown, ChevronUp, Menu, Copy } from 'lucide-react';
import { sendWelcomeEmail } from '../services/emailService';
import { db } from '../services/databaseService';

const AreaChip = ({ area, selected, onToggle }) => (
    <label className={`px-2.5 py-1 rounded-full border text-[9px] font-bold cursor-pointer transition-all active:scale-95 ${
        selected
        ? 'bg-[var(--edu-logo-blue)] border-[var(--edu-logo-blue)] text-white shadow-md shadow-[var(--edu-logo-blue)]/20'
        : 'bg-white/5 border-[var(--edu-border)] text-[var(--edu-text-muted)] hover:border-[var(--edu-logo-blue)]/50'
    }`}>
        <input 
            type="checkbox"
            className="hidden"
            checked={selected}
            onChange={onToggle}
        />
        {area}
    </label>
);

const AdminView = () => {
    const { globalVars, logout, updateGlobalVars, user, getPeruDate } = useAuth();
    const navigate = useNavigate();
    const [activeModule, setActiveModule] = React.useState('DASHBOARD');
    const [showCreateForm, setShowCreateForm] = React.useState(false);
    const [visiblePasswords, setVisiblePasswords] = React.useState({});
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    // Función para copiar credenciales formateadas para WhatsApp
    const handleCopyCredentials = (email, password) => {
        const domain = window.location.origin;
        const text = `✨ *ACCESO EDUCREA* ✨\n\nAquí tienes tus accesos a la plataforma:\n\n📧 *Usuario:* ${email}\n🔑 *Contraseña:* ${password}\n\n💻 *Ingresa aquí:* ${domain}`;
        
        navigator.clipboard.writeText(text)
            .then(() => {
                alert("✅ ¡Copiado al portapapeles! Listo para pegar en WhatsApp.");
            })
            .catch(err => {
                console.error("Error al copiar:", err);
                alert("❌ No se pudo copiar automáticamente. Por favor copia manualmente:\n\nUsuario: " + email + "\nClave: " + password);
            });
    };

    // Estados para Medición de Rendimiento de Creadores (Suscripciones Reales)
    const [perfTimeframe, setPerfTimeframe] = React.useState('diario');
    const [perfDate, setPerfDate] = React.useState(() => {
        const pDate = getPeruDate();
        const y = pDate.getFullYear();
        const m = String(pDate.getMonth() + 1).padStart(2, '0');
        const d = String(pDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    });
    const [perfWeekOffset, setPerfWeekOffset] = React.useState(0);
    const [perfMonthOffset, setPerfMonthOffset] = React.useState(0);
    const [expandedCreator, setExpandedCreator] = React.useState(null);

    // Función para formatear fecha local de Perú para inputs (YYYY-MM-DDTHH:mm)
    const formatPeruLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    const [planModalUser, setPlanModalUser] = React.useState(null);
    const [newPlan, setNewPlan] = React.useState('mensual');
    const [modalLevels, setModalLevels] = React.useState([]);
    const [modalAreas, setModalAreas] = React.useState([]);
    const [modalScheduledTime, setModalScheduledTime] = React.useState('');

    const openPlanModal = (u) => {
        setPlanModalUser(u);
        setNewPlan(u.plan || 'mensual');
        setModalLevels(u.allowedLevels || ['Primaria', 'Secundaria']);
        setModalAreas(u.allowedAreas || []);
        setModalScheduledTime(u.scheduledTime || formatPeruLocal(getPeruDate()));
    };
    
    // Estados para Auditoría (Punto 3)
    const [logs, setLogs] = React.useState([]);
    const [loadingLogs, setLoadingLogs] = React.useState(false);
    const [auditSearch, setAuditSearch] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false); // Bloqueo de sincronización
    const [isSavingTutorials, setIsSavingTutorials] = React.useState(false);

    // Función para sincronizar logs manualmente
    const handleSyncLogs = async () => {
        setLoadingLogs(true);
        try {
            const data = await db.fetchLogs();
            setLogs(data);
        } catch (err) {
            console.error("Error logs:", err);
            alert("Error al cargar logs: " + err.message);
        } finally {
            setLoadingLogs(false);
        }
    };

    // Función para limpiar logs antiguos (Hallazgo #X)
    const handleClearLogs = async () => {
        if (window.confirm("🗑️ ¿ESTÁS SEGURO?\nSe eliminarán permanentemente todos los registros de actividad con más de 90 días de antigüedad.\n\nEsta acción no se puede deshacer.")) {
            setLoadingLogs(true);
            try {
                await db.deleteOldLogs(90, user?.email, user?.password);
                alert("✅ Historial antiguo limpiado con éxito.");
                await handleSyncLogs();
            } catch (err) {
                console.error("Error clearing logs:", err);
                alert("Error al limpiar logs: " + err.message);
            } finally {
                setLoadingLogs(false);
            }
        }
    };

    // Eliminamos la carga automática para respetar la solicitud del usuario
    React.useEffect(() => {
        // No cargamos automáticamente al entrar
    }, [activeModule]);

    // Reloj en tiempo real y Auto-Sync (Hallazgo #1: Mantener panel fresco)
    const [currentTime, setCurrentTime] = React.useState(getPeruDate());
    React.useEffect(() => {
        const timer = setInterval(() => {
            const now = getPeruDate();
            setCurrentTime(now);
            
            // Auto-sincronizar cada minuto (en el segundo 0)
            // SOLO si no estamos guardando nada en este momento
            if (now.getSeconds() === 0 && !isSaving) {
                db.fetchUsers(user?.email, user?.password).then(users => updateGlobalVars({ META_USERS: users }));
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [updateGlobalVars, isSaving]);

    const [newUser, setNewUser] = React.useState({
        email: '',
        fullName: 'Docente',
        phoneNumber: '',
        role: 'user',
        plan: 'prueba',
        days: 1,
        scheduledTime: '',
        whatsappVentas: '',
        walink: '',
        allowedLevels: ['Primaria', 'Secundaria'],
        allowedAreas: []
    });

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.fullName) {
            alert("Por favor completa el nombre y email.");
            return;
        }

        const start = getPeruDate();
        let end = '';
        let finalDays = parseInt(newUser.days) || 30;

        if (newUser.plan === 'prueba') {
            finalDays = 1;
        } else if (newUser.plan === 'mensual') {
            finalDays = 30;
        } else if (newUser.plan === 'bimestral') {
            finalDays = 60;
        }

        const futureDate = getPeruDate();
        futureDate.setDate(futureDate.getDate() + finalDays);
        end = futureDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD

        // Generar contraseña aleatoria de 6 dígitos
        const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();

        const newUserObj = {
            id: 'u_' + Date.now(),
            email: newUser.email,
            fullName: newUser.fullName,
            phoneNumber: newUser.phoneNumber || '',
            password: generatedPassword,
            role: newUser.role,
            plan: newUser.plan,
            scheduledTime: (newUser.plan === 'prueba' && !newUser.scheduledTime) ? getPeruDate().toISOString() : newUser.scheduledTime,
            trialStartTime: newUser.plan === 'prueba' ? getPeruDate().toISOString() : null,
            createdBy: user.username || user.id || user.email,
            createdAt: getPeruDate().toISOString(),
            whatsappVentas: newUser.whatsappVentas || '',
            walink: newUser.walink || '',
            downloadsCount: 0,
            allowedLevels: newUser.allowedLevels,
            allowedAreas: newUser.allowedAreas,
            subscription: { 
                start: start.toISOString(), 
                end: end 
            }
        };

        // Guardar en la base de datos con manejo ATÓMICO (Punto 1: Robustez)
        setIsSaving(true);
        try {
            // 1. Guardado real en Supabase primero (vía segura)
            await db.upsertUser(newUserObj, user?.email, user?.password);

            // 2. Si tiene éxito, actualizamos la memoria local (esto gatilla la UI)
            await updateGlobalVars({ META_USERS: [...(globalVars.META_USERS || []), newUserObj] });

            // 3. Enviar Correo
            const template = newUser.plan === 'prueba' ? globalVars.META_EMAIL_CONFIG.trial : globalVars.META_EMAIL_CONFIG.welcome;
            const emailRes = await sendWelcomeEmail(newUser.email, newUser.fullName, generatedPassword, template, newUserObj.scheduledTime);
            
            // Auto-copiar credenciales al portapapeles para WhatsApp
            const domain = window.location.origin;
            const textToCopy = `✨ *ACCESO EDUCREA* ✨\n\nAquí tienes tus accesos a la plataforma:\n\n📧 *Usuario:* ${newUser.email}\n🔑 *Contraseña:* ${generatedPassword}\n\n💻 *Ingresa aquí:* ${domain}`;
            
            try {
                await navigator.clipboard.writeText(textToCopy);
                if (emailRes.success) {
                    alert("✅ ¡PERFECTO! Usuario creado con éxito y credenciales COPIADAS al portapapeles para WhatsApp.");
                } else {
                    alert("⚠️ ALERTA: Usuario guardado y credenciales COPIADAS, pero EL CORREO FALLÓ. Por favor re-envíalo manualmente.");
                }
            } catch (err) {
                console.error("Error auto-copying credentials:", err);
                if (emailRes.success) {
                    alert("✅ ¡PERFECTO! Usuario creado y correo enviado correctamente.");
                } else {
                    alert("⚠️ ALERTA: El usuario se guardó en la nube, pero EL CORREO FALLÓ. Por favor, re-envíalo manualmente.");
                }
            }
            
            setNewUser({ email: '', fullName: 'Docente', role: 'user', plan: 'mensual', days: 30, scheduledTime: '', whatsappVentas: '', walink: '', allowedLevels: ['Primaria', 'Secundaria'], allowedAreas: [] });
            setShowCreateForm(false);
        } catch (err) {
            console.error("❌ ERROR CRÍTICO AL CREAR USUARIO:", err);
            alert("❌ ERROR: No se pudo guardar el usuario.\n\nDetalle Técnico: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        const u = globalVars.META_USERS.find(user => user.id === userId);
        if (!u) return;
        if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la cuenta de ${u.fullName}?`)) {
            try {
                // 1. Borrado Real en Supabase (Hallazgo #5)
                await db.deleteUser(userId, user?.email, user?.password);
                
                // 2. Actualización en memoria
                const updatedUsers = globalVars.META_USERS.filter(user => user.id !== userId);
                const updatedRequests = (globalVars.TRIAL_REQUESTS || []).filter(r => r.email.toLowerCase() !== u.email.toLowerCase());
                
                updateGlobalVars({ 
                    META_USERS: updatedUsers,
                    TRIAL_REQUESTS: updatedRequests 
                });
                
                alert("✅ Usuario eliminado definitivamente.");
            } catch (err) {
                alert("❌ Error al borrar de la base de datos: " + err.message);
            }
        }
    };

    const handleEditSubscription = (u) => {
        if (u.plan === 'prueba') {
            const current = u.scheduledTime || "";
            const newTime = window.prompt("📅 PROGRAMAR CITA\nIngrese nueva fecha y hora (Formato: AAAA-MM-DD HH:MM)\nEjemplo: 2026-05-15 14:30", current.replace('T', ' '));
            
            if (newTime && newTime.trim() !== "") {
                const isoTime = newTime.trim().replace(' ', 'T');
                const updatedUsers = globalVars.META_USERS.map(user => 
                    user.id === u.id ? { ...user, scheduledTime: isoTime } : user
                );
                updateGlobalVars({ META_USERS: updatedUsers });
            }
        } else {
            const currentEnd = u.subscription?.end || "";
            const newEnd = window.prompt("💳 ACTUALIZAR VENCIMIENTO\nIngrese la nueva fecha de vencimiento (Formato: AAAA-MM-DD)\nEjemplo: 2026-08-20", currentEnd);
            
            if (newEnd && newEnd.trim() !== "") {
                const updatedUsers = globalVars.META_USERS.map(user => 
                    user.id === u.id ? { ...user, subscription: { ...user.subscription, end: newEnd.trim() } } : user
                );
                updateGlobalVars({ META_USERS: updatedUsers });
            }
        }
    };

    const stats = React.useMemo(() => {
        const users = globalVars.META_USERS || [];
        const today = new Date();
        
        const activeUsers = users.filter(u => {
            if (u.plan === 'prueba') return false;
            if (!u.subscription?.end) return false;
            // Manejar formato DD/MM/AAAA o ISO
            let endStr = u.subscription.end;
            // No necesitamos convertir, ya viene en ISO YYYY-MM-DD
            const end = new Date(endStr);
            return end > today;
        }).length;

        const expiringSoon = users.filter(u => {
            if (u.plan === 'prueba') return false;
            if (!u.subscription?.end) return false;
            const end = new Date(u.subscription.end);
            const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diff > 0 && diff <= 30;
        }).length;

        const totalDocs = users.reduce((acc, curr) => acc + (curr.downloadsCount || 0), 0);
        const totalTrials = users.filter(u => u.plan === 'prueba').length;

        // Estadísticas de Referidos
        const trialsByCreator = {};
        users.filter(u => u.plan === 'prueba').forEach(u => {
            const creator = u.createdBy || 'Sistema';
            trialsByCreator[creator] = (trialsByCreator[creator] || 0) + 1;
        });

        return { activeUsers, expiringSoon, totalDocs, totalTrials, trialsByCreator };
    }, [globalVars.META_USERS]);

    const creatorSubscriptionStats = React.useMemo(() => {
        const users = globalVars.META_USERS || [];
        const baseDate = getPeruDate();

        // 1. Filtrar solo cuentas de suscripción real (diferentes a 'prueba')
        const realSubs = users.filter(u => u.plan && u.plan !== 'prueba' && u.createdBy);

        // 2. Determinar los límites de fecha según el timeframe seleccionado
        let startLimit = null;
        let endLimit = null;
        let periodLabel = '';

        if (perfTimeframe === 'diario') {
            const [y, m, d] = perfDate.split('-').map(Number);
            const targetDateStart = new Date(y, m - 1, d, 0, 0, 0);
            const targetDateEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
            
            startLimit = targetDateStart;
            endLimit = targetDateEnd;

            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            periodLabel = targetDateStart.toLocaleDateString('es-PE', options);
            periodLabel = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
        } else if (perfTimeframe === 'semanal') {
            const currentDayOfWeek = baseDate.getDay();
            const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
            
            const startOfWeek = new Date(baseDate);
            startOfWeek.setDate(baseDate.getDate() + distanceToMonday + (perfWeekOffset * 7));
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            startLimit = startOfWeek;
            endLimit = endOfWeek;

            const startStr = startOfWeek.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
            const endStr = endOfWeek.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            periodLabel = `Semana del ${startStr} al ${endStr}`;
            if (perfWeekOffset === 0) periodLabel += ' (Esta Semana)';
            else if (perfWeekOffset === -1) periodLabel += ' (Semana Anterior)';
        } else if (perfTimeframe === 'mensual') {
            const targetMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + perfMonthOffset, 1);
            
            const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1, 0, 0, 0);
            const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);

            startLimit = startOfMonth;
            endLimit = endOfMonth;

            periodLabel = targetMonth.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
            periodLabel = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
            if (perfMonthOffset === 0) periodLabel += ' (Este Mes)';
            else if (perfMonthOffset === -1) periodLabel += ' (Mes Anterior)';
        }

        // 3. Filtrar usuarios en el rango
        const filteredSubs = realSubs.filter(u => {
            const createDateStr = u.createdAt || u.subscription?.start;
            if (!createDateStr) return false;
            
            const createDate = new Date(createDateStr);
            return createDate >= startLimit && createDate <= endLimit;
        });

        // 4. Agrupar por creador
        const subsByCreator = {};
        filteredSubs.forEach(u => {
            const creator = u.createdBy || 'Sistema';
            if (!subsByCreator[creator]) {
                subsByCreator[creator] = {
                    count: 0,
                    users: []
                };
            }
            subsByCreator[creator].count += 1;
            subsByCreator[creator].users.push(u);
        });

        return {
            subsByCreator,
            totalPeriodCount: filteredSubs.length,
            periodLabel
        };
    }, [globalVars.META_USERS, perfTimeframe, perfDate, perfWeekOffset, perfMonthOffset, getPeruDate]);

    const isGeneral = user?.role === 'admin_general';
    const isAux = user?.role === 'admin_aux';

    const adminSections = React.useMemo(() => {
        const sections = [
            { id: 'DASHBOARD', label: 'Tablero', icon: <LayoutDashboard size={18} />, desc: 'Resumen del sistema', color: 'var(--edu-logo-blue)' },
            { id: 'ACCOUNTS', label: 'Cuentas', icon: <Users size={18} />, desc: 'Accesos y Suscripciones', color: 'var(--edu-logo-blue)' },
            { id: 'PROFILE', label: 'Mi Perfil', icon: <User size={18} />, desc: 'Ver y editar mis datos', color: '#ec4899', action: () => navigate('/profile') }
        ];

        // Admin General y Aux pueden ver Tutoriales y Auditoría
        if (isGeneral || isAux) {
            sections.push({ id: 'TUTORIALS', label: 'Tutoriales', icon: <Video size={18} />, desc: 'Gestionar videos', color: 'var(--edu-accent)' });
            sections.push({ id: 'AUDIT', label: 'Auditoría', icon: <FileSearch size={18} />, desc: 'Logs de actividad', color: '#10b981' });
        }

        // Tareas críticas exclusivas de Admin General
        if (isGeneral) {
            sections.push({ id: 'EMAIL', label: 'Correo', icon: <Mail size={18} />, desc: 'Configurar bienvenida', color: '#f59e0b' });
            sections.push({ id: 'BULK_IMPORT', label: 'MIGRACIÓN', icon: <Sparkles size={18} />, desc: 'Importación masiva', color: '#8b5cf6' });
        }

        return sections;
    }, [isGeneral, isAux, navigate]);

    const [currentPage, setCurrentPage] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(50);
    const [selectedUsers, setSelectedUsers] = React.useState([]);

    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleBulkEmail = async (templateId) => {
        const usersToSend = globalVars.META_USERS.filter(u => selectedUsers.includes(u.id));
        if (usersToSend.length === 0) return;

        const labels = {
            welcome: 'Bienvenida',
            expiring: 'Vencimiento',
            reactivate: 'Reactivar',
            generic: 'Aviso',
            trial: 'Prueba'
        };

        const templateLabel = labels[templateId] || templateId;
        if (!window.confirm(`¿Estás seguro de que deseas enviar la plantilla de "${templateLabel}" a ${usersToSend.length} usuarios?`)) return;

        const config = globalVars.META_EMAIL_CONFIG[templateId];
        
        // Usamos Promise.all para enviar todos los correos en paralelo
        const results = await Promise.all(usersToSend.map(u => 
            sendWelcomeEmail(u.email, u.fullName, u.password, config, u.scheduledTime)
        ));

        const successCount = results.filter(r => r.success).length;
        alert(`📧 Envío completado: ${successCount} exitosos de ${usersToSend.length} totales.`);
        setSelectedUsers([]);
    };

    // Estados para Migración Masiva
    const [bulkEmails, setBulkEmails] = React.useState('');
    const [bulkStatus, setBulkStatus] = React.useState({ total: 0, processed: 0, errors: [] });
    const [isMigrating, setIsMigrating] = React.useState(false);

    const handleBulkMigration = async () => {
        const emails = bulkEmails.split(/[\n,;]/).map(e => e.trim().toLowerCase()).filter(e => e && e.includes('@'));
        if (emails.length === 0) return alert("❌ No se encontraron correos válidos.");

        if (!window.confirm(`🚀 Vas a migrar ${emails.length} usuarios a la nueva plataforma con 1 AÑO DE ACCESO.\n\n¿Estás seguro?`)) return;

        setIsMigrating(true);
        setBulkStatus({ total: emails.length, processed: 0, errors: [] });

        const results = [];
        const newUsersList = [...(globalVars.META_USERS || [])];
        let hasChanges = false;

        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            try {
                // Verificar si ya existe en la lista que estamos construyendo
                if (newUsersList.some(u => u.email.toLowerCase() === email)) {
                    results.push({ email, status: 'skip', reason: 'Ya existe' });
                    continue;
                }

                const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();
                const start = getPeruDate();
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 365);
                const end = futureDate.toISOString().split('T')[0];

                const newUserObj = {
                    id: 'u_mig_' + Date.now() + i,
                    email: email,
                    fullName: 'Docente',
                    password: generatedPassword,
                    role: 'user',
                    plan: 'anual',
                    createdBy: user.username || user.id || user.email,
                    createdAt: getPeruDate().toISOString(),
                    downloadsCount: 0,
                    subscription: { start: start.toISOString(), end: end }
                };

                // Envío de correo (Esto sí debe ser uno por uno)
                const template = globalVars.META_EMAIL_CONFIG.welcome;
                const emailRes = await sendWelcomeEmail(email, 'Docente', generatedPassword, template);
                
                if (emailRes.success) {
                    results.push({ email, status: 'success' });
                    newUsersList.push(newUserObj);
                    hasChanges = true;
                } else {
                    results.push({ email, status: 'error', reason: 'Fallo envío correo' });
                }

            } catch (err) {
                results.push({ email, status: 'error', reason: err.message });
            }
            setBulkStatus(prev => ({ ...prev, processed: i + 1 }));
        }

        // ACTUALIZACIÓN ÚNICA AL FINAL (Para evitar saturar Supabase)
        if (hasChanges) {
            try {
                // PERSISTENCIA REAL: Guardar lote de usuarios en Supabase
                await db.upsertUsers(newUsersList, user?.email, user?.password);
                updateGlobalVars({ META_USERS: newUsersList });
            } catch (err) {
                console.error("Error persistiendo migración:", err);
                alert("⚠️ Se procesaron los correos pero hubo un error al guardar en la base de datos.");
            }
        }

        setIsMigrating(false);
        setBulkEmails('');
        
        const errors = results.filter(r => r.status !== 'success');
        let msg = `✅ PROCESO TERMINADO\n\nÉxitos: ${results.filter(r => r.status === 'success').length}\nSaltados/Errores: ${errors.length}`;
        
        if (errors.length > 0) {
            msg += "\n\nDETALLE DE NO PROCESADOS:\n";
            errors.forEach(err => {
                msg += `- ${err.email}: ${err.reason}\n`;
            });
        }
        
        alert(msg);
    };

    const [filters, setFilters] = React.useState({
        fullName: '',
        createdBy: '',
        role: 'all'
    });

    const filteredUsers = React.useMemo(() => {
        const users = globalVars.META_USERS || [];
        const nameFilter = (filters.fullName || '').trim().toLowerCase();
        const creatorFilter = (filters.createdBy || '').trim().toLowerCase();
        
        return users.filter(u => {
            // 1. Filtro de Rol según permisos
            const hasPermission = isGeneral || u.role === 'user';
            if (!hasPermission) return false;

            // 2. Filtro de Nombre/Email
            const nameMatch = !nameFilter || 
                             (u.fullName || '').toLowerCase().includes(nameFilter) || 
                             (u.email || '').toLowerCase().includes(nameFilter);

            // 3. Filtro de Creador
            const creatorMatch = !creatorFilter || 
                                (u.createdBy || 'Sistema').toLowerCase().includes(creatorFilter);

            // 4. Filtro de Rol seleccionado (Hallazgo #1: Incluimos distinción de Pruebas)
            const effectiveRole = u.plan === 'prueba' ? 'prueba' : u.role;
            let roleMatch = false;

            if (filters.role === 'all') {
                roleMatch = true;
            } else if (filters.role === 'vencidos') {
                if (u.plan !== 'prueba' && u.subscription?.end) {
                    const daysLeft = Math.ceil((new Date(u.subscription.end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    roleMatch = daysLeft <= 0;
                }
            } else if (filters.role === 'por_vencer') {
                if (u.plan !== 'prueba' && u.subscription?.end) {
                    const daysLeft = Math.ceil((new Date(u.subscription.end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    roleMatch = daysLeft > 0 && daysLeft <= 30;
                }
            } else {
                roleMatch = effectiveRole === filters.role;
            }

            return nameMatch && creatorMatch && roleMatch;
        });
    }, [globalVars.META_USERS, filters, isGeneral]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(start, start + itemsPerPage);
    }, [filteredUsers, currentPage, itemsPerPage]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const handleSaveTutorials = async () => {
        setIsSavingTutorials(true);
        try {
            await updateGlobalVars({ META_TUTORIALS: globalVars.META_TUTORIALS });
            alert("✅ TUTORIALES GUARDADOS: Los cambios se han sincronizado con la nube exitosamente.");
        } catch (err) {
            console.error("Error saving tutorials:", err);
            alert("❌ ERROR AL GUARDAR: " + err.message);
        } finally {
            setIsSavingTutorials(false);
        }
    };

    const handleSync = async () => {
        try {
            const users = await db.fetchUsers(user?.email, user?.password);
            updateGlobalVars({ META_USERS: users });
            alert(`✅ Sincronización completa: ${users.length} usuarios cargados desde Supabase.`);
        } catch (err) {
            alert(`❌ Error al sincronizar: ${err.message}`);
        }
    };

    return (
        <div className="flex h-screen bg-[var(--edu-bg)] overflow-hidden text-[var(--edu-text-main)] transition-colors duration-500 relative">
            {/* Backdrop oscuro translúcido para celulares */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Panel Lateral (Sidebar) Adaptativo */}
            <div className={`
                fixed inset-y-0 left-0 w-[290px] md:w-[320px] lg:w-1/4 lg:min-w-[320px] lg:static lg:translate-x-0 
                bg-[var(--edu-bg-sidebar)] border-r border-[var(--edu-border)] flex flex-col z-50 lg:z-20 shadow-2xl lg:shadow-xl 
                transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="h-[180px] px-6 border-b border-[var(--edu-border)] flex justify-center items-center bg-[var(--edu-bg-sidebar)]/50 backdrop-blur-md transition-all duration-500 overflow-visible relative">
                    <div onClick={() => {
                        navigate('/');
                        setIsSidebarOpen(false);
                    }} className="cursor-pointer transition-transform active:scale-95 flex justify-center items-center h-full w-full" title="Ir a Inicio">
                        <MenteActivaLogo 
                            showDetails={false} 
                            align="center" 
                            className="h-[200px] w-auto transition-all duration-300" 
                            style={{ zIndex: 50 }}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 premium-scrollbar">
                    <div className="px-2 pb-4">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] opacity-60">Panel de Administración</h2>
                    </div>

                    {adminSections.map(section => (
                        <div 
                            key={section.id}
                            id={`BTN_ADMIN_SIDEBAR_${section.id}`}
                            onClick={section.action || (() => {
                                setActiveModule(section.id);
                                setIsSidebarOpen(false);
                            })}
                            className={`group p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                                activeModule === section.id && !section.action
                                ? 'bg-[var(--edu-accent)] border-[var(--edu-accent)] shadow-lg shadow-[var(--edu-accent)]/20 text-white' 
                                : 'bg-[var(--edu-bg-card)] border-[var(--edu-border)] hover:border-[var(--edu-accent)]/40 hover:shadow-md text-[var(--edu-text-main)]'
                            }`}
                        >
                            <div className={`p-2.5 rounded-xl transition-colors ${
                                activeModule === section.id && !section.action
                                ? 'bg-white/20' 
                                : 'bg-[var(--edu-bg)] group-hover:bg-[var(--edu-accent)]/10'
                            }`}
                            style={{ color: activeModule === section.id && !section.action ? 'white' : section.color }}
                            >
                                {section.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xs font-bold leading-tight">{section.label}</h3>
                                <p className={`text-[10px] leading-tight mt-0.5 ${
                                    activeModule === section.id && !section.action ? 'text-white/70' : 'text-[var(--edu-text-muted)]'
                                }`}>
                                    {section.desc}
                                </p>
                            </div>
                            <ChevronRight size={14} className={activeModule === section.id && !section.action ? 'text-white/50' : 'text-[var(--edu-text-muted)] opacity-30'} />
                        </div>
                    ))}
                </div>

                <div className="mt-auto p-3 py-2 border-t border-[var(--edu-border)] bg-black/5 dark:bg-black/20 flex flex-row items-center justify-between gap-3">
                    <ThemeToggle />
                    <button onClick={logout} className="flex items-center gap-2 text-[10px] uppercase font-black text-[var(--edu-text-muted)] hover:text-red-500 transition-all py-1.5 px-4 rounded-xl border border-[var(--edu-border)] hover:border-red-200 bg-[var(--edu-glass)] shadow-sm active:scale-95">
                        <LogOut size={12} /> Cerrar Sesión
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col relative bg-[var(--edu-bg)] h-screen overflow-hidden">
                {/* Barra Superior Móvil */}
                <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-[var(--edu-bg-sidebar)] border-b border-[var(--edu-border)] z-30 shadow-md">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2.5 -ml-2 rounded-xl border border-[var(--edu-border)] bg-[var(--edu-bg-card)] hover:border-[var(--edu-accent)] text-[var(--edu-text-main)] active:scale-95 transition-all"
                        title="Abrir Menú"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-[var(--edu-text-main)]">
                            EduCrea <span className="text-[var(--edu-logo-blue)]">Admin</span>
                        </span>
                    </div>
                    <div className="w-10"></div>
                </div>
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--edu-accent)]/5 rounded-full blur-[120px] pointer-events-none"></div>
                
                {activeModule === 'DASHBOARD' && (
                    <div className="flex flex-col gap-8 h-full animate-fade-in z-10 overflow-y-auto premium-scrollbar pb-12 px-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--edu-border)] pb-4 gap-4 mt-4 lg:mt-0">
                            <div>
                                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-[var(--edu-text-main)] flex flex-wrap items-center gap-3 sm:gap-4">
                                    Tablero <span className="text-[var(--edu-logo-blue)]">Ejecutivo</span>
                                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap">
                                        🇵🇪 {currentTime.toLocaleTimeString('es-PE', { hour12: true })}
                                    </span>
                                </h1>
                            </div>
                             <div className="flex flex-wrap items-center gap-3">
                                <button 
                                    onClick={handleSync}
                                    className="px-4 py-2 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <Sparkles size={12} />
                                    Sincronizar Ahora
                                </button>
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Sincronizado en Vivo</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            <div className="bg-[var(--edu-bg-sidebar)]/40 p-6 rounded-[2rem] border border-[var(--edu-border)] shadow-xl flex flex-col gap-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Cuentas Activas</h3>
                                <div className="text-3xl font-black">{stats.activeUsers}</div>
                            </div>
                            <div className="bg-[var(--edu-bg-sidebar)]/40 p-6 rounded-[2rem] border border-[var(--edu-border)] shadow-xl flex flex-col gap-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Cuentas de Prueba</h3>
                                <div className="text-3xl font-black text-purple-500">{stats.totalTrials}</div>
                            </div>
                            <div className="bg-[var(--edu-bg-sidebar)]/40 p-6 rounded-[2rem] border border-[var(--edu-border)] shadow-xl flex flex-col gap-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Vencimientos Próximos</h3>
                                <div className="text-3xl font-black text-amber-500">{stats.expiringSoon}</div>
                            </div>
                            <div className="bg-[var(--edu-bg-sidebar)]/40 p-6 rounded-[2rem] border border-[var(--edu-border)] shadow-xl flex flex-col gap-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Total Descargas</h3>
                                <div className="text-3xl font-black text-emerald-500">{stats.totalDocs}</div>
                            </div>
                        </div>

                        {/* RENDIMIENTO POR CREADOR (SUSCRIPCIONES REALES) */}
                        <div className="bg-[var(--edu-bg-card)] p-8 rounded-[2.5rem] border border-[var(--edu-border)] shadow-xl space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--edu-border)] pb-4">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--edu-text-main)]">Rendimiento por Creador</h3>
                                    <span className="text-xs sm:text-sm font-bold text-[var(--edu-text-muted)]">
                                        Total de cuentas creadas: <span className="text-[var(--edu-logo-green)] font-black text-sm sm:text-base">{creatorSubscriptionStats.totalPeriodCount} cuentas</span>
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                                    {/* Selector de Frecuencia */}
                                    <div className="flex items-center bg-[var(--edu-bg)]/80 p-1 rounded-xl border border-[var(--edu-border)]">
                                        {['diario', 'semanal', 'mensual'].map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => {
                                                    setPerfTimeframe(t);
                                                    setExpandedCreator(null);
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                                                    perfTimeframe === t
                                                    ? 'bg-[var(--edu-accent)] text-white shadow-md'
                                                    : 'text-[var(--edu-text-muted)] hover:text-[var(--edu-text-main)]'
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Controles de Navegación del Período */}
                                    <div className="flex items-center bg-[var(--edu-bg)]/35 p-1 rounded-xl border border-[var(--edu-border)]/50">
                                        <button
                                            onClick={() => {
                                                setExpandedCreator(null);
                                                if (perfTimeframe === 'diario') {
                                                    const d = new Date(perfDate + 'T00:00:00');
                                                    d.setDate(d.getDate() - 1);
                                                    setPerfDate(d.toISOString().split('T')[0]);
                                                } else if (perfTimeframe === 'semanal') {
                                                    setPerfWeekOffset(prev => prev - 1);
                                                } else if (perfTimeframe === 'mensual') {
                                                    setPerfMonthOffset(prev => prev - 1);
                                                }
                                            }}
                                            className="p-1.5 rounded-lg border border-[var(--edu-border)] bg-[var(--edu-bg-card)] hover:border-[var(--edu-accent)] transition-all active:scale-90"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>

                                        <div className="px-3">
                                            {perfTimeframe === 'diario' ? (
                                                <div className="flex items-center gap-2 bg-[var(--edu-bg-card)]/50 px-3 py-1 rounded-lg border border-[var(--edu-border)]">
                                                    <Calendar size={14} className="text-[var(--edu-accent)]" />
                                                    <input
                                                        type="date"
                                                        value={perfDate}
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                setPerfDate(e.target.value);
                                                                setExpandedCreator(null);
                                                            }
                                                        }}
                                                        className="bg-transparent text-xs sm:text-sm font-black outline-none text-[var(--edu-text-main)] cursor-pointer"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--edu-text-main)]">
                                                    {creatorSubscriptionStats.periodLabel}
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => {
                                                setExpandedCreator(null);
                                                if (perfTimeframe === 'diario') {
                                                    const d = new Date(perfDate + 'T00:00:00');
                                                    d.setDate(d.getDate() + 1);
                                                    setPerfDate(d.toISOString().split('T')[0]);
                                                } else if (perfTimeframe === 'semanal') {
                                                    setPerfWeekOffset(prev => prev + 1);
                                                } else if (perfTimeframe === 'mensual') {
                                                    setPerfMonthOffset(prev => prev + 1);
                                                }
                                            }}
                                            className="p-1.5 rounded-lg border border-[var(--edu-border)] bg-[var(--edu-bg-card)] hover:border-[var(--edu-accent)] transition-all active:scale-90"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Grid de Resultados */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(creatorSubscriptionStats.subsByCreator).map(([creator, data]) => {
                                    const isExpanded = expandedCreator === creator;
                                    return (
                                        <div
                                            key={creator}
                                            onClick={() => setExpandedCreator(isExpanded ? null : creator)}
                                            className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98] ${
                                                isExpanded
                                                ? 'bg-[var(--edu-bg-sidebar)] border-[var(--edu-accent)] shadow-md'
                                                : 'bg-[var(--edu-bg)]/50 border-[var(--edu-border)] hover:border-[var(--edu-accent)]/60'
                                            }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-[var(--edu-text-muted)] uppercase tracking-wider">{creator}</span>
                                                <span className="text-2xl font-black text-[var(--edu-logo-green)]">{data.count} cuentas</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 bg-[var(--edu-logo-green)]/10 rounded-xl flex items-center justify-center text-[var(--edu-logo-green)] group-hover:bg-[var(--edu-logo-green)] group-hover:text-white transition-all">
                                                    <CreditCard size={18} />
                                                </div>
                                                <div className="text-[var(--edu-text-muted)] opacity-60">
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {Object.keys(creatorSubscriptionStats.subsByCreator).length === 0 && (
                                    <p className="text-[10px] text-[var(--edu-text-muted)] italic col-span-full py-4 text-center">
                                        No se registran suscripciones pagas creadas en este período.
                                    </p>
                                )}
                            </div>

                            {/* Listado de Desglose en Vivo */}
                            {expandedCreator && creatorSubscriptionStats.subsByCreator[expandedCreator] && (
                                <div className="bg-[var(--edu-bg)]/30 border border-[var(--edu-border)] rounded-2xl p-6 mt-4 animate-fade-in space-y-4">
                                    <div className="flex justify-between items-center border-b border-[var(--edu-border)] pb-2">
                                        <h4 className="text-[11px] font-black uppercase tracking-wider text-[var(--edu-text-main)]">
                                            Detalle de Suscripciones: {expandedCreator}
                                        </h4>
                                        <button
                                            onClick={() => setExpandedCreator(null)}
                                            className="text-[9px] font-black uppercase tracking-wider bg-[var(--edu-bg-card)] px-2 py-1 rounded border border-[var(--edu-border)] hover:text-red-500 transition-all"
                                        >
                                            Cerrar
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto premium-scrollbar">
                                        <table className="w-full text-left border-collapse min-w-[600px] lg:min-w-0">
                                            <thead>
                                                <tr className="border-b border-[var(--edu-border)] text-[9px] uppercase tracking-wider text-[var(--edu-text-muted)]">
                                                    <th className="pb-2 font-black">Docente</th>
                                                    <th className="pb-2 font-black">Email</th>
                                                    <th className="pb-2 font-black">Plan</th>
                                                    <th className="pb-2 font-black">Alta</th>
                                                    <th className="pb-2 font-black text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {creatorSubscriptionStats.subsByCreator[expandedCreator].users.map((u) => {
                                                    const planColors = {
                                                        mensual: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                                                        bimestral: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
                                                        anual: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                                                        manual: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                    };
                                                    const planStyle = planColors[u.plan] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
                                                    
                                                    const regDate = new Date(u.createdAt || u.subscription?.start);
                                                    const formattedRegDate = regDate.toLocaleDateString('es-PE', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });

                                                    return (
                                                        <tr key={u.id} className="border-b border-[var(--edu-border)]/50 last:border-0 text-[10px] hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                                                            <td className="py-2.5 font-bold">
                                                                <div className="flex flex-col">
                                                                    <span>{u.fullName}</span>
                                                                    {u.phoneNumber && (
                                                                        <span className="text-[8px] text-[var(--edu-text-muted)] font-normal">{u.phoneNumber}</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 font-mono opacity-80">{u.email}</td>
                                                            <td className="py-2.5">
                                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${planStyle}`}>
                                                                    {u.plan}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 text-[9px] text-[var(--edu-text-muted)] font-mono">{formattedRegDate}</td>
                                                            <td className="py-2.5 text-right">
                                                                {u.phoneNumber ? (
                                                                    <a
                                                                        href={u.walink || `https://wa.me/51${u.phoneNumber}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[var(--edu-logo-green)] hover:underline"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        WhatsApp
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-[8px] text-[var(--edu-text-muted)] italic">Sin tlf</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeModule === 'ACCOUNTS' && (
                    <div className="flex-1 flex flex-col min-h-0 animate-fade-in z-10 p-4 sm:p-8">
                         <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-[var(--edu-border)] pb-4 mb-6 gap-4 mt-4 lg:mt-0">
                            <div>
                                <h1 className="text-sm font-black uppercase tracking-[0.2em] flex flex-wrap items-center gap-3">
                                    Gestión de <span className="text-[var(--edu-logo-blue)]">Usuarios</span>
                                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap">
                                        🇵🇪 {currentTime.toLocaleTimeString('es-PE', { hour12: true })}
                                    </span>
                                </h1>
                                <p className="text-[10px] text-[var(--edu-text-muted)] mt-1">
                                    {isAux ? 'Modo Auxiliar: Solo gestión de cuentas de usuario' : `Modo General: Mostrando ${filteredUsers.length} de ${globalVars.META_USERS?.length || 0} cuentas`}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button 
                                    onClick={handleSync}
                                    className="px-4 py-2 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <Sparkles size={12} />
                                    Sincronizar
                                </button>
                                <button 
                                    onClick={() => {
                                        if(window.confirm("🗑️ ¿Limpiar todas las solicitudes de prueba?\nEsto permitirá volver a usar correos que ya pidieron prueba.")) {
                                            updateGlobalVars({ TRIAL_REQUESTS: [] });
                                            alert("✅ Lista de solicitudes limpia.");
                                        }
                                    }}
                                    className="px-4 py-2 border border-purple-500/20 text-purple-500 bg-purple-500/5 hover:bg-purple-500 hover:text-white rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                    Reset Pruebas
                                </button>
                                <button 
                                    onClick={() => setShowCreateForm(!showCreateForm)}
                                    className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-[var(--edu-logo-blue)] text-white shadow-lg shadow-[var(--edu-logo-blue)]/20 active:scale-95 transition-all"
                                >
                                    {showCreateForm ? '× Cancelar' : '+ Nueva Cuenta'}
                                </button>
                            </div>
                        </div>

                        {/* FORMULARIO DE CREACIÓN (Con Scrollbar Premium) */}
                        {showCreateForm && (
                            <div className="bg-[var(--edu-bg-card)] rounded-3xl p-8 border border-[var(--edu-accent)]/30 animate-slide-up shadow-2xl max-h-[70vh] overflow-y-auto premium-scrollbar relative mb-8">
                                <h2 className="text-xs font-black uppercase tracking-widest mb-6">Configurar Nueva Cuenta</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Nombre Completo</label>
                                        <input 
                                            type="text" 
                                            value={newUser.fullName}
                                            onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                                            placeholder="Nombre del Docente" 
                                            className="w-full px-4 py-3 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-xl text-xs outline-none" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Email Acceso</label>
                                        <input 
                                            type="email" 
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                            placeholder="correo@ejemplo.com" 
                                            className="w-full px-4 py-3 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-xl text-xs outline-none" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Número de Teléfono</label>
                                        <input 
                                            type="tel" 
                                            value={newUser.phoneNumber}
                                            onChange={(e) => setNewUser({...newUser, phoneNumber: e.target.value})}
                                            placeholder="Ej: 999888777" 
                                            className="w-full px-4 py-3 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-xl text-xs outline-none focus:border-[var(--edu-accent)] transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Plan de Acceso</label>
                                        <select 
                                            value={newUser.plan}
                                            onChange={(e) => {
                                                const plan = e.target.value;
                                                let days = newUser.days;
                                                if (plan === 'prueba') days = 1;
                                                if (plan === 'mensual') days = 30;
                                                if (plan === 'bimestral') days = 60;
                                                if (plan === 'anual') days = 365;
                                                setNewUser({...newUser, plan, days});
                                            }}
                                            className="w-full px-4 py-3 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-xl text-xs outline-none cursor-pointer"
                                        >
                                            <option value="prueba">Sesión de Prueba (1 día)</option>
                                            <option value="mensual">Plan Mensual (30 días)</option>
                                            <option value="bimestral">Plan Bimestral (60 días)</option>
                                            <option value="anual">Plan Anual (365 días)</option>
                                            <option value="manual">Plan Personalizado (Manual)</option>
                                        </select>
                                    </div>
                                    {newUser.plan === 'prueba' ? (
                                        <div className="space-y-2 animate-fade-in">
                                            <label className="text-[9px] font-black uppercase text-[var(--edu-accent)] ml-1">Fecha y Hora de la Cita</label>
                                            <input 
                                                type="datetime-local" 
                                                min={formatPeruLocal(getPeruDate())}
                                                value={newUser.scheduledTime || formatPeruLocal(getPeruDate())}
                                                onClick={(e) => e.target.showPicker?.()}
                                                onChange={(e) => setNewUser({...newUser, scheduledTime: e.target.value})}
                                                className="w-full px-4 py-3 bg-[var(--edu-bg)] border border-[var(--edu-accent)]/30 rounded-xl text-xs outline-none focus:border-[var(--edu-accent)] cursor-pointer" 
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2 animate-fade-in">
                                            <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Días de Acceso</label>
                                            <input 
                                                type="number" 
                                                value={newUser.days}
                                                onChange={(e) => setNewUser({...newUser, days: e.target.value})}
                                                className="w-full px-4 py-3 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-xl text-xs outline-none" 
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Rol Administrativo</label>
                                        <select 
                                            disabled={isAux}
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                            className="w-full px-4 py-3 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-xl text-xs outline-none appearance-none cursor-pointer disabled:opacity-50"
                                        >
                                            <option value="user">Usuario (Docente)</option>
                                            {!isAux && <option value="admin_aux">Administrador Auxiliar</option>}
                                            {!isAux && <option value="admin_general">Administrador General</option>}
                                        </select>
                                    </div>

                                    {(newUser.role === 'admin_aux' || newUser.role === 'admin_general') && (
                                        <>
                                            <div className="space-y-2 animate-fade-in">
                                                <label className="text-[9px] font-black uppercase text-amber-500 ml-1 font-black">WhatsApp de Ventas</label>
                                                <input 
                                                    type="text" 
                                                    value={newUser.whatsappVentas}
                                                    onChange={(e) => setNewUser({...newUser, whatsappVentas: e.target.value})}
                                                    placeholder="Ej: 993125547" 
                                                    className="w-full px-4 py-3 bg-[var(--edu-bg)] border border-amber-500/30 rounded-xl text-xs outline-none focus:border-amber-500" 
                                                />
                                            </div>
                                            <div className="space-y-2 animate-fade-in">
                                                <label className="text-[9px] font-black uppercase text-amber-500 ml-1 font-black">Wa.link (Enlace Directo)</label>
                                                <input 
                                                    type="text" 
                                                    value={newUser.walink}
                                                    onChange={(e) => setNewUser({...newUser, walink: e.target.value})}
                                                    placeholder="https://wa.link/xxxx" 
                                                    className="w-full px-4 py-3 bg-[var(--edu-bg)] border border-amber-500/30 rounded-xl text-xs outline-none focus:border-amber-500" 
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* SELECCIÓN DE NIVELES Y ÁREAS (Plan de Acceso Granular) */}
                                    <div className="lg:col-span-2 space-y-3 bg-[var(--edu-bg)]/50 p-4 rounded-2xl border border-[var(--edu-border)]">
                                        <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Niveles Permitidos</label>
                                        <div className="flex gap-4">
                                            {['Inicial', 'Primaria', 'Secundaria', 'EduCruci'].map(lvl => (
                                                <label key={lvl} className="flex items-center gap-2 cursor-pointer group">
                                                    <input 
                                                        type="checkbox"
                                                        checked={newUser.allowedLevels.includes(lvl)}
                                                        onChange={(e) => {
                                                            const isChecked = e.target.checked;
                                                            const levels = isChecked 
                                                                ? [...newUser.allowedLevels, lvl]
                                                                : newUser.allowedLevels.filter(l => l !== lvl);
                                                                
                                                            let newAreas = [...newUser.allowedAreas];
                                                            if (lvl === 'Inicial') {
                                                                const iniAreas = ["Matemática", "Comunicación", "Personal Social", "Ciencia y Tecnología", "Psicomotriz", "Castellano como Segunda Lengua"].map(a => `INI_${a}`);
                                                                if (isChecked) {
                                                                    iniAreas.forEach(a => {
                                                                        if (!newAreas.includes(a)) newAreas.push(a);
                                                                    });
                                                                } else {
                                                                    newAreas = newAreas.filter(a => !iniAreas.includes(a));
                                                                }
                                                            } else if (lvl === 'Primaria') {
                                                                const priAreas = ["Matemática", "Comunicación", "Castellano como Segunda Lengua", "Quechua Collao", "Quechua Chanca", "Quechua Central", "Personal Social", "Ciencia y Tecnología", "Arte y Cultura", "Educación Física", "Educación Religiosa", "Inglés como Lengua Extranjera"].map(a => `PRI_${a}`);
                                                                if (isChecked) {
                                                                    priAreas.forEach(a => {
                                                                        if (!newAreas.includes(a)) newAreas.push(a);
                                                                    });
                                                                } else {
                                                                    newAreas = newAreas.filter(a => !priAreas.includes(a));
                                                                }
                                                            }
                                                            setNewUser({...newUser, allowedLevels: levels, allowedAreas: newAreas});
                                                        }}
                                                        className="w-4 h-4 rounded border-[var(--edu-border)] accent-[var(--edu-logo-blue)]"
                                                    />
                                                    <span className="text-xs font-bold group-hover:text-[var(--edu-logo-blue)] transition-colors">{lvl}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2 space-y-4 bg-[var(--edu-bg)]/50 p-6 rounded-2xl border border-[var(--edu-border)] shadow-inner">
                                        <label className="text-[10px] font-black uppercase text-[var(--edu-text-muted)] ml-1 tracking-widest block mb-2">
                                            🎯 Configuración de Áreas Permitidas
                                        </label>
                                        
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* COLUMNA INICIAL */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 pb-1 border-b border-[var(--edu-border)]">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-[var(--edu-text-muted)]">Nivel Inicial</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {["Matemática", "Comunicación", "Personal Social", "Ciencia y Tecnología", "Psicomotriz", "Castellano como Segunda Lengua"].map(area => (
                                                        <AreaChip 
                                                            key={`ini-${area}`} 
                                                            area={area} 
                                                            selected={newUser.allowedAreas.includes(`INI_${area}`) || newUser.allowedAreas.includes(area)} 
                                                            onToggle={() => {
                                                                const isSelected = newUser.allowedAreas.includes(`INI_${area}`) || newUser.allowedAreas.includes(area);
                                                                const areas = isSelected
                                                                    ? newUser.allowedAreas.filter(a => a !== `INI_${area}` && a !== area)
                                                                    : [...newUser.allowedAreas, `INI_${area}`];
                                                                setNewUser({...newUser, allowedAreas: areas});
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* COLUMNA PRIMARIA */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 pb-1 border-b border-[var(--edu-border)]">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-[var(--edu-text-muted)]">Nivel Primaria</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {["Matemática", "Comunicación", "Castellano como Segunda Lengua", "Quechua Collao", "Quechua Chanca", "Quechua Central", "Personal Social", "Ciencia y Tecnología", "Arte y Cultura", "Educación Física", "Educación Religiosa", "Inglés como Lengua Extranjera", "Tutoría y Orientación Educativa"].map(area => (
                                                        <AreaChip 
                                                            key={`pri-${area}`} 
                                                            area={area} 
                                                            selected={newUser.allowedAreas.includes(`PRI_${area}`) || newUser.allowedAreas.includes(area)} 
                                                            onToggle={() => {
                                                                const isSelected = newUser.allowedAreas.includes(`PRI_${area}`) || newUser.allowedAreas.includes(area);
                                                                const areas = isSelected
                                                                    ? newUser.allowedAreas.filter(a => a !== `PRI_${area}` && a !== area)
                                                                    : [...newUser.allowedAreas, `PRI_${area}`];
                                                                setNewUser({...newUser, allowedAreas: areas});
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* COLUMNA SECUNDARIA */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 pb-1 border-b border-[var(--edu-border)]">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-[var(--edu-text-muted)]">Nivel Secundaria</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {["Matemática", "Comunicación", "Castellano como Segunda Lengua", "Quechua Collao", "Quechua Chanca", "Quechua Central", "Ciencias Sociales", "Desarrollo Personal, Ciudadanía y Cívica", "Ciencia y Tecnología", "Arte y Cultura", "Educación Física", "Educación para el Trabajo", "Educación Religiosa", "Inglés como Lengua Extranjera", "Tutoría y Orientación Educativa"].map(area => (
                                                        <AreaChip 
                                                            key={`sec-${area}`} 
                                                            area={area} 
                                                            selected={newUser.allowedAreas.includes(`SEC_${area}`) || newUser.allowedAreas.includes(area)} 
                                                            onToggle={() => {
                                                                const isSelected = newUser.allowedAreas.includes(`SEC_${area}`) || newUser.allowedAreas.includes(area);
                                                                const areas = isSelected
                                                                    ? newUser.allowedAreas.filter(a => a !== `SEC_${area}` && a !== area)
                                                                    : [...newUser.allowedAreas, `SEC_${area}`];
                                                                setNewUser({...newUser, allowedAreas: areas});
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-[var(--edu-text-muted)] italic mt-2 opacity-60">* Si no seleccionas ninguna área, el docente tendrá acceso a todas las áreas del sistema.</p>
                                    </div>

                                    <div className="lg:col-span-4 flex justify-end mt-4">
                                        <button 
                                            onClick={handleCreateUser}
                                            disabled={isSaving}
                                            className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                                                isSaving 
                                                ? 'bg-gray-400 cursor-not-allowed' 
                                                : 'bg-emerald-500 text-white hover:brightness-110 shadow-emerald-500/20'
                                            }`}
                                        >
                                            {isSaving ? 'Guardando en la nube...' : 'Activar Cuenta con Fecha Perú'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto premium-scrollbar pr-2 min-h-0">
                            <div className="bg-[var(--edu-bg-card)] rounded-3xl border border-[var(--edu-border)] overflow-hidden shadow-xl">
                                <div className="overflow-x-auto w-full premium-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[850px] lg:min-w-0">
                                <thead className="bg-black/5 dark:bg-white/5">
                                    <tr className="border-b border-[var(--edu-border)] bg-black/5">
                                        <td className="p-1"></td>
                                        <td className="p-1 px-4">
                                            <input 
                                                type="text" 
                                                placeholder="Buscar..." 
                                                className="w-full bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-lg px-2 py-0.5 text-[9px] outline-none focus:border-[var(--edu-accent)] transition-all h-6"
                                                value={filters.createdBy}
                                                onChange={(e) => setFilters({...filters, createdBy: e.target.value})}
                                            />
                                        </td>
                                        <td className="p-1 px-4">
                                            <input 
                                                type="text" 
                                                placeholder="Nombre o email..." 
                                                className="w-full bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-lg px-2 py-0.5 text-[9px] outline-none focus:border-[var(--edu-accent)] transition-all h-6"
                                                value={filters.fullName}
                                                onChange={(e) => setFilters({...filters, fullName: e.target.value})}
                                            />
                                        </td>
                                        <td className="p-1 px-4">
                                            <select 
                                                className="w-full bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-lg px-2 py-0.5 text-[9px] outline-none cursor-pointer h-6"
                                                value={filters.role}
                                                onChange={(e) => setFilters({...filters, role: e.target.value})}
                                            >
                                                <option value="all">Todos</option>
                                                <option value="user">Usuarios</option>
                                                <option value="prueba">Prueba</option>
                                                <option value="vencidos">Vencidos</option>
                                                <option value="por_vencer">Por vencer</option>
                                            </select>
                                        </td>
                                        <td className="p-1"></td>
                                        <td className="p-1"></td>
                                    </tr>
                                    <tr>
                                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">
                                            <input 
                                                type="checkbox" 
                                                checked={paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedUsers(paginatedUsers.map(u => u.id));
                                                    else setSelectedUsers([]);
                                                }}
                                                className="w-4 h-4 rounded border-[var(--edu-border)] accent-amber-500 cursor-pointer"
                                            />
                                        </th>
                                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Creador</th>
                                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Usuario</th>
                                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Rol</th>
                                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Suscripción</th>
                                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] text-left">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedUsers.map(u => (
                                        <tr key={u.id} className={`border-t border-[var(--edu-border)] transition-colors ${selectedUsers.includes(u.id) ? 'bg-amber-500/5' : 'hover:bg-white/5'}`}>
                                            <td className="p-4">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedUsers.includes(u.id)}
                                                    onChange={() => toggleUserSelection(u.id)}
                                                    className="w-4 h-4 rounded border-[var(--edu-border)] accent-amber-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <span className="text-[10px] font-medium text-[var(--edu-text-muted)] opacity-70">{u.createdBy || 'Sistema'}</span>
                                            </td>
                                            <td className="p-4">
                                                <div>
                                                    <div className="text-[var(--edu-text-main)] font-bold">{u.fullName || 'Sin Nombre'}</div>
                                                    <div className="text-[10px] text-[var(--edu-text-muted)] flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono">{u.email}</span>
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(u.email);
                                                                    alert("📧 Correo de usuario copiado: " + u.email);
                                                                }}
                                                                className="text-[var(--edu-text-muted)] hover:text-[var(--edu-accent)] transition-colors p-0.5 rounded border border-transparent hover:border-[var(--edu-accent)]/20 bg-black/5 dark:bg-white/5"
                                                                title="Copiar correo de usuario"
                                                            >
                                                                <Copy size={10} />
                                                            </button>
                                                        </div>
                                                        {u.phoneNumber && <span className="text-emerald-500 font-bold">📱 {u.phoneNumber}</span>}
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[var(--edu-accent)] font-mono">
                                                                🔑 Clave: {visiblePasswords[u.id] ? u.password : '********'}
                                                            </span>
                                                            <button 
                                                                onClick={() => setVisiblePasswords(prev => ({...prev, [u.id]: !prev[u.id]}))}
                                                                className="text-[9px] font-bold uppercase tracking-widest text-[var(--edu-text-muted)] hover:text-[var(--edu-accent)] transition-colors px-2 py-0.5 rounded-md border border-transparent hover:border-[var(--edu-accent)]/30"
                                                            >
                                                                {visiblePasswords[u.id] ? 'Ocultar' : 'Mostrar'}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleCopyCredentials(u.email, u.password)}
                                                                className="text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:text-white hover:bg-emerald-500 transition-colors px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1"
                                                                title="Copiar datos para WhatsApp"
                                                            >
                                                                <Copy size={8} /> Copiar
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    const newPwd = window.prompt(`🔑 NUEVA CLAVE para ${u.fullName || 'el usuario'}:\n\nEscribe la nueva contraseña. Al guardar, se actualizará en la base de datos.`);
                                                                    if (newPwd && newPwd.trim() !== "" && newPwd !== u.password) {
                                                                        setIsSaving(true);
                                                                        try {
                                                                            const updatedUser = { ...u, password: newPwd.trim() };
                                                                            await db.upsertUser(updatedUser, user?.email, user?.password);
                                                                            
                                                                            const updatedUsers = globalVars.META_USERS.map(user => 
                                                                                user.id === u.id ? updatedUser : user
                                                                            );
                                                                            updateGlobalVars({ META_USERS: updatedUsers });
                                                                            alert("✅ Clave actualizada en la nube.");
                                                                        } catch (err) {
                                                                            alert("❌ Error al guardar clave: " + err.message);
                                                                        } finally {
                                                                            setIsSaving(false);
                                                                        }
                                                                    }
                                                                }}
                                                                className="text-[9px] font-bold uppercase tracking-widest text-amber-500 hover:text-white hover:bg-amber-500 transition-colors px-2 py-0.5 rounded-md border border-amber-500/30"
                                                                title="Cambiar Clave"
                                                            >
                                                                Editar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                    u.plan === 'prueba' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                                                    u.role?.includes('admin') ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                    {u.plan === 'prueba' ? 'Prueba' : u.role === 'admin_general' ? 'General' : u.role === 'admin_aux' ? 'Auxiliar' : 'Usuario'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-0.5">
                                                    {u.plan === 'prueba' ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className={`flex items-center gap-1.5 font-bold px-2 py-1 rounded-lg border w-fit ${
                                                                u.trialStartTime && (new Date(u.trialStartTime).getTime() + 24 * 60 * 60 * 1000) < currentTime.getTime()
                                                                ? 'text-rose-500 bg-rose-500/5 border-rose-500/20 shadow-lg shadow-rose-500/5'
                                                                : 'text-amber-500 bg-amber-500/5 border-amber-500/10'
                                                            }`}>
                                                                <Calendar size={10} />
                                                                <span className="text-[9px] uppercase tracking-tighter">
                                                                    {u.trialStartTime && (new Date(u.trialStartTime).getTime() + 24 * 60 * 60 * 1000) < currentTime.getTime()
                                                                        ? 'PRUEBA TERMINADA'
                                                                        : (u.scheduledTime ? new Date(u.scheduledTime).toLocaleString('es-PE', { 
                                                                            timeZone: 'America/Lima',
                                                                            day: '2-digit', 
                                                                            month: 'short', 
                                                                            hour: '2-digit', 
                                                                            minute: '2-digit',
                                                                            hour12: true 
                                                                        }) : 'Sin fecha')
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border flex items-center gap-1 ${
                                                                    u.termsAcceptedAt 
                                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse'
                                                                }`}>
                                                                    {u.termsAcceptedAt ? <Shield size={8} /> : <Info size={8} />}
                                                                    {u.termsAcceptedAt ? 'TÉRMINOS ACEPTADOS' : 'TÉRMINOS PENDIENTES'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        (() => {
                                                            const startStr = u.subscription?.start ? new Date(u.subscription.start).toLocaleDateString('es-PE') : '--';
                                                            let endStr = 'No activa';
                                                            let daysText = '';
                                                            let barColor = 'bg-gray-500';
                                                            
                                                            if (u.subscription?.end) {
                                                                const endDate = new Date(u.subscription.end);
                                                                endStr = endDate.toLocaleDateString('es-PE');
                                                                const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                                                
                                                                if (daysLeft < 0) {
                                                                    daysText = `(venció hace ${Math.abs(daysLeft)} días)`;
                                                                    barColor = 'bg-rose-500';
                                                                } else if (daysLeft === 0) {
                                                                    daysText = `(vence hoy)`;
                                                                    barColor = 'bg-rose-500';
                                                                } else {
                                                                    daysText = `(en ${daysLeft} días)`;
                                                                    barColor = daysLeft <= 30 ? 'bg-amber-500' : 'bg-emerald-500';
                                                                }
                                                            }
                                                            
                                                            return (
                                                                <>
                                                                    <span className="text-[9px] text-[var(--edu-text-muted)]">Inicio: {startStr}</span>
                                                                    <span className="text-[10px] font-bold flex flex-wrap gap-1">
                                                                        Vence: {endStr}
                                                                        {daysText && <span className={`text-[9px] ${barColor.replace('bg-', 'text-')}`}>{daysText}</span>}
                                                                    </span>
                                                                    <div className="w-24 h-1 bg-[var(--edu-bg)] rounded-full mt-1 overflow-hidden shadow-inner">
                                                                        <div className={`h-full w-full ${barColor}`}></div>
                                                                    </div>
                                                                </>
                                                            );
                                                        })()
                                                    )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-left">
                                                    <div className="flex justify-start gap-2">
                                                        <button 
                                                            onClick={() => openPlanModal(u)}
                                                            className="p-2 hover:bg-purple-500/10 text-purple-500 rounded-lg transition-colors" 
                                                            title="Actualizar Suscripción"
                                                        >
                                                            <CreditCard size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={async () => {
                                                                const templateId = window.prompt("📧 ELIGE PLANTILLA A RE-ENVIAR:\n(welcome, expiring, reactivate, generic, trial)", u.plan === 'prueba' ? 'trial' : 'welcome');
                                                                if (templateId && globalVars.META_EMAIL_CONFIG[templateId]) {
                                                                    const res = await sendWelcomeEmail(u.email, u.fullName, u.password, globalVars.META_EMAIL_CONFIG[templateId], u.scheduledTime);
                                                                    alert(res.success ? "✅ Correo enviado con éxito" : "❌ Error al enviar correo");
                                                                }
                                                            }}
                                                            className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors" 
                                                            title="Re-enviar Correo"
                                                        >
                                                            <Mail size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={async () => {
                                                                const currentVal = u.scheduledTime ? new Date(u.scheduledTime).toISOString().slice(0, 16).replace('T', ' ') : '';
                                                                const newDate = window.prompt("📅 EDITAR FECHA DE AGENDA (Formato YYYY-MM-DD HH:MM):\nUse la hora de Perú.", currentVal);
                                                                if (newDate) {
                                                                    setIsSaving(true);
                                                                    try {
                                                                        const updatedUser = { ...u, scheduledTime: new Date(newDate).toISOString() };
                                                                        await db.upsertUser(updatedUser, user?.email, user?.password);

                                                                        const updatedUsers = globalVars.META_USERS.map(user => 
                                                                            user.id === u.id ? updatedUser : user
                                                                        );
                                                                        updateGlobalVars({ META_USERS: updatedUsers });
                                                                        alert("✅ Agenda actualizada en la nube.");
                                                                    } catch (err) {
                                                                        alert("❌ Error al guardar agenda: " + err.message);
                                                                    } finally {
                                                                        setIsSaving(false);
                                                                    }
                                                                }
                                                            }}
                                                            className="p-2 hover:bg-amber-500/10 text-amber-500 rounded-lg transition-colors" 
                                                            title="Editar Agenda"
                                                        >
                                                            <Calendar size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={async () => {
                                                                const creator = globalVars.META_USERS?.find(adm => adm.username === u.createdBy || adm.id === u.createdBy);
                                                                const currentVal = u.whatsappVentas || creator?.whatsappVentas || '';
                                                                if (!isGeneral) {
                                                                    alert("Solo el Administrador General puede modificar números de contacto.");
                                                                    return;
                                                                }
                                                                const newNum = window.prompt(`📱 EDITAR WHATSAPP DE VENTAS\n\nUsuario: ${u.fullName}\nCreador: ${u.createdBy || 'Sistema'}\n\nEste número se mostrará al finalizar la prueba.`, currentVal);
                                                                if (newNum !== null) {
                                                                    setIsSaving(true);
                                                                    try {
                                                                        const updatedUser = { ...u, whatsappVentas: newNum.trim() };
                                                                        await db.upsertUser(updatedUser, user?.email, user?.password);

                                                                        const updatedUsers = globalVars.META_USERS.map(user => 
                                                                            user.id === u.id ? updatedUser : user
                                                                        );
                                                                        updateGlobalVars({ META_USERS: updatedUsers });
                                                                        alert("✅ WhatsApp actualizado en la nube.");
                                                                    } catch (err) {
                                                                        alert("❌ Error al guardar WhatsApp: " + err.message);
                                                                    } finally {
                                                                        setIsSaving(false);
                                                                    }
                                                                }
                                                            }}
                                                            className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-lg transition-colors" 
                                                            title="WhatsApp de Ventas"
                                                        >
                                                            <Users size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors" 
                                                            title="Dar de Baja"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                    ))}
                                    {paginatedUsers.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center text-[var(--edu-text-muted)] italic text-xs">
                                                No se encontraron cuentas que coincidan con los filtros.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                            <div className="bg-black/5 dark:bg-white/5 p-4 border-t border-[var(--edu-border)] flex items-center justify-between">
                                <div className="text-[10px] text-[var(--edu-text-muted)] font-bold uppercase tracking-widest">
                                    Mostrando {paginatedUsers.length} de {filteredUsers.length} usuarios
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-[var(--edu-text-muted)] uppercase font-black">Filas:</span>
                                        <select 
                                            value={itemsPerPage}
                                            onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                                            className="bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-lg px-2 py-1 text-[10px] outline-none cursor-pointer"
                                        >
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="p-2 rounded-xl border border-[var(--edu-border)] hover:bg-[var(--edu-accent)]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <div className="px-4 py-1.5 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-xl text-[10px] font-black min-w-[120px] text-center">
                                            PÁGINA {currentPage} DE {totalPages || 1}
                                        </div>
                                        <button 
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="p-2 rounded-xl border border-[var(--edu-border)] hover:bg-[var(--edu-accent)]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                )}

                {activeModule === 'EMAIL' && (
                    <div className="flex flex-col gap-8 h-fit min-h-full animate-fade-in z-10 overflow-y-auto premium-scrollbar pb-24 px-4">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[var(--edu-border)] pb-6">
                                    <div>
                                        <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-[var(--edu-text-main)]">Centro de <span className="text-amber-500">Comunicaciones</span></h1>
                                        <p className="text-[10px] text-[var(--edu-text-muted)] mt-1 uppercase font-bold tracking-wider">Gestiona las plantillas de correo electrónico</p>
                                    </div>
                                    
                                    <div className="flex bg-[var(--edu-bg-card)] p-1.5 rounded-2xl border border-[var(--edu-border)] shadow-lg overflow-x-auto max-w-full">
                                        {[
                                            { id: 'welcome', label: 'Bienvenida', color: 'blue' },
                                            { id: 'expiring', label: 'Vencimiento', color: 'orange' },
                                            { id: 'reactivate', label: 'Reactivar', color: 'emerald' },
                                            { id: 'generic', label: 'Aviso', color: 'purple' },
                                            { id: 'trial', label: 'Prueba', color: 'pink' }
                                        ].map(tab => (
                                            <button 
                                                key={tab.id}
                                                onClick={() => updateGlobalVars({ 
                                                    META_EMAIL_CONFIG: { ...globalVars.META_EMAIL_CONFIG, current: tab.id } 
                                                })}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap ${
                                                    (globalVars.META_EMAIL_CONFIG?.current || 'welcome') === tab.id 
                                                    ? 'bg-amber-500 text-white shadow-md' 
                                                    : 'text-[var(--edu-text-muted)] hover:bg-[var(--edu-bg)]'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Editor Dinámico */}
                                    <div className="bg-[var(--edu-bg-card)] p-8 rounded-[2rem] border border-[var(--edu-border)] shadow-xl space-y-8">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <Mail size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <h2 className="text-xl font-black text-[var(--edu-text-main)]">Editar Plantilla</h2>
                                                    <button 
                                                        onClick={() => alert("🏷️ ETIQUETAS DISPONIBLES:\n\n{nombre} -> Se cambia por el nombre del docente.\n{email} -> Se cambia por el correo del docente.\n{agenda} -> Se cambia por la fecha de la prueba.\n\nEscríbelas tal cual en tu mensaje y el sistema hará la magia.")}
                                                        className="p-2 rounded-xl bg-[var(--edu-bg)] border border-[var(--edu-border)] text-[var(--edu-text-muted)] hover:text-amber-500 transition-all flex items-center gap-2"
                                                    >
                                                        <Info size={14} /> <span className="text-[9px] font-black uppercase">Etiquetas</span>
                                                    </button>
                                                </div>
                                                <p className="text-xs text-[var(--edu-text-muted)] italic">
                                                    Modificando: <span className="text-amber-500 font-bold uppercase tracking-widest text-[9px]">
                                                        {(globalVars.META_EMAIL_CONFIG?.current || 'welcome')}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Asunto</label>
                                                <input 
                                                    type="text"
                                                    value={globalVars.META_EMAIL_CONFIG?.[globalVars.META_EMAIL_CONFIG?.current || 'welcome']?.subject || ''}
                                                    onChange={(e) => {
                                                        const current = globalVars.META_EMAIL_CONFIG?.current || 'welcome';
                                                        updateGlobalVars({ 
                                                            META_EMAIL_CONFIG: { 
                                                                ...globalVars.META_EMAIL_CONFIG, 
                                                                [current]: { ...globalVars.META_EMAIL_CONFIG[current], subject: e.target.value } 
                                                            } 
                                                        });
                                                    }}
                                                    className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-xs outline-none focus:border-amber-500 transition-all font-bold"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Mensaje</label>
                                                <textarea 
                                                    rows={10}
                                                    value={globalVars.META_EMAIL_CONFIG?.[globalVars.META_EMAIL_CONFIG?.current || 'welcome']?.body || ''}
                                                    onChange={(e) => {
                                                        const current = globalVars.META_EMAIL_CONFIG?.current || 'welcome';
                                                        updateGlobalVars({ 
                                                            META_EMAIL_CONFIG: { 
                                                                ...globalVars.META_EMAIL_CONFIG, 
                                                                [current]: { ...globalVars.META_EMAIL_CONFIG[current], body: e.target.value } 
                                                            } 
                                                        });
                                                    }}
                                                    className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-xs outline-none focus:border-amber-500 transition-all resize-none leading-relaxed"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Pie de Página</label>
                                                <input 
                                                    type="text"
                                                    value={globalVars.META_EMAIL_CONFIG?.[globalVars.META_EMAIL_CONFIG?.current || 'welcome']?.footer || ''}
                                                    onChange={(e) => {
                                                        const current = globalVars.META_EMAIL_CONFIG?.current || 'welcome';
                                                        updateGlobalVars({ 
                                                            META_EMAIL_CONFIG: { 
                                                                ...globalVars.META_EMAIL_CONFIG, 
                                                                [current]: { ...globalVars.META_EMAIL_CONFIG[current], footer: e.target.value } 
                                                            } 
                                                        });
                                                    }}
                                                    className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-2xl text-[10px] outline-none focus:border-amber-500 transition-all text-[var(--edu-text-muted)]"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase text-blue-500 ml-1 font-black">Texto del Botón</label>
                                                    <input 
                                                        type="text"
                                                        placeholder="Ej: Acceder Ahora"
                                                        value={globalVars.META_EMAIL_CONFIG?.[globalVars.META_EMAIL_CONFIG?.current || 'welcome']?.buttonText || ''}
                                                        onChange={(e) => {
                                                            const current = globalVars.META_EMAIL_CONFIG?.current || 'welcome';
                                                            updateGlobalVars({ 
                                                                META_EMAIL_CONFIG: { 
                                                                    ...globalVars.META_EMAIL_CONFIG, 
                                                                    [current]: { ...globalVars.META_EMAIL_CONFIG[current], buttonText: e.target.value } 
                                                                } 
                                                            });
                                                        }}
                                                        className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-blue-500/30 rounded-2xl text-xs outline-none focus:border-blue-500 transition-all font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase text-blue-500 ml-1 font-black">Link del Botón (URL)</label>
                                                    <input 
                                                        type="text"
                                                        placeholder="https://educruci.vercel.app/?ref=..."
                                                        value={globalVars.META_EMAIL_CONFIG?.[globalVars.META_EMAIL_CONFIG?.current || 'welcome']?.buttonUrl || ''}
                                                        onChange={(e) => {
                                                            const current = globalVars.META_EMAIL_CONFIG?.current || 'welcome';
                                                            updateGlobalVars({ 
                                                                META_EMAIL_CONFIG: { 
                                                                    ...globalVars.META_EMAIL_CONFIG, 
                                                                    [current]: { ...globalVars.META_EMAIL_CONFIG[current], buttonUrl: e.target.value } 
                                                                } 
                                                            });
                                                        }}
                                                        className="w-full px-5 py-4 bg-[var(--edu-bg)] border border-blue-500/30 rounded-2xl text-xs outline-none focus:border-blue-500 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vista Previa Dinámica */}
                                    <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-[var(--edu-border)] flex flex-col items-center justify-center">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] mb-8 opacity-40">Vista Previa en Tiempo Real</div>
                                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
                                            <div className="p-8">
                                                <h1 className="text-[#3b82f6] text-2xl font-black text-center mb-6">¡Hola, [Nombre]!</h1>
                                                <p className="text-sm text-slate-600 leading-relaxed text-center whitespace-pre-line mb-8 font-medium italic">
                                                    "{globalVars.META_EMAIL_CONFIG?.[globalVars.META_EMAIL_CONFIG?.current || 'welcome']?.body?.replace('{agenda}', '15 de Mayo a las 3:00 PM')}"
                                                </p>
                                                
                                                {(globalVars.META_EMAIL_CONFIG?.current === 'welcome' || globalVars.META_EMAIL_CONFIG?.current === 'trial') && (
                                                    <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
                                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Tus datos de acceso:</p>
                                                        <p className="text-sm text-slate-700 m-0">📧 <strong>[usuario@email.com]</strong></p>
                                                        <p className="text-sm text-slate-700 m-0 mt-1">🔑 <strong>[clave_segura]</strong></p>
                                                    </div>
                                                )}

                                                <div className="text-center">
                                                    <span className="bg-[#3b82f6] text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest inline-block shadow-lg shadow-blue-500/30">
                                                        {globalVars.META_EMAIL_CONFIG?.[globalVars.META_EMAIL_CONFIG?.current || 'welcome']?.buttonText || (globalVars.META_EMAIL_CONFIG?.current === 'welcome' ? 'Acceder ahora' : 'Ver detalles')}
                                                    </span>
                                                </div>
                                                <hr className="my-8 border-slate-100" />
                                                <p className="text-[9px] text-slate-400 text-center uppercase tracking-tighter font-bold">
                                                    {globalVars.META_EMAIL_CONFIG?.[globalVars.META_EMAIL_CONFIG?.current || 'welcome']?.footer}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                )}

                {activeModule === 'TUTORIALS' && (
                    <div className="flex flex-col gap-8 h-full animate-fade-in z-10 overflow-y-auto premium-scrollbar pb-8 px-4">
                        <div className="flex items-center justify-between border-b border-[var(--edu-border)] pb-4">
                            <div>
                                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-[var(--edu-text-main)]">Gestión de <span className="text-[var(--edu-accent)]">Tutoriales</span></h1>
                                <p className="text-[10px] text-[var(--edu-text-muted)] mt-1 uppercase font-bold tracking-wider">Control de videos para el Centro de Capacitación</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={handleSaveTutorials}
                                    disabled={isSavingTutorials}
                                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                                        isSavingTutorials
                                        ? 'bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white shadow-lg shadow-emerald-500/10'
                                    }`}
                                >
                                    <Shield size={12} />
                                    {isSavingTutorials ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                                <button 
                                    onClick={() => {
                                        const title = window.prompt("📝 TÍTULO DEL NUEVO TUTORIAL:");
                                        if (!title) return;
                                        const url = window.prompt("🔗 ENLACE DE YOUTUBE (Embed o Link normal):");
                                        if (!url) return;
                                        
                                        const videoId = url.includes('embed/') ? url.split('embed/')[1].split('?')[0] : (url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop());
                                        const cleanUrl = `https://www.youtube.com/embed/${videoId}`;
                                        
                                        const newTutorial = {
                                            id: 't_' + Date.now(),
                                            title: title,
                                            url: cleanUrl,
                                            duration: '00:00',
                                            date: new Date().toLocaleDateString('es-PE'),
                                            description: 'Nuevo tutorial añadido desde el panel de administración.'
                                        };
                                        
                                        const currentTutorials = globalVars.META_TUTORIALS?.length > 0 ? globalVars.META_TUTORIALS : [
                                            { 
                                                id: 't1', 
                                                title: 'EduCruci: Tutorial de Inicio a Fin', 
                                                url: 'https://www.youtube.com/embed/9forXItrWGo',
                                                duration: '01:29', 
                                                date: '19 Abr 2026',
                                                description: 'Mira el video, es corto, y con él entenderás claramente cómo usar la aplicación.'
                                            }
                                        ];
                                        
                                        updateGlobalVars({ META_TUTORIALS: [...currentTutorials, newTutorial] });
                                    }}
                                    className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-[var(--edu-accent)] text-white shadow-lg shadow-[var(--edu-accent)]/20 active:scale-95 transition-all"
                                >
                                    + Nuevo Video
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {(globalVars.META_TUTORIALS?.length > 0 ? globalVars.META_TUTORIALS : [
                                { 
                                    id: 't1', 
                                    title: 'EduCruci: Tutorial de Inicio a Fin', 
                                    url: 'https://www.youtube.com/embed/9forXItrWGo',
                                    duration: '01:29', 
                                    date: '19 Abr 2026',
                                    description: 'Mira el video, es corto, y con él entenderás claramente cómo usar la aplicación.'
                                }
                            ]).map((tutorial, index) => (
                                <div key={tutorial.id} className="bg-[var(--edu-bg-card)] rounded-[2rem] border border-[var(--edu-border)] p-8 shadow-xl flex flex-col md:flex-row gap-8 items-center group hover:border-[var(--edu-accent)]/30 transition-all">
                                    <div className="w-full md:w-64 aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative">
                                        {/* Blindaje de Doble Capa Mini */}
                                        <div className="absolute inset-0 z-[100] pointer-events-none">
                                            <div className="absolute top-0 left-0 w-full h-[50px] bg-[#00000001] pointer-events-auto cursor-not-allowed"></div>
                                            <div className="absolute bottom-[10px] left-0 w-full h-[45px] bg-[#00000001] pointer-events-auto cursor-not-allowed"></div>
                                        </div>
                                        <iframe width="100%" height="100%" src={`${tutorial.url}${tutorial.url.includes('?') ? '&' : '?'}modestbranding=1&rel=0&showinfo=0&controls=1&fs=0`} title={tutorial.title} frameBorder="0"></iframe>
                                    </div>
                                    
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-lg font-black text-white uppercase tracking-tight">{tutorial.title}</h3>
                                                <p className="text-[10px] text-[var(--edu-text-muted)] mt-1 italic">{tutorial.description}</p>
                                            </div>
                                            <div className="bg-[var(--edu-accent)]/10 text-[var(--edu-accent)] px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                                {tutorial.duration}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <button 
                                                onClick={() => {
                                                    const newUrl = window.prompt("🔗 EDITAR ENLACE DE YOUTUBE\nIngrese el enlace de 'Insertar' (embed) o el ID del video:", tutorial.url);
                                                    if (newUrl) {
                                                        const videoId = newUrl.includes('embed/') ? newUrl.split('embed/')[1].split('?')[0] : (newUrl.includes('v=') ? newUrl.split('v=')[1].split('&')[0] : newUrl.split('/').pop());
                                                        const cleanUrl = `https://www.youtube.com/embed/${videoId}`;
                                                        const updatedTutorials = (globalVars.META_TUTORIALS || []).length > 0 ? [...globalVars.META_TUTORIALS] : [{...tutorial}];
                                                        updatedTutorials[index] = { ...updatedTutorials[index], url: cleanUrl };
                                                        updateGlobalVars({ META_TUTORIALS: updatedTutorials });
                                                    }
                                                }}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-xl text-[10px] font-black uppercase hover:bg-[var(--edu-accent)] hover:text-white transition-all active:scale-95"
                                            >
                                                <Video size={14} /> Cambiar Video
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const newTitle = window.prompt("📝 EDITAR TÍTULO", tutorial.title);
                                                    if (newTitle) {
                                                        const updatedTutorials = (globalVars.META_TUTORIALS || []).length > 0 ? [...globalVars.META_TUTORIALS] : [{...tutorial}];
                                                        updatedTutorials[index] = { ...updatedTutorials[index], title: newTitle };
                                                        updateGlobalVars({ META_TUTORIALS: updatedTutorials });
                                                    }
                                                }}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-xl text-[10px] font-black uppercase hover:bg-[var(--edu-accent)] hover:text-white transition-all active:scale-95"
                                            >
                                                <ListChecks size={14} /> Editar Título
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm("🗑️ ¿ESTÁS SEGURO?\nEl tutorial será eliminado permanentemente del sistema.")) {
                                                        const currentTutorials = globalVars.META_TUTORIALS?.length > 0 ? globalVars.META_TUTORIALS : [
                                                            { 
                                                                id: 't1', 
                                                                title: 'EduCruci: Tutorial de Inicio a Fin', 
                                                                url: 'https://www.youtube.com/embed/9forXItrWGo',
                                                                duration: '01:29', 
                                                                date: '19 Abr 2026',
                                                                description: 'Mira el video, es corto, y con él entenderás claramente cómo usar la aplicación.'
                                                            }
                                                        ];
                                                        const updatedTutorials = currentTutorials.filter(t => t.id !== tutorial.id);
                                                        updateGlobalVars({ META_TUTORIALS: updatedTutorials });
                                                    }
                                                }}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                                title="Eliminar Tutorial"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* BARRA DE ACCIONES MASIVAS */}
                {selectedUsers.length > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 shadow-2xl rounded-2xl p-4 flex items-center gap-6 z-[100] animate-in slide-in-from-bottom-8 duration-300">
                        <div className="flex items-center gap-2 pl-2">
                            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs">
                                {selectedUsers.length}
                            </div>
                            <span className="text-[10px] font-black uppercase text-white/60 tracking-widest">Seleccionados</span>
                        </div>

                        <div className="h-8 w-px bg-white/10"></div>

                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase text-white/40 mr-2">Enviar Correo:</span>
                            {[
                                { id: 'welcome', label: 'Bienvenida', icon: <Mail size={12} /> },
                                { id: 'expiring', label: 'Vencimiento', icon: <Clock size={12} /> },
                                { id: 'reactivate', label: 'Reactivar', icon: <LogOut size={12} /> },
                                { id: 'generic', label: 'Aviso', icon: <Shield size={12} /> },
                                { id: 'trial', label: 'Prueba', icon: <Calendar size={12} /> }
                            ].map(action => (
                                <button 
                                    key={action.id}
                                    onClick={() => handleBulkEmail(action.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase text-white transition-all active:scale-95"
                                >
                                    {action.icon} {action.label}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={() => setSelectedUsers([])}
                            className="p-2 text-white/40 hover:text-white transition-colors"
                            title="Deseleccionar todos"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
                {activeModule === 'BULK_IMPORT' && (
                    <div className="flex flex-col gap-8 h-full animate-fade-in z-10 overflow-y-auto premium-scrollbar pb-8 px-4">
                        <div className="flex items-center justify-between border-b border-[var(--edu-border)] pb-4">
                            <div>
                                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-[var(--edu-text-main)]">Módulo de <span className="text-purple-500">Migración</span></h1>
                                <p className="text-[10px] text-[var(--edu-text-muted)] mt-1 uppercase font-bold tracking-wider">Migra usuarios de Google Groups a la plataforma Premium</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-[var(--edu-bg-card)] p-8 rounded-[2.5rem] border border-[var(--edu-border)] shadow-xl space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                            <Sparkles size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-[var(--edu-text-main)]">Pegar Lista de Correos</h2>
                                            <p className="text-xs text-[var(--edu-text-muted)]">Copia los correos de tu Excel o CSV y pégalos aquí.</p>
                                        </div>
                                    </div>

                                    <textarea 
                                        value={bulkEmails}
                                        onChange={(e) => setBulkEmails(e.target.value)}
                                        disabled={isMigrating}
                                        placeholder="ejemplo1@gmail.com&#10;ejemplo2@hotmail.com&#10;..."
                                        className="w-full h-[300px] p-6 bg-[var(--edu-bg)] border-2 border-[var(--edu-border)] rounded-3xl text-xs outline-none focus:border-purple-500 transition-all font-mono premium-scrollbar resize-none"
                                    ></textarea>

                                    <button 
                                        onClick={handleBulkMigration}
                                        disabled={isMigrating || !bulkEmails.trim()}
                                        className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                                            isMigrating 
                                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20'
                                        }`}
                                    >
                                        {isMigrating ? (
                                            <>
                                                <Clock size={18} className="animate-spin" />
                                                Procesando Migración ({bulkStatus.processed}/{bulkStatus.total})
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={18} />
                                                Iniciar Migración Masiva (1 Año Premium)
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-[var(--edu-bg-card)] p-8 rounded-[2.5rem] border border-[var(--edu-border)] shadow-xl space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)] border-b border-[var(--edu-border)] pb-2">Resumen de Acción</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Check size={14} /></div>
                                            <span className="text-xs font-bold">Plan: 365 días (1 Año)</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><User size={14} /></div>
                                            <span className="text-xs font-bold">Nombre: "Docente"</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500"><Mail size={14} /></div>
                                            <span className="text-xs font-bold">Envío automático de correo</span>
                                        </div>
                                    </div>
                                    
                                    {isMigrating && (
                                        <div className="pt-6 space-y-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase">
                                                <span>Progreso</span>
                                                <span>{Math.round((bulkStatus.processed / bulkStatus.total) * 100)}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-purple-500 transition-all duration-300"
                                                    style={{ width: `${(bulkStatus.processed / bulkStatus.total) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-3xl space-y-2">
                                    <div className="flex items-center gap-2 text-amber-500">
                                        <Info size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-tighter">Importante</span>
                                    </div>
                                    <p className="text-[10px] text-amber-500/80 leading-relaxed italic">
                                        Esta acción es irreversible. Se enviarán correos reales a todos los destinatarios válidos de la lista. Asegúrate de que la plantilla de "Bienvenida" esté configurada correctamente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeModule === 'AUDIT' && (
                    <div className="flex flex-col gap-8 h-full animate-fade-in z-10 overflow-y-auto premium-scrollbar pb-8 px-4">
                        <div className="flex items-center justify-between border-b border-[var(--edu-border)] pb-4">
                            <div>
                                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-[var(--edu-text-main)]">Registro de <span className="text-emerald-500">Actividad</span></h1>
                                <p className="text-[10px] text-[var(--edu-text-muted)] mt-1">Monitoreo en tiempo real de las acciones de los usuarios</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <FileSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--edu-text-muted)]" />
                                    <input 
                                        type="text"
                                        placeholder="Buscar por nombre o correo..."
                                        value={auditSearch}
                                        onChange={(e) => setAuditSearch(e.target.value)}
                                        className="pl-10 pr-4 py-2 bg-[var(--edu-bg-sidebar)]/50 border border-[var(--edu-border)] rounded-xl text-[10px] outline-none focus:border-emerald-500/50 transition-all w-64 font-bold"
                                    />
                                </div>
                                <button 
                                    onClick={handleClearLogs}
                                    className="px-4 py-2 border border-red-500/30 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500/5 transition-all flex items-center gap-2 active:scale-95"
                                    title="Borrar registros de más de 90 días"
                                >
                                    <Trash2 size={12} />
                                    Limpiar Historial (+90d)
                                </button>
                                <button 
                                    onClick={handleSyncLogs}
                                    className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                                >
                                    <Sparkles size={12} />
                                    Sincronizar Actividad
                                </button>
                                <button 
                                    onClick={() => setActiveModule('AUDIT')} 
                                    className="p-2 hover:bg-emerald-500/10 rounded-full text-emerald-500 transition-all"
                                >
                                    <FileSearch size={20} />
                                </button>
                            </div>
                        </div>

                        {loadingLogs ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
                            </div>
                        ) : (
                            <div className="bg-[var(--edu-bg-card)] rounded-[2.5rem] border border-[var(--edu-border)] shadow-xl overflow-y-auto max-h-[600px] premium-scrollbar">
                                <table className="w-full text-left border-collapse sticky-header">
                                    <thead className="sticky top-0 z-10 bg-[var(--edu-bg-card)] backdrop-blur-md">
                                        <tr className="bg-[var(--edu-bg-sidebar)]/50">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Fecha / Hora</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Usuario</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Acción</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--edu-text-muted)]">Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--edu-border)]">
                                        {logs.filter(log => {
                                            if (!auditSearch.trim()) return true;
                                            const logUser = globalVars.META_USERS?.find(u => String(u.id) === String(log.user_id));
                                            const search = auditSearch.toLowerCase();
                                            return (
                                                (logUser?.fullName || '').toLowerCase().includes(search) ||
                                                (logUser?.email || '').toLowerCase().includes(search) ||
                                                log.action.toLowerCase().includes(search)
                                            );
                                        }).map((log) => (
                                            <tr key={log.id} className="hover:bg-emerald-500/5 transition-all">
                                                <td className="px-6 py-4 text-[11px] font-medium text-[var(--edu-text-muted)]">
                                                    {new Date(log.created_at).toLocaleString('es-PE')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        {(() => {
                                                            const logUser = globalVars.META_USERS?.find(u => String(u.id) === String(log.user_id));
                                                            return (
                                                                <>
                                                                    <span className="text-[11px] font-bold">{logUser?.fullName || 'Usuario Desconocido'}</span>
                                                                    <span className="text-[9px] opacity-60 font-mono">{logUser?.email || 'ID: ' + log.user_id}</span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase flex items-center gap-2 w-fit ${
                                                        log.action === 'DESCARGA_WORD' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                                        log.action === 'INTENTO_DESCARGA_PRUEBA_COMPLETA' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/5' :
                                                        log.action === 'INTENTO_DESCARGA_INCOMPLETA' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                                        log.action === 'START_TRIAL_SESSION' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' : 
                                                        log.action === 'INCORPORAR_TABLA_VII' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                        log.action === 'LOGIN_SUCCESS' ? 'bg-slate-800 text-slate-300 border border-slate-700' :
                                                        log.action === 'VIO_TUTORIAL' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                        'bg-slate-500/10 text-slate-500 border border-slate-500/10'
                                                    }`}>
                                                        {log.details?.device === 'Mobile' ? <Smartphone size={10} /> : log.details?.device === 'Desktop' ? <Monitor size={10} /> : null}
                                                        {log.action.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[10px] text-[var(--edu-text-muted)]">
                                                    {log.action === 'DESCARGA_WORD' ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-[var(--edu-text-main)]">{log.details?.archivo}</span>
                                                            <span className="opacity-70 italic text-[9px]">Tipo: {log.details?.tipo}</span>
                                                        </div>
                                                    ) : log.action === 'INTENTO_DESCARGA_PRUEBA_COMPLETA' ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-black text-amber-500 uppercase tracking-tighter">🔥 Potencial Cliente (Completo I-VII)</span>
                                                            <span className="opacity-70 text-[9px] italic">Vio mensaje de suscripción ({log.details?.device || 'PC'})</span>
                                                        </div>
                                                    ) : log.action === 'INTENTO_DESCARGA_INCOMPLETA' ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-rose-500 uppercase tracking-tighter">⚠️ Intento de descarga (Incompleto)</span>
                                                            <span className="opacity-80 text-[9px] text-rose-500/70 font-black">
                                                                Faltan: {Object.entries(log.details?.completion || {})
                                                                    .filter(([_, v]) => !v)
                                                                    .map(([k]) => k)
                                                                    .join(', ') || 'N/A'}
                                                            </span>
                                                        </div>
                                                    ) : log.action === 'LOGIN_SUCCESS' ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-slate-400">Ingreso ({log.details?.device})</span>
                                                            <span className="opacity-50 text-[8px] font-mono">Res: {log.details?.screen || 'N/A'}</span>
                                                        </div>
                                                    ) : log.action === 'INCORPORAR_TABLA_VII' ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-blue-500">{log.details?.titulo}</span>
                                                            <span className="opacity-70 text-[9px]">{log.details?.area} - {log.details?.grado}</span>
                                                        </div>
                                                    ) : log.action === 'VIO_TUTORIAL' ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-blue-400">Vio Tutorial</span>
                                                            <span className="opacity-70 text-[9px] italic">{log.details?.video_title}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="font-mono text-[9px] opacity-60 truncate block max-w-xs">{JSON.stringify(log.details)}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {logs.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-[10px] text-[var(--edu-text-muted)] italic">
                                                    No hay actividad registrada aún.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* MODAL DE ACTUALIZACIÓN DE PLAN (RESTAURADO) */}
                {planModalUser && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-[var(--edu-bg-card)] w-full max-w-2xl rounded-[2.5rem] border border-[var(--edu-border)] shadow-2xl overflow-hidden animate-zoom-in max-h-[90vh] flex flex-col">
                            {/* Header */}
                            <div className="p-8 pb-4 flex items-center justify-between border-b border-[var(--edu-border)]">
                                <h3 className="text-lg font-black uppercase tracking-tight">Actualizar <span className="text-amber-500">Suscripción</span></h3>
                                <button onClick={() => setPlanModalUser(null)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-xl transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content (Scrollable) */}
                            <div className="p-8 pt-6 space-y-6 overflow-y-auto premium-scrollbar flex-1">
                                <div className="bg-[var(--edu-bg)]/50 p-4 rounded-2xl border border-[var(--edu-border)] flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-lg">
                                        {planModalUser.fullName?.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold">{planModalUser.fullName}</div>
                                        <div className="text-[10px] text-[var(--edu-text-muted)]">{planModalUser.email}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Nuevo Plan</label>
                                            <select 
                                                value={newPlan}
                                                onChange={(e) => setNewPlan(e.target.value)}
                                                className="w-full px-4 py-3 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-xl text-xs outline-none cursor-pointer"
                                            >
                                                <option value="mensual">Mensual (30 días)</option>
                                                <option value="semestral">Semestral (180 días)</option>
                                                <option value="anual">Anual (365 días)</option>
                                                <option value="prueba">Sesión de Prueba</option>
                                            </select>
                                        </div>

                                        {newPlan !== 'prueba' ? (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Días Personalizados (Opcional)</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="Ej: 30"
                                                    className="w-full px-4 py-3 bg-[var(--edu-bg)] border border-[var(--edu-border)] rounded-xl text-xs outline-none" 
                                                />
                                            </div>
                                        ) : (
                                            <div className="space-y-2 animate-fade-in">
                                                <label className="text-[9px] font-black uppercase text-[var(--edu-accent)] ml-1">Fecha y Hora de la Cita</label>
                                                <input 
                                                    type="datetime-local" 
                                                    min={formatPeruLocal(getPeruDate())}
                                                    value={modalScheduledTime}
                                                    onClick={(e) => e.target.showPicker?.()}
                                                    onChange={(e) => setModalScheduledTime(e.target.value)}
                                                    className="w-full px-4 py-3 bg-[var(--edu-bg)] border border-[var(--edu-accent)]/30 rounded-xl text-xs outline-none focus:border-[var(--edu-accent)] cursor-pointer" 
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-3 bg-[var(--edu-bg)]/50 p-4 rounded-2xl border border-[var(--edu-border)]">
                                            <label className="text-[9px] font-black uppercase text-[var(--edu-text-muted)] ml-1">Niveles Permitidos</label>
                                            <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-1">
                                                {['Inicial', 'Primaria', 'Secundaria', 'EduCruci'].map(lvl => (
                                                    <label key={lvl} className="flex items-center gap-2 cursor-pointer group">
                                                        <input 
                                                            type="checkbox"
                                                            checked={modalLevels.includes(lvl)}
                                                            onChange={(e) => {
                                                                const isChecked = e.target.checked;
                                                                const levels = isChecked 
                                                                    ? [...modalLevels, lvl]
                                                                    : modalLevels.filter(l => l !== lvl);
                                                                    
                                                                let newAreas = [...modalAreas];
                                                                if (lvl === 'Inicial') {
                                                                    const iniAreas = ["Matemática", "Comunicación", "Personal Social", "Ciencia y Tecnología", "Psicomotriz", "Castellano como Segunda Lengua"].map(a => `INI_${a}`);
                                                                    if (isChecked) {
                                                                        iniAreas.forEach(a => {
                                                                            if (!newAreas.includes(a)) newAreas.push(a);
                                                                        });
                                                                    } else {
                                                                        newAreas = newAreas.filter(a => !iniAreas.includes(a));
                                                                    }
                                                                } else if (lvl === 'Primaria') {
                                                                    const priAreas = ["Matemática", "Comunicación", "Castellano como Segunda Lengua", "Quechua Collao", "Quechua Chanca", "Quechua Central", "Personal Social", "Ciencia y Tecnología", "Arte y Cultura", "Educación Física", "Educación Religiosa", "Inglés como Lengua Extranjera"].map(a => `PRI_${a}`);
                                                                    if (isChecked) {
                                                                        priAreas.forEach(a => {
                                                                            if (!newAreas.includes(a)) newAreas.push(a);
                                                                        });
                                                                    } else {
                                                                        newAreas = newAreas.filter(a => !priAreas.includes(a));
                                                                    }
                                                                }
                                                                setModalLevels(levels);
                                                                setModalAreas(newAreas);
                                                            }}
                                                            className="w-4 h-4 rounded border-[var(--edu-border)] accent-[var(--edu-logo-blue)]"
                                                        />
                                                        <span className="text-xs font-bold group-hover:text-[var(--edu-logo-blue)] transition-colors">{lvl}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 bg-[var(--edu-bg)]/50 p-6 rounded-2xl border border-[var(--edu-border)] shadow-inner">
                                        <label className="text-[10px] font-black uppercase text-[var(--edu-text-muted)] ml-1 tracking-widest block mb-2">
                                            🎯 Áreas Permitidas
                                        </label>
                                        
                                        <div className="space-y-4 max-h-[300px] overflow-y-auto premium-scrollbar pr-2">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 pb-1 border-b border-[var(--edu-border)]">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-[var(--edu-text-muted)]">Inicial</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {["Matemática", "Comunicación", "Personal Social", "Ciencia y Tecnología", "Psicomotriz", "Castellano como Segunda Lengua"].map(area => (
                                                        <AreaChip 
                                                            key={`modal-ini-${area}`} 
                                                            area={area} 
                                                            selected={modalAreas.includes(`INI_${area}`) || modalAreas.includes(area)} 
                                                            onToggle={() => {
                                                                const isSelected = modalAreas.includes(`INI_${area}`) || modalAreas.includes(area);
                                                                const areas = isSelected
                                                                    ? modalAreas.filter(a => a !== `INI_${area}` && a !== area)
                                                                    : [...modalAreas, `INI_${area}`];
                                                                setModalAreas(areas);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 pb-1 border-b border-[var(--edu-border)]">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-[var(--edu-text-muted)]">Primaria</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {["Matemática", "Comunicación", "Castellano como Segunda Lengua", "Quechua Collao", "Quechua Chanca", "Quechua Central", "Personal Social", "Ciencia y Tecnología", "Arte y Cultura", "Educación Física", "Educación Religiosa", "Inglés como Lengua Extranjera", "Tutoría y Orientación Educativa"].map(area => (
                                                        <AreaChip 
                                                            key={`modal-pri-${area}`} 
                                                            area={area} 
                                                            selected={modalAreas.includes(`PRI_${area}`) || modalAreas.includes(area)} 
                                                            onToggle={() => {
                                                                const isSelected = modalAreas.includes(`PRI_${area}`) || modalAreas.includes(area);
                                                                const areas = isSelected
                                                                    ? modalAreas.filter(a => a !== `PRI_${area}` && a !== area)
                                                                    : [...modalAreas, `PRI_${area}`];
                                                                setModalAreas(areas);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 pb-1 border-b border-[var(--edu-border)]">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-[var(--edu-text-muted)]">Secundaria</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {["Matemática", "Comunicación", "Castellano como Segunda Lengua", "Quechua Collao", "Quechua Chanca", "Quechua Central", "Ciencias Sociales", "Desarrollo Personal, Ciudadanía y Cívica", "Ciencia y Tecnología", "Arte y Cultura", "Educación Física", "Educación para el Trabajo", "Educación Religiosa", "Inglés como Lengua Extranjera", "Tutoría y Orientación Educativa"].map(area => (
                                                        <AreaChip 
                                                            key={`modal-sec-${area}`} 
                                                            area={area} 
                                                            selected={modalAreas.includes(`SEC_${area}`) || modalAreas.includes(area)} 
                                                            onToggle={() => {
                                                                const isSelected = modalAreas.includes(`SEC_${area}`) || modalAreas.includes(area);
                                                                const areas = isSelected
                                                                    ? modalAreas.filter(a => a !== `SEC_${area}` && a !== area)
                                                                    : [...modalAreas, `SEC_${area}`];
                                                                setModalAreas(areas);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-8 pt-4 border-t border-[var(--edu-border)]">
                                <button 
                                    onClick={async () => {
                                        setIsSaving(true);
                                        try {
                                            let finalDays = 30;
                                            if (newPlan === 'anual') finalDays = 365;
                                            if (newPlan === 'semestral') finalDays = 180;
                                            if (newPlan === 'prueba') finalDays = 1;

                                            const futureDate = new Date();
                                            futureDate.setDate(futureDate.getDate() + finalDays);
                                            const end = futureDate.toISOString().split('T')[0];

                                            const updatedUser = { 
                                                ...planModalUser, 
                                                plan: newPlan, 
                                                allowedLevels: modalLevels,
                                                allowedAreas: modalAreas,
                                                scheduledTime: newPlan === 'prueba' ? modalScheduledTime : planModalUser.scheduledTime,
                                                trialStartTime: newPlan === 'prueba' ? (planModalUser.trialStartTime || getPeruDate().toISOString()) : planModalUser.trialStartTime,
                                                subscription: { ...planModalUser.subscription, end: end } 
                                            };

                                            // PERSISTENCIA REAL EN SUPABASE
                                            await db.upsertUser(updatedUser, user?.email, user?.password);

                                            const updatedUsers = globalVars.META_USERS.map(u => 
                                                u.id === planModalUser.id ? updatedUser : u
                                            );

                                            updateGlobalVars({ META_USERS: updatedUsers });
                                            alert("✅ ¡ÉXITO! La suscripción se ha guardado en la nube.");
                                            setPlanModalUser(null);
                                        } catch (err) {
                                            console.error("Error al actualizar:", err);
                                            alert("❌ ERROR: No se pudo guardar en la base de datos.\n\n" + err.message);
                                        } finally {
                                            setIsSaving(false);
                                        }
                                    }}
                                    className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                                >
                                    Confirmar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
        );
    };
    
    export default AdminView;
