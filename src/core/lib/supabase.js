import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️ Supabase: Faltan llaves de configuración. El sistema operará en MODO OFFLINE (Failsafe solamente).");
}

// Solo inicializamos si tenemos las llaves para evitar que la app explote en Vercel
export const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;
