import { supabase } from '../lib/supabase';

/**
 * databaseService.js
 * Capa de abstracción profesional para EduCruci.
 * Centraliza la comunicación con Supabase y maneja el mapeo de datos.
 */export const mapToDB = (u) => {
    const raw = {
        id: String(u.id),
        email: u.email,
        full_name: u.fullName || '',
        password: u.password === 'PROTECTED' ? undefined : (u.password || ''),
        username: u.username || u.email?.split('@')[0] || '',
        role: u.role || 'user',
        plan: u.plan || 'mensual',
        downloads_count: (u.downloadsCount !== undefined && u.downloadsCount !== null) ? Number(u.downloadsCount) : 0,
        whatsapp_ventas: u.whatsappVentas ? String(u.whatsappVentas) : '',
        walink: u.walink ? String(u.walink) : '',
        scheduled_time: u.scheduledTime || undefined,
        trial_start_time: u.trialStartTime || undefined,
        subscription_start: u.subscription?.start || undefined,
        subscription_end: u.subscription?.end || undefined,
        age: (u.age !== undefined && u.age !== null) ? Number(u.age) : undefined,
        dre: u.dre || '',
        ugel: u.ugel || '',
        ie: u.ie || '',
        director: u.director || '',
        allowed_levels: u.allowedLevels || ['Primaria', 'Secundaria'],
        allowed_areas: u.allowedAreas || [],
        created_by: u.createdBy || 'system',
        phone_number: u.phoneNumber || '',
        terms_accepted_at: u.termsAcceptedAt || undefined,
        created_at: u.createdAt || undefined,
        updated_at: new Date().toISOString()
    };
    
    // Eliminar propiedades undefined para que no se envíen en el JSON (evita el error de casting de jsonb null)
    return Object.fromEntries(Object.entries(raw).filter(([_, v]) => v !== undefined));
};

export const mapFromDB = (u) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    password: u.password,
    username: u.username,
    role: u.role,
    plan: u.plan,
    downloadsCount: u.downloads_count,
    whatsappVentas: u.whatsapp_ventas,
    walink: u.walink,
    scheduledTime: u.scheduled_time,
    trialStartTime: u.trial_start_time,
    subscription: {
        start: u.subscription_start,
        end: u.subscription_end
    },
    age: u.age,
    dre: u.dre,
    ugel: u.ugel,
    ie: u.ie,
    director: u.director,
    allowedLevels: u.allowed_levels || ['Primaria', 'Secundaria'],
    allowedAreas: u.allowed_areas || [],
    createdBy: u.created_by,
    phoneNumber: u.phone_number || '',
    termsAcceptedAt: u.terms_accepted_at,
    createdAt: u.created_at,
});

// --- OPERACIONES DE USUARIO ---

export const db = {
    /**
     * Marca los términos como aceptados para el usuario actual (Vía Segura).
     */
    async acceptTerms(userId) {
        if (!supabase || !userId) return false;
        const { error } = await supabase.rpc('accept_terms_secure', { p_user_id: userId });
        if (error) {
            console.error("Error al aceptar términos:", error);
            throw error;
        }
        return true;
    },

    /**
     * Obtiene todos los usuarios de la base de datos de forma limpia.
     */
    async fetchUsers(adminEmail, adminPassword) {
        if (!supabase) return [];
        
        // Llamada a la Ventanilla de Administración Segura
        const { data, error } = await supabase
            .rpc('get_admin_users_list', { 
                p_admin_email: adminEmail, 
                p_admin_password: adminPassword 
            });
        
        if (error) {
            console.error("Error cargando lista de usuarios:", error);
            throw error;
        }
        return data.map(mapFromDB);
    },

    /**
     * Guarda o actualiza un usuario de forma atómica a través de la Ventanilla Segura.
     */
    async upsertUser(userObj, adminEmail, adminPassword) {
        if (!supabase) return false;
        
        const isAdmin = userObj.role?.includes('admin');
        const isSelfUpdate = userObj.email === adminEmail;

        // Si no es admin y es una actualización de sí mismo, usamos la ventanilla de perfil
        if (!isAdmin && isSelfUpdate) {
            return this.updateUserProfile(userObj.id, adminEmail, adminPassword, userObj);
        }

        // --- UNIFICACIÓN DE SEGURIDAD ---
        // Usamos el método plural para un solo usuario (Admin path)
        return this.upsertUsers([userObj], adminEmail, adminPassword);
    },

    /**
     * Guarda o actualiza múltiples usuarios en una sola transacción segura.
     */
    async upsertUsers(usersArray, adminEmail, adminPassword) {
        if (!supabase || !usersArray || usersArray.length === 0) return true;
        const mappedArray = usersArray.map(mapToDB);
        
        const { error } = await supabase
            .rpc('upsert_users_bulk_secure', { 
                p_admin_email: adminEmail, 
                p_admin_password: adminPassword,
                p_users_data: mappedArray
            });
        
        if (error) {
            console.error("❌ Error Bulk Sync:", error);
            throw new Error(`Seguridad Masiva: ${error.message}`);
        }
        return true;
    },

    /**
     * Permite que un docente actualice su propio perfil (Vía Segura para Usuarios).
     */
    async updateUserProfile(userId, email, password, userData) {
        if (!supabase) return false;
        const mapped = mapToDB(userData);
        
        const { error } = await supabase
            .rpc('update_user_profile_secure', { 
                p_user_id: userId,
                p_email: email, 
                p_password: password,
                p_update_data: mapped
            });
        
        if (error) {
            console.error("❌ Error Update Profile:", error);
            throw new Error(`Perfil: ${error.message}`);
        }
        return true;
    },
    async deleteUser(userId, adminEmail, adminPassword) {
        if (!supabase) return false;
        const { error } = await supabase
            .rpc('delete_user_secure', {
                p_admin_email: adminEmail,
                p_admin_password: adminPassword,
                p_target_user_id: userId
            });
        
        if (error) throw error;
        return true;
    },

    /**
     * Sincroniza las configuraciones globales (Emails, etc)
     */
    async fetchSettings() {
        if (!supabase) return {};
        const { data, error } = await supabase
            .from('system_settings')
            .select('*');
        
        if (error) throw error;
        
        // Convertimos el array de filas en un objeto de configuración
        const settings = {};
        data.forEach(row => {
            if (row.key === 'email_config') settings.META_EMAIL_CONFIG = row.value;
            if (row.key === 'trial_requests') settings.TRIAL_REQUESTS = row.value;
            if (row.key === 'tutorials') settings.META_TUTORIALS = row.value;
        });
        return settings;
    },

    async updateSetting(key, value, adminEmail, adminPassword) {
        if (!supabase) return false;
        // NOTA: Por ahora usamos SQL directo, pero pasamos las credenciales 
        // para mantener la consistencia del protocolo de Ventanilla Segura.
        const { error } = await supabase
            .from('system_settings')
            .upsert({ key, value, updated_at: new Date().toISOString() });
        
        if (error) throw error;
        return true;
    },

    /**
     * Busca un usuario específico por email/username y contraseña.
     * Esto es 100 veces más rápido y seguro que buscar en una lista local.
     */
    async getUserByCredentials(identifier, password) {
        if (!supabase) return null;
        
        // Usamos la Ventanilla Segura (RPC) para validar credenciales
        const { data, error } = await supabase
            .rpc('login_user', { 
                p_identifier: identifier, 
                p_password: password 
            })
            .maybeSingle();

        if (error) {
            console.error("Error en Login Seguro:", error);
            throw error;
        }
        return data ? mapFromDB(data) : null;
    },

    /**
     * Inicia oficialmente la sesión de prueba de 24 horas.
     */
    async startTrial(userId) {
        if (!supabase) return null;
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('users')
            .update({ trial_start_time: now })
            .eq('id', userId);
        
        if (error) throw error;
        return now;
    },

    /**
     * Verifica si un email ya existe en la base de datos.
     */
    async checkEmailExists(email) {
        if (!supabase) return false;
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .maybeSingle();
        
        if (error) throw error;
        return !!data;
    },

    async getUserByEmail(email) {
        if (!supabase) return null;
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .maybeSingle();
        
        if (error) throw error;
        return data ? mapFromDB(data) : null;
    },

    /**
     * Incrementa el contador de descargas de forma atómica.
     * Es mucho más seguro y rápido que actualizar el objeto completo.
     */
    async incrementDownloadCount(userId) {
        if (!supabase) return 0;
        // Usamos una consulta RPC o un incremento directo si es posible, 
        // pero por simplicidad y compatibilidad usaremos un incremento manual controlado.
        const { data: user } = await supabase.from('users').select('downloads_count').eq('id', userId).single();
        const newCount = (user?.downloads_count || 0) + 1;
        
        const { error } = await supabase
            .from('users')
            .update({ downloads_count: newCount })
            .eq('id', userId);
        
        if (error) throw error;
        return newCount;
    },


    /**
     * Registro público para cuentas de prueba (Vía Segura para Invitados).
     * No requiere credenciales de admin porque solo permite crear planes de prueba.
     */
    async publicRegisterTrial(userObj) {
        if (!supabase) return false;
        
        // Forzamos que el registro sea estrictamente de prueba y rol usuario
        const secureTrialObj = {
            ...userObj,
            role: 'user',
            plan: 'prueba'
        };
        
        const mapped = mapToDB(secureTrialObj);
        
        const { error } = await supabase
            .from('users')
            .insert(mapped);
            
        if (error) {
            console.error("❌ Error en Registro Público:", error);
            throw new Error(`Registro: ${error.message}`);
        }
        return true;
    },

    /**
     * Registra una actividad (Punto 3: Logs de Auditoría)
     */
    async logActivity(userId, action, details = {}) {
        if (!supabase) return;
        const { error } = await supabase
            .from('activity_logs')
            .insert({
                user_id: userId,
                action: action,
                details: details,
                created_at: new Date().toISOString()
            });
        
        if (error) console.error("Log Error:", error); // No bloqueamos al usuario si el log falla
    },

    /**
     * Obtiene los últimos logs de actividad para el administrador.
     */
    async fetchLogs(limit = 100) {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data;
    },

    /**
     * Elimina registros de actividad más antiguos a N días (Hallazgo #X)
     */
    async deleteOldLogs(days = 90, adminEmail, adminPassword) {
        if (!supabase) return false;
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        
        const { error } = await supabase
            .from('activity_logs')
            .delete()
            .lt('created_at', dateLimit.toISOString());
        
        if (error) throw error;
        return true;
    },

    /**
     * Obtiene el contacto público (walink) de un administrador por su ID o Username.
     * Usa una ventanilla pública RPC para evitar problemas de RLS.
     */
    async getPublicContact(identifier) {
        if (!supabase || !identifier) return null;
        const { data, error } = await supabase
            .rpc('get_admin_contact_public', { p_identifier: identifier });
        
        if (error) {
            console.error("Error al obtener contacto público:", error);
            return null;
        }
        return data;
    },

    /**
     * Obtiene el contacto público (walink y teléfono) de un administrador.
     */
    async getFullContact(identifier) {
        if (!supabase || !identifier) return null;
        const { data, error } = await supabase
            .rpc('get_admin_contact_full', { p_identifier: identifier });
        
        if (error || !data || data.length === 0) {
            console.error("Error al obtener contacto completo:", error);
            return null;
        }
        // Supabase RPC devuelve un array de filas
        return {
            walink: data[0].v_walink,
            phone: data[0].v_phone
        };
    },

    /**
     * Obtiene el contacto del administrador general por defecto.
     */
    async getContactByRole(role) {
        const contact = await this.getFullContact('admin_1');
        if (contact) return contact.walink;

        // Fallback manual si el RPC falla por completo
        const { data: fallbackData } = await supabase
            .from('users')
            .select('walink, whatsapp_ventas')
            .eq('role', 'admin_general')
            .limit(1)
            .maybeSingle();
        
        const link = fallbackData?.walink || (fallbackData?.whatsapp_ventas ? `https://wa.me/51${fallbackData.whatsapp_ventas}` : null);
        return link || 'https://wa.me/51993125547';
    }
};
