# 🚀 Guía Maestra de Portabilidad: EduCore Admin & Auth (v3.7)

Este módulo representa el núcleo industrializado de EduCrea. Contiene la lógica de autenticación, gestión de usuarios, auditoría (logs), sincronización con Supabase y utilidades de tiempo real. Está diseñado para ser **100% independiente** y portable a cualquier proyecto React + Vite.

---

## 📂 1. Estructura Atómica del Módulo
Copia la carpeta `src/core/` íntegramente a tu proyecto. Esta es la responsabilidad de cada pieza:

```text
src/core/
├── components/
│   ├── common/
│   │   ├── EduCreaLogo.jsx    # Logo dinámico (Isotipo vs Completo)
│   │   └── ThemeToggle.jsx    # Selector de Modo Oscuro/Claro
│   └── user/
│       ├── AccountSection.jsx # Perfil del usuario, cambio de pass y ventas
│       ├── DashboardSection.jsx # Panel principal con métricas, bloqueos de suscripción y avisos
│       └── NotificationsSection.jsx # Visualizador de alertas y sistema
├── context/
│   └── AuthContext.jsx       # El "Cerebro Global": Estado, Sync y Hora Perú
├── lib/
│   └── supabase.js           # Conector oficial centralizado
├── services/
│   ├── databaseService.js    # Capa de Abstracción CRUD (Mapeo de datos)
│   └── emailService.js       # Integración con el motor de envíos
├── views/
│   ├── AdminView.jsx         # Panel Maestro de Gestión y Auditoría
│   ├── LoginView.jsx         # Acceso con soporte para Magic Login
│   ├── TutorialView.jsx      # Centro de Onboarding obligatorio
│   └── UserView.jsx          # Perfil público y gestión de sesión
└── GUIA_PORTABILIDAD.md      # Este manual de referencia
```

---

## 🛠️ 2. Infraestructura de Datos (Supabase)

Para inicializar el core, ejecuta este SQL en tu editor de Supabase. Este esquema garantiza la integridad y el soporte para auditoría industrial.

```sql
-- A. TABLA DE USUARIOS (El motor de acceso)
CREATE TABLE users (
    id TEXT PRIMARY KEY,               -- ID único (UUID o Personalizado)
    email TEXT UNIQUE NOT NULL,        -- Correo institucional
    username TEXT,                     -- Alias para login alternativo
    full_name TEXT,                    -- Nombre completo para reportes
    password TEXT NOT NULL,            -- Contraseña (en texto o hash según capa)
    role TEXT DEFAULT 'user',          -- [admin_general, admin_secundario, user]
    plan TEXT DEFAULT 'mensual',       -- Nivel de suscripción
    downloads_count INTEGER DEFAULT 0, -- Auditoría de uso de recursos
    whatsapp_ventas TEXT,              -- Número de contacto para cierre de ventas
    trial_start_time TIMESTAMPTZ,      -- Inicio de prueba (Fricción Cero)
    subscription_start TIMESTAMPTZ,    -- Inicio de suscripción paga
    subscription_end TIMESTAMPTZ,       -- Vencimiento (Formato ISO)
    created_by TEXT DEFAULT 'system',  -- Trazabilidad de creación
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. TABLA DE CONFIGURACIONES (Variables Globales)
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,              -- [email_config, tutorials, trial_requests]
    value JSONB,                       -- Contenido dinámico en JSON
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. TABLA DE AUDITORÍA (Actividad Industrial)
CREATE TABLE activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,              -- [LOGIN, DESCARGA, CAMBIO_PLAN]
    details JSONB,                     -- Contexto extra de la acción
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧠 3. Manual del AuthContext (La API del Core)

El `AuthContext` expone todo lo necesario para operar el sistema. Úsalo mediante el hook `useAuth()`.

### Variables de Estado
- `user`: Objeto con los datos del usuario actual (mapeado a camelCase).
- `isAuthenticated`: Booleano que indica si hay una sesión activa.
- `globalVars`: Objeto que contiene `META_USERS`, `META_EMAIL_CONFIG` y `META_TUTORIALS`.
- `theme`: `'light'` o `'dark'`.
- `showIds`: Booleano para depuración visual (IDs de componentes).

### Funciones Maestras
- `login(id, pass)`: Autentica contra Supabase o el Super Admin Local (`efra`).
- `logout()`: Limpia `localStorage` y resetea el estado.
- `updateUser(newData)`: Actualiza el perfil del usuario **y sincroniza automáticamente con Supabase**.
- `getPeruDate()`: **Vital**. Retorna un objeto `Date` ajustado a la hora de Perú (UTC-5), ignorando el reloj local del cliente.
- `updateGlobalVars(vars)`: Actualiza y persiste configuraciones del sistema en lote.

### 🔌 3.5 API de databaseService.js
Para operaciones directas fuera del contexto global:
- `db.logActivity(userId, action, details)`: Registra eventos en `activity_logs`.
- `db.upsertUsers(array)`: Sincronización masiva de perfiles.
- `db.startTrial(userId)`: Inicia el cronómetro de prueba (ISO String).
- `db.incrementDownloadCount(userId)`: Incremento atómico de descargas.
- `db.checkEmailExists(email)`: Validación rápida de duplicados.
- `db.fetchLogs(limit)`: Recupera historial para el panel de auditoría.

---

## 🛰️ 4. Protocolo de Integración para Antigravity

Si eres otro agente Antigravity encargado de acoplar este core, sigue estas reglas de oro:

1.  **Check de Dependencias**: Asegúrate de que el proyecto tenga instalado:
    `npm install @supabase/supabase-js lucide-react react-router-dom`
2.  **Wrappers de App**: Envuelve la raíz en `App.jsx` exactamente así:
    ```jsx
    <BrowserRouter>
      <AuthProvider>
        <Routes> ... </Routes>
      </AuthProvider>
    </BrowserRouter>
    ```
3.  **Respeto al Mapeo**: El core usa `databaseService.js` para traducir de `snake_case` (DB) a `camelCase` (UI). **JAMÁS** uses campos de la DB directamente en los componentes; usa siempre los métodos de mapeo proporcionados.
4.  **Auditoría Obligatoria**: Si implementas una nueva función de descarga o generación, **DEBES** registrar el log:
    `await db.logActivity(user.id, 'NUEVA_ACCION', { meta: 'detalle' });`
5.  **Identidad Visual**: Usa las variables de tema expuestas. El core inyecta `data-theme` en el `<html>`.

---

## 💎 5. Flujos de Alto Valor (Core Features)

### A. Magic Login (Fricción Cero)
Implementado en `LoginView.jsx`. Permite que usuarios de prueba entren directamente tras el registro.
- **Mecánica**: Se guarda un token temporal en `localStorage` y se inyecta la sesión sin requerir re-entrada de datos.

### B. Sincronización Silenciosa
Todas las actualizaciones a través de `updateUser` o `updateGlobalVars` se ejecutan en segundo plano. La UI responde instantáneamente (Optimistic UI) mientras la persistencia ocurre asíncronamente en Supabase.

### C. WhatsApp de Ventas Personalizado
Si el `user.role` es admin, puede definir su `whatsappVentas`. Este número se inyectará automáticamente en las vistas de los usuarios captados bajo su referencia, facilitando la conversión directa.

---
*Arquitectura Industrializada - Versión 3.7 (Mejoras en control de vencimientos y bloqueos)*
*Diseñado por Nosotros para El Sistema.*
