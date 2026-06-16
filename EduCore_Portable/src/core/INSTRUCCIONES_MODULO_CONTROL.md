# 🛰️ EduCrea SaaS Core - Manual de Integración Modular (v3.0)

Este documento es el manual técnico definitivo para extraer el módulo de administración y control de usuarios (EduCore) e integrarlo en cualquier proyecto React + Supabase.

## 📂 Estructura del Módulo
Copia la carpeta completa `src/core` a la carpeta `src` de tu nuevo proyecto.

```text
src/core/
├── components/   # UI Reutilizable (Logo, Reloj Perú, Toggles)
├── context/      # AuthContext.jsx (Gestión de Estado y Sync Global)
├── lib/          # supabase.js (Conector oficial)
├── services/     # databaseService.js (Abstracción de Datos)
└── views/        # AdminView (Panel), LoginView (Acceso), Tutoriales
```

## 🚀 Guía de Integración Paso a Paso

### 1. Instalación de Dependencias
Ejecuta en tu terminal:
```bash
npm install @supabase/supabase-js lucide-react react-router-dom
```

### 2. Variables de Entorno (`.env`)
Configura tus credenciales de Supabase. El sistema las buscará automáticamente desde `lib/supabase.js`.
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
```

### 3. Configuración del Entry Point (`App.jsx`)
Es **obligatorio** envolver la aplicación con el `AuthProvider`. Esto inicializa el sistema de horas, el tema (dark/light) y la persistencia de sesión.

```jsx
import { AuthProvider } from './core/context/AuthContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginView from './core/views/LoginView';
import AdminView from './core/views/AdminView';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/admin" element={<AdminView />} />
          {/* ... tus rutas protegidas ... */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

## 🛡️ Estándares de Auditoría y Seguridad (Novedad v3.0)

Para mantener la integridad del sistema, sigue estas reglas al usar los servicios de `databaseService.js`:

1.  **Registro de Actividad:** Siempre que un usuario realice una acción importante (ej. generar un documento), llama a:
    ```javascript
    await db.logActivity(user.id, 'GENERACION_DOCUMENTO', { tipo: 'Crucigrama', tema: 'Matemáticas' });
    ```
2.  **Migración Masiva:** El core incluye un motor de migración en `AdminView.jsx`. Úsalo para importar usuarios en lote evitando duplicados y enviando correos automáticos.
3.  **Sincronización Masiva:** Si tu aplicación modifica múltiples usuarios en la UI, usa `db.upsertUsers(usersArray)` al finalizar para persistir todos los cambios en un solo viaje al servidor.
4.  **Gestión de Pruebas (Magic Login):** El core permite el acceso inmediato tras la creación de la prueba. Asegúrate de que el flujo de UI redirija al usuario al generador mientras el correo se envía en segundo plano.
5.  **WhatsApp de Ventas:** Cada administrador puede gestionar su número desde "Mi Cuenta". Este número se sincroniza automáticamente para ser mostrado como contacto de cierre de ventas a sus invitados.
6.  **Persistencia Transparente:** Al modificar el perfil del usuario, usa `updateUser()`. Esta función ahora es asíncrona y garantiza que el cambio se guarde en Supabase antes de completar la acción en la UI.

## 🎨 Estándares de UI Premium
- **Tablas:** Usa `sticky-header` y contenedores con `overflow-y-auto` para asegurar la legibilidad en listas extensas.
- **Scrollbars:** Aplica siempre la clase `premium-scrollbar` a los contenedores con scroll.
- **Zona Horaria:** No modifiques `new Date()`. Usa siempre `getPeruDate()` expuesto por el `AuthContext`.
- **Temas:** El core inyecta el atributo `data-theme` en el `<html>`. Asegúrate de que tus estilos globales respeten esta variable.

---
**Arquitectura Industrializada - Versión 3.0 (Abril 2026)**
