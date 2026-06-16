-- ====================================================================
-- 🚀 EDUCORE MASTER SETUP SCRIPT (v3.6) - CORRECCIÓN DE PERSISTENCIA
-- ====================================================================

-- 1. ACTIVAR CRIPTOGRAFÍA (Opcional, se mantiene por compatibilidad)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. ASEGURAR ESTRUCTURA DE TABLA (Sincronizado con Producción)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dre TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ugel TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ie TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_levels TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_areas TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- 3. FUNCIÓN DE "ENCRIPTACIÓN" (PASS-THROUGH PARA TEXTO PURO)
CREATE OR REPLACE FUNCTION encrypt_pdl_password(raw_password TEXT) 
RETURNS TEXT AS $$
BEGIN
    -- Retorna el texto tal cual, sin encriptar, como se solicitó
    RETURN raw_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCIÓN DE DESENCRIPTACIÓN (PARA COMPATIBILIDAD)
CREATE OR REPLACE FUNCTION decrypt_pdl_password(encrypted_password TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN encrypted_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. VENTANILLAS SEGURAS (RPC) - ACTUALIZADAS CON TODAS LAS COLUMNAS
-- --------------------------------------------------------------------

-- A. ACTUALIZACIÓN MASIVA (ADMIN) - VERSIÓN ROBUSTA
CREATE OR REPLACE FUNCTION upsert_users_bulk_secure(
    p_admin_email TEXT, 
    p_admin_password TEXT,
    p_users_data JSONB
)
RETURNS VOID AS $$
DECLARE
    v_role TEXT;
    user_record JSONB;
BEGIN
    -- Validación de Admin (Texto Puro)
    SELECT role INTO v_role FROM users 
    WHERE LOWER(email) = LOWER(p_admin_email) 
    AND password = p_admin_password;

    IF v_role NOT IN ('admin_general', 'admin_aux') THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    FOR user_record IN SELECT * FROM jsonb_array_elements(p_users_data)
    LOOP
        INSERT INTO users (
            id, email, username, full_name, password, role, plan, 
            whatsapp_ventas, phone_number, created_by,
            subscription_start, subscription_end, trial_start_time, scheduled_time,
            allowed_levels, allowed_areas,
            dre, ugel, ie, age, walink
        )
        VALUES (
            user_record->>'id',
            user_record->>'email',
            user_record->>'username',
            user_record->>'full_name',
            CASE 
                WHEN user_record->>'password' IS NULL THEN (SELECT password FROM users WHERE id = user_record->>'id')
                ELSE user_record->>'password' -- TEXTO PURO
            END,
            user_record->>'role',
            user_record->>'plan',
            user_record->>'whatsapp_ventas',
            user_record->>'phone_number',
            user_record->>'created_by',
            (user_record->>'subscription_start')::TIMESTAMPTZ,
            (user_record->>'subscription_end')::TIMESTAMPTZ,
            (user_record->>'trial_start_time')::TIMESTAMPTZ,
            (user_record->>'scheduled_time')::TIMESTAMPTZ,
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(user_record->'allowed_levels', '[]'::jsonb))),
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(user_record->'allowed_areas', '[]'::jsonb))),
            user_record->>'dre',
            user_record->>'ugel',
            user_record->>'ie',
            (user_record->>'age')::INTEGER,
            user_record->>'walink'
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            username = EXCLUDED.username,
            full_name = EXCLUDED.full_name,
            password = EXCLUDED.password, -- Permite actualizar clave
            role = EXCLUDED.role,
            plan = EXCLUDED.plan,
            whatsapp_ventas = EXCLUDED.whatsapp_ventas,
            phone_number = EXCLUDED.phone_number,
            subscription_start = EXCLUDED.subscription_start,
            subscription_end = EXCLUDED.subscription_end,
            trial_start_time = EXCLUDED.trial_start_time,
            scheduled_time = EXCLUDED.scheduled_time,
            allowed_levels = EXCLUDED.allowed_levels,
            allowed_areas = EXCLUDED.allowed_areas,
            walink = EXCLUDED.walink,
            -- BLINDAJE: Solo sobreescribe si el admin envía un valor no vacío
            dre = COALESCE(NULLIF(EXCLUDED.dre, ''), users.dre),
            ugel = COALESCE(NULLIF(EXCLUDED.ugel, ''), users.ugel),
            ie = COALESCE(NULLIF(EXCLUDED.ie, ''), users.ie),
            age = COALESCE(EXCLUDED.age, users.age),
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. ACTUALIZACIÓN DE PERFIL (Para el propio usuario) - ACTUALIZADA
CREATE OR REPLACE FUNCTION update_user_profile_secure(
    p_user_id TEXT,
    p_email TEXT,
    p_password TEXT,
    p_update_data JSONB
)
RETURNS VOID AS $$
DECLARE
    v_req_id TEXT;
BEGIN
    -- Validar credenciales (Texto Puro)
    SELECT id INTO v_req_id FROM users 
    WHERE id = p_user_id AND LOWER(email) = LOWER(p_email) 
    AND password = p_password;

    IF v_req_id IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;

    UPDATE users SET 
        full_name = COALESCE(p_update_data->>'full_name', full_name),
        phone_number = COALESCE(p_update_data->>'phone_number', phone_number),
        dre = COALESCE(p_update_data->>'dre', dre),
        ugel = COALESCE(p_update_data->>'ugel', ugel),
        ie = COALESCE(p_update_data->>'ie', ie),
        age = COALESCE((p_update_data->>'age')::INTEGER, age),
        walink = COALESCE(p_update_data->>'walink', walink),
        whatsapp_ventas = COALESCE(p_update_data->>'whatsapp_ventas', whatsapp_ventas),
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. LOGIN SEGURO (Texto Puro)
CREATE OR REPLACE FUNCTION login_user(p_identifier TEXT, p_password TEXT) 
RETURNS SETOF users AS $$
BEGIN
    RETURN QUERY 
    SELECT * FROM users 
    WHERE (LOWER(email) = LOWER(p_identifier) OR LOWER(username) = LOWER(p_identifier))
    AND password = p_password; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. OBTENER LISTA DE USUARIOS (ADMIN)
CREATE OR REPLACE FUNCTION get_admin_users_list(p_admin_email TEXT, p_admin_password TEXT)
RETURNS SETOF users AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Validación de Admin (Texto Puro)
    SELECT role INTO v_role FROM users 
    WHERE LOWER(email) = LOWER(p_admin_email) 
    AND password = p_admin_password;

    IF v_role NOT IN ('admin_general', 'admin_aux') THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    RETURN QUERY SELECT * FROM users ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

