-- ====================================================================
-- 🚀 MENTEACTIVA MASTER SETUP SCRIPT (v1.0)
-- ====================================================================

-- 1. ACTIVAR CRIPTOGRAFÍA
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. CREACIÓN DE TABLAS BASE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    full_name TEXT,
    password TEXT,
    role TEXT DEFAULT 'user',
    plan TEXT DEFAULT 'mensual',
    downloads_count INTEGER DEFAULT 0,
    whatsapp_ventas TEXT,
    phone_number TEXT,
    walink TEXT,
    created_by TEXT,
    age INTEGER,
    allowed_tools TEXT[] DEFAULT '{}',
    subscription_start TIMESTAMPTZ,
    subscription_end TIMESTAMPTZ,
    trial_start_time TIMESTAMPTZ,
    scheduled_time TIMESTAMPTZ,
    terms_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    action TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FUNCIÓN DE "ENCRIPTACIÓN" (PASS-THROUGH PARA TEXTO PURO)
CREATE OR REPLACE FUNCTION encrypt_pdl_password(raw_password TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN raw_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCIÓN DE DESENCRIPTACIÓN
CREATE OR REPLACE FUNCTION decrypt_pdl_password(encrypted_password TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN encrypted_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. VENTANILLAS SEGURAS (RPC)
-- A. ACTUALIZACIÓN MASIVA (ADMIN)
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
            whatsapp_ventas, phone_number, walink, created_by, age,
            subscription_start, subscription_end, trial_start_time, scheduled_time,
            allowed_tools
        )
        VALUES (
            user_record->>'id',
            user_record->>'email',
            user_record->>'username',
            user_record->>'full_name',
            CASE 
                WHEN user_record->>'password' IS NULL THEN (SELECT password FROM users WHERE id = user_record->>'id')
                ELSE user_record->>'password'
            END,
            user_record->>'role',
            user_record->>'plan',
            user_record->>'whatsapp_ventas',
            user_record->>'phone_number',
            user_record->>'walink',
            user_record->>'created_by',
            (user_record->>'age')::INTEGER,
            (user_record->>'subscription_start')::TIMESTAMPTZ,
            (user_record->>'subscription_end')::TIMESTAMPTZ,
            (user_record->>'trial_start_time')::TIMESTAMPTZ,
            (user_record->>'scheduled_time')::TIMESTAMPTZ,
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(user_record->'allowed_tools', '[]'::jsonb)))
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            username = EXCLUDED.username,
            full_name = EXCLUDED.full_name,
            password = EXCLUDED.password,
            role = EXCLUDED.role,
            plan = EXCLUDED.plan,
            whatsapp_ventas = EXCLUDED.whatsapp_ventas,
            phone_number = EXCLUDED.phone_number,
            walink = EXCLUDED.walink,
            age = COALESCE(EXCLUDED.age, users.age),
            subscription_start = EXCLUDED.subscription_start,
            subscription_end = EXCLUDED.subscription_end,
            trial_start_time = EXCLUDED.trial_start_time,
            scheduled_time = EXCLUDED.scheduled_time,
            allowed_tools = EXCLUDED.allowed_tools,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. ACTUALIZACIÓN DE PERFIL
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
    SELECT id INTO v_req_id FROM users 
    WHERE id = p_user_id AND LOWER(email) = LOWER(p_email) 
    AND password = p_password;

    IF v_req_id IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;

    UPDATE users SET 
        full_name = COALESCE(p_update_data->>'full_name', full_name),
        phone_number = COALESCE(p_update_data->>'phone_number', phone_number),
        age = COALESCE((p_update_data->>'age')::INTEGER, age),
        walink = COALESCE(p_update_data->>'walink', walink),
        whatsapp_ventas = COALESCE(p_update_data->>'whatsapp_ventas', whatsapp_ventas),
        password = COALESCE(p_update_data->>'password', password),
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. LOGIN SEGURO
CREATE OR REPLACE FUNCTION login_user(p_identifier TEXT, p_password TEXT) 
RETURNS SETOF users AS $$
BEGIN
    RETURN QUERY 
    SELECT * FROM users 
    WHERE (LOWER(email) = LOWER(p_identifier) OR LOWER(username) = LOWER(p_identifier))
    AND password = p_password; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. OBTENER LISTA DE USUARIOS
CREATE OR REPLACE FUNCTION get_admin_users_list(p_admin_email TEXT, p_admin_password TEXT)
RETURNS SETOF users AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users 
    WHERE LOWER(email) = LOWER(p_admin_email) 
    AND password = p_admin_password;

    IF v_role NOT IN ('admin_general', 'admin_aux') THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    RETURN QUERY SELECT * FROM users ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- E. OBTENER CONTACTO PÚBLICO
CREATE OR REPLACE FUNCTION get_admin_contact_public(p_identifier TEXT)
RETURNS TEXT AS $$
DECLARE
    v_walink TEXT;
    v_whatsapp TEXT;
BEGIN
    SELECT walink, whatsapp_ventas INTO v_walink, v_whatsapp 
    FROM users 
    WHERE id = p_identifier OR username = p_identifier 
    LIMIT 1;

    IF v_walink IS NOT NULL AND v_walink != '' THEN
        RETURN v_walink;
    ELSIF v_whatsapp IS NOT NULL AND v_whatsapp != '' THEN
        RETURN 'https://wa.me/51' || v_whatsapp;
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- F. OBTENER CONTACTO FULL
CREATE OR REPLACE FUNCTION get_admin_contact_full(p_identifier TEXT)
RETURNS TABLE (v_walink TEXT, v_phone TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT walink, whatsapp_ventas
    FROM users
    WHERE id = p_identifier OR username = p_identifier
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- G. ELIMINAR USUARIO
CREATE OR REPLACE FUNCTION delete_user_secure(p_admin_email TEXT, p_admin_password TEXT, p_target_user_id TEXT)
RETURNS VOID AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users 
    WHERE LOWER(email) = LOWER(p_admin_email) 
    AND password = p_admin_password;

    IF v_role NOT IN ('admin_general', 'admin_aux') THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    DELETE FROM users WHERE id = p_target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- H. ACEPTAR TÉRMINOS
CREATE OR REPLACE FUNCTION accept_terms_secure(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE users SET terms_accepted_at = NOW() WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
