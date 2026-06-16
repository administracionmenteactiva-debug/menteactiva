# 🚀 Guía de Integración: EduCore (v3.6)

Este documento detalla los pasos para integrar el módulo de gestión de cuentas, usuarios y administración en un nuevo proyecto.

## 📂 Estructura del Paquete
El contenido de esta carpeta debe copiarse en la raíz de tu proyecto React:
- `src/core/`: Componentes, contextos, servicios y vistas del sistema de gestión.
- `sql/setup_database.sql`: Script maestro para configurar Supabase.

---

## 🛠️ Paso 1: Instalación de Dependencias
Asegúrate de tener instaladas las siguientes librerías en tu nuevo proyecto:

```bash
npm install @supabase/supabase-js lucide-react react-router-dom
```

---

## 🛰️ Paso 2: Configuración de Supabase
1.  Crea un nuevo proyecto en **Supabase**.
2.  Ve al **SQL Editor**.
3.  Copia y pega el contenido de `sql/setup_database.sql` y ejecútalo. Esto creará las tablas, las funciones de encriptación y las ventanillas seguras (RPC).
4.  Crea tu primer usuario administrador manualmente si es necesario (o usa el panel de administración una vez logueado).

---

## 📧 Paso 3: Configuración de Brevo (Email)
1.  Crea una cuenta en [Brevo](https://www.brevo.com/).
2.  Obtén tu **API Key** desde el panel de configuraciones SMTP.
3.  Agrega la llave a tu archivo `.env` (ver Paso 4).

---

## 🔑 Paso 4: Variables de Entorno (`.env`)
Crea un archivo `.env` en la raíz de tu proyecto con el siguiente formato:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-de-supabase
VITE_BREVO_KEY=tu-api-key-de-brevo
```

---

## ⚛️ Paso 5: Envolver la Aplicación (`App.jsx`)
Para que el sistema de autenticación funcione, debes envolver tu aplicación con el `AuthProvider`:

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
          {/* Tus rutas protegidas aquí */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## 🎨 Personalización Visual
1.  **Logo**: Sustituye el componente en `src/core/components/common/EduCreaLogo.jsx` con tu propio logo.
2.  **Temas**: El sistema inyecta `data-theme="light"` o `dark` en el `<html>`. Configura tus estilos globales para responder a este atributo.
3.  **Configuraciones Iniciales**: Puedes ajustar los valores por defecto del sistema en `AuthContext.jsx` dentro del estado `globalVars`.

---
*EduCore v3.6 - Diseñado para una escalabilidad industrial y segura.*
