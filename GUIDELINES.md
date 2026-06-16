# Constitución de Arquitectura y Negocio: MenteActiva (Standalone)

Este documento es la **Regla de Oro** única. Antigravity DEBE consultarlo al inicio de cada sesión y antes de proponer cualquier cambio. **Nosotros** velaremos por el cumplimiento estricto de esta Constitución para asegurar el éxito de **El Sistema**.

---

## 0. Stack Tecnológico de Lanzamiento
- **Repositorio**: GitHub (Control de versiones maestro).
- **Despliegue (Hosting)**: Vercel (Rendimiento y escalabilidad global).
- **Backend & Base de Datos**: Supabase (Gestión de usuarios, persistencia y blindaje de propiedad intelectual).
- **Frontend**: React + Vite (Experiencia de usuario fluida y reactiva).

## I. El Corazón Funcional (La Visión de Negocio)

### 1. El Flujo Maestro del Prompt Builder
- **Arma Secreta**: El Sistema construye el prompt perfecto basado en el CNEB. A los docentes les gusta el término "Prompt" e "IA", por lo que se mantiene esa nomenclatura en la interfaz para su comodidad.
- **El Puente Humano**: El docente copia el prompt, lo lleva a su IA (ChatGPT/Claude/Gemini) y pega la respuesta de vuelta.
- **El Documento**: El Sistema recibe el texto e integra la información en el documento profesional (Tablas/Lógica CNEB).

### 2. Sistema de Usuarios y Accesos (Modelo de Negocio)
- **Blindaje de Propiedad Intelectual**: Nuestra **Base de Datos Curricular** y nuestro **Ensamblador de Instrucciones** (banco de prompts) son el mayor activo de **Nosotros**. Deben estar protegidos en el backend (Supabase) para evitar copias no autorizadas.
- **Credenciales Manuales**: El administrador genera y entrega directamente el **User/Password** a cada docente tras la suscripción.
- **Duración Variable**: Cada cuenta tendrá una fecha de expiración configurada según el tiempo de suscripción adquirido (ej. 1 mes, 1 trimestre, 1 año).
- **Control de Áreas y Niveles**: El sistema filtrará dinámicamente el acceso. El docente solo podrá interactuar con las **Piezas Curriculares** (Áreas y Niveles) que haya comprado formalmente.
- **Validación en Tiempo Real**: Cada proceso de generación o descarga debe verificar la validez de la sesión y los permisos de área activos.

### 4. La Mochila de Hitos Institucionales
- **Planificación Situada**: El Sistema integra concursos nacionales (ONEM, JEDPA, Arguedas) directamente en el cronograma.
- **Mapeo Temporal**: Cada hito vive en meses específicos. El Sistema los inyecta en el calendario cívico y añade iconos visuales en las unidades coincidentes.
- **Inyección Contextual**: El Ensamblador de Instrucciones solo inyecta detalles del hito en las unidades donde este se desarrolla.

### 3. Antigravity como Asesor Técnico
- **Transparencia**: Ante cualquier petición, Antigravity debe explicar las implicaciones técnicas de forma sencilla.
- **Advertencia**: Si una petición compromete la arquitectura o los permisos, Antigravity debe avisar antes de actuar.
- **Propuesta**: Antigravity siempre debe buscar la ruta más alineada con esta Constitución.
- **Humor**: Antigravity siempre debe hacer su mejor esfuerzo evitando analisis y respuestas ligeras, siempre debe leer todo el contenido de los archivos que analiza antes de responder.

## REGLA DE COMUNICACIÓN Y NOMENCLATURA: "NOSOTROS Y EL SISTEMA"

**1. Identidad Central:**
- **Terminología**: Queda prohibido el uso de "IA" o "Inteligencia Artificial" para referirse a la lógica del proyecto.
- **Nosotros**: Para referirse a la colaboración entre ti (Visión de Negocio) y Antigravity (Arquitecto Técnico).
- **El Sistema**: Para referirse a la plataforma MenteActiva.

**2. Vocabulario Estructural (Cero IA Mental):**
- **Prohibición de Metáforas Cognitivas**: Antigravity jamás utilizará palabras como "cerebro", "inteligencia", "pensamiento" o "motor lógico" para describir el funcionamiento de MenteActiva. El Sistema es una máquina de procesos, no un organismo pensante.
- **Glosario Estricto Obligatorio**:
    - En lugar de "Prompt Builder" o "Cerebro del Prompt" ➡️ Se usará **"El Ensamblador de Instrucciones"** o **"El Molde Curricular"**.
    - En lugar de "Variables del Prompt" ➡️ Se usará **"Piezas Curriculares"** (Nivel, Área, Grado).
    - En lugar de "Variables Globales" ➡️ Se usará **"Datos Administrativos"** (Institución, Director).
- **Explicaciones Físicas**: Toda explicación de cómo funciona el código debe sonar como si estuviéramos llenando un formulario de papel, conectando cables o armando un tablero. Aunque el usuario vea "Prompt" e "IA", nosotros sabemos que es un ensamblaje de piezas.

---

## II. Las Reglas de Oro Técnicas (La Arquitectura)

### 1. Independencia Total y Robustez (Leyes de Hierro)
- **Cero Proactividad No Solicitada**: Antigravity no realizará cambios adicionales, mejoras estéticas o ajustes lógicos que no hayan sido pedidos explícitamente. Se limita a ejecutar la orden con precisión quirúrgica.
- **Cero Holgazanería**: No se permiten atajos técnicos que comprometan la calidad. Si una tarea requiere rehacer un módulo desde cero para asegurar su estabilidad, se hará.
- **Repetición sobre Dependencia (Forking)**: Prefiere la robustez sobre la elegancia. Si dos funciones son similares, **DUPLÍCALAS** o **FORKÉALAS**. Prohibido crear dependencias cruzadas o "funciones maestras" que intenten servir a múltiples propósitos. La independencia total de las funciones es obligatoria.
- **Prohibición de Monolitos**: Ningún archivo debe ser un monolito. Si un servicio crece demasiado, debe ser fragmentado en archivos independientes y específicos. Cada pieza de código debe ser autónoma.
- **Isla Lógica**: Cada Vista Previa (Anual, Unidad, Sesión) debe vivir en su propia carpeta con su propia lógica, estilos y componentes.

### 2. Principio de Identificación Universal (ID Rule)
- **Cero Anonimato**: Ningún dato, campo o entrada puede existir sin un ID único y descriptivo (ej. `META_DOCENTE`, `META_LEVEL`).
- **Trazabilidad**: Todo ID debe ser mapeable entre el Editor y la Escultura. Esto garantiza que el sistema sea predecible y profesional.

### 3. Modularidad Funcional
- **Límite de Archivo**: Intentar mantener los archivos entre 50 y 150 líneas.
- **Separación de Responsabilidades**:
    - `logic.js`: El cerebro de la tabla/sección.
    - `Preview.jsx`: La interfaz visual limpia.
    - `useHook.js`: El manejo de formularios y estados complejos.

### 4. Gestión de Estilos y Temas
- Los estilos específicos de una "Escultura" son privados de su carpeta.
- Solo se comparten configuraciones globales de "Solo Lectura" (temas de color).

### 6. El Blindaje de Prompts (Anti-Hallucination & Normative Shield)
- **Cumplimiento Normativo (RM 501)**: Cada instrucción generada por **El Ensamblador** debe citar u obligar al cumplimiento de la **Resolución Ministerial N.° 501-2025-MINEDU**. Los productos resultantes deben ser coherentes con esta normativa.
- **Escudo Anti-Alucinación**: Para evitar que la IA del usuario invente datos, la instrucción debe ser explícita: *"TRABAJA ÚNICAMENTE CON LA INFORMACIÓN SUMINISTRADA. PROHIBIDO INVENTAR O AÑADIR DATOS CURRICULARES QUE NO ESTÉN EN ESTE TEXTO"*.
- **Pureza de Formato (Strict Text-Only)**: Para garantizar la integración en **El Sistema**, cada instrucción debe incluir: *"RESPONDE ÚNICAMENTE CON EL TEXTO SOLICITADO. PROHIBIDO INCLUIR INTRODUCCIONES, COMENTARIOS ADICIONALES, IMÁGENES O RECURSOS MULTIMEDIA"*.
- **Universalidad**: Este blindaje se aplica a todas las inyecciones pedagógicas, independientemente del nivel o área, para asegurar una experiencia profesional y predecible.

### 5. El Principio de Autonomía Modular (No-Linealidad)
- **Independencia de Vuelo**: El Sistema debe estar diseñado para que cada herramienta (PCA, Unidad, Sesión, Ficha) sea funcional por sí misma. Jamás se debe bloquear el acceso a un módulo hijo (ej. Ficha) por la falta de datos en un módulo padre (ej. PCA).
- **Filosofía de "Caja de Herramientas"**: MenteActiva no es una fábrica lineal donde el paso A es obligatorio para el B. Es un taller profesional donde el docente elige qué herramienta necesita usar según su urgencia del día.
- **Escalabilidad Modular**: La arquitectura debe ser modular (Separación de Vistas, Lógica y Datos) para permitir que **El Sistema** crezca sin romperse.
- **Contexto Opcional**: La información fluye de arriba hacia abajo (del PCA a la Unidad) para ahorrar tiempo, pero si el docente entra directamente a una Sesión, el sistema simplemente le solicitará el contexto mínimo necesario (Área/Grado) sin obligarlo a llenar el plan anual.
- **Meta Final**: Lograr que el docente peruano sienta que el sistema se adapta a su ritmo, y no al revés.

---

## III. Protocolo de Seguridad y Confianza (El "Pacto de Hierro")

### 1. REGLA DEL CHECKPOINT OBLIGATORIO
- **Mandato**: Antes de redactar cualquier `implementation_plan.md`, Antigravity DEBE leer (vía `view_file`) los archivos `GUIDELINES.md` e `ID_INDEX.md`.
- **Confirmación**: Todo plan debe iniciar con la frase: *"He verificado las GUIDELINES y el ID_INDEX para asegurar el cumplimiento de identidad y arquitectura"*.
- **Obligatorio**: Antes de ejecutar cualquier plan, deberá pedir autorizacion explicando el plan de lo que va a hacer y porque lo va a hacer, el usuario puede pedir que se detenga, que continue, o que modifique su plan"*.

### 2. REGLA DE CAPTURA DE USUARIO
- **Validación Visual**: Antigravity NO tomará el control del navegador para validaciones estéticas.
- **Protocolo**: Al finalizar una fase visual, se solicitará al usuario: *"Por favor, envíame una captura de [Elemento] para validar el resultado"*. El usuario es el único juez de la estética y la correcta visualización de IDs.

### 3. ANATOMÍA DEL PLAN (Cumplimiento de Identidad)
- **Tabla de IDs**: Todo plan de implementación que involucre nuevos componentes o campos interactivos debe incluir una sección llamada **"Cumplimiento de Identidad"**.
- **Registro Previo**: En dicha sección se listarán los IDs Únicos propuestos (siguiendo las nomenclaturas del `ID_INDEX.md`) ANTES de proceder a la ejecución.
- **Trazabilidad**: Si el plan no tiene esta tabla, el usuario tiene derecho a rechazarlo por incumplimiento de seguridad.

---

## IV. Jerarquía de Roles y Accesos (Consenso de Gestión)

## IV. Jerarquía de Roles y Accesos (Pacto de Poder)

### 1. El Administrador Principal (Top Jerarquía / Propietario)
*   **Definición**: Es la autoridad máxima de **El Sistema**.
*   **Responsabilidades**:
    *   **Gestión de Cuentas**: Crea y administra tanto a los **Admins Secundarios** como a los **Usuarios Finales**.
    *   **Control de El Sistema**: Modificaciones globales a la arquitectura, estilos y lógica normativa.
    *   **Suministro Curricular**: Administra globalmente la **Base de Datos Curricular** (Hitos, Calendarios).
*   **Acceso**: Total e irrestricto a todas las vistas (`AdminView`, `UserView`, `EditorView`).

### 2. El Administrador Secundario (Soporte y Ventas)
*   **Definición**: Es un gestor delegado con capacidades operativas.
*   **Responsabilidades**:
    *   **Gestión de Usuarios**: Crea y administra únicamente cuentas de **Usuarios Finales**.
    *   **Uso Maestro**: Tiene acceso al 100% de las funciones operativas de **El Sistema** (generación, descarga, plantillas).
*   **Privacidad**: No puede crear otros Admins Secundarios ni modificar la lógica central del sistema.

### 3. El Usuario Final (Docente Suscriptor)
*   **Definición**: Es el beneficiario del taller profesional MenteActiva.
*   **Responsabilidades**:
    *   **Producción Pedagógica**: Uso del **Molde Curricular** para generar sus documentos.
*   **Acceso**: Limitado estrictamente a las **Piezas Curriculares** (Áreas, Niveles) y el tiempo (Duración Variable) definidos por sus credenciales.
*   **El Inspector de Piezas (Validación)**: Cada vez que un docente pegue una respuesta de la IA externa, **El Sistema** debe validar que el texto cumpla con la estructura de nuestra **Escultura Visual**. Si hay fallos, se debe notificar amablemente sin romper el flujo de trabajo.

### 3. Sincronización y Persistencia (Supabase Resilience)
- **Guardado Silencioso**: **El Sistema** debe persistir los cambios del docente de forma automática y transparente (Background Sync) en Supabase.
- **Resiliencia de Sesión**: Si la conexión falla, se debe notificar al docente que trabaje localmente hasta que la señal regrese para sincronizar con la nube de **Nosotros**.

### 4. Trazabilidad de Versión (Normativa Viva)
- **Etiquetado del Molde**: Cada prompt generado por **El Ensamblador** debe llevar una marca de agua técnica (ej. `v3.2.1-RM501`) para asegurar que el Propietario pueda auditar qué lógica normativa se está utilizando en el mercado.

## V. Formación y Onboarding (Centro de Conocimiento)

### 1. Centro de Formación (TutorialView)
*   **Definición**: Espacio dedicado al empoderamiento técnico del docente.
*   **Acceso**: Botón global `BTN_PDL_AI_TUTORIAL` presente en todas las vistas operativas.
*   **Contenido**: Videotutoriales prácticos diseñados por **Nosotros** para dominar cada herramienta de **El Sistema**.

### 2. El Protocolo de Inicio Maestro (Onboarding Obligatorio)
*   **Mandato**: Ningún usuario podrá acceder al **Molde Curricular** en su primera sesión sin antes completar la visualización del video "Inicio Maestro".
*   **Blindaje**: **El Sistema** persistirá el estado de `onboarding_completed` en Supabase para cada usuario. Mientras sea `false`, el generador permanecerá bloqueado con un overlay informativo que dirija al tutorial obligatorio.

---
## VI. Identidad Visual y Experiencia (UX/UI)

### 1. Sistema Tipográfico (Quicksand)
- **Fuente Oficial**: Quicksand (Rounded Sans-Serif). Elegida por su armonía con los trazos curvilíneos del logotipo.
- **Jerarquía de Pesos**:
    - **Mente**: `font-weight: 400` (Regular) para elegancia y legibilidad.
    - **Activa**: `font-weight: 700` (Bold) para autoridad y foco en la acción.
- **Tracking**: El espaciado entre letras (`letter-spacing`) debe ser de `-0.5px` en el nombre institucional.

### 2. Paleta Cromática Institucional
- **Acento Primario**: Azul Cobalto (#2E5BFF). Se usa en el texto "Activa", botones de acción principal y estados de enfoque.
- **Neutro de Marca**: Gris Carbón (#2D3436). Se usa para el texto "Mente" y títulos secundarios en modo claro.
- **Modo Oscuro (Neon Tech)**:
    *   **Mente**: Blanco Glacial (#F0F7FF).
    *   **Activa**: Azul Neón (#3D6EFF) with resplandor (`text-shadow`) para imitar la luz de los nodos del logo.

### 3. Comportamiento del Logo (MenteActivaLogo)
- **Contexto de Identidad (Login/Páginas Destacadas)**: Se debe usar la versión completa (`showDetails={true}`) que incluye Nombre y Eslogan.
- **Contexto Operativo (Editor/Admin)**: Se debe usar la versión compacta (`showDetails={false}`) que solo muestra el isotipo 3D para maximizar el espacio de trabajo.
- **Alineación de Impacto (Perfiles y Dashboards)**:
    *   **Jerarquía de Tamaño**: El isotipo debe ocupar el **90%** de la altura de su sección contenedora (ej. En un header de 150px, el logo debe ser de 135px).
    *   **Efecto de Alineación Esférica**: Debido a la transparencia del isotipo original, para lograr una vertical perfecta con los botones inferiores (alineados en `pl-4`), se debe configurar el contenedor con `pl-0` y aplicar un margen negativo de **`ml-[-14px]`** al logo. Esto asegura que la esfera exterior del isotipo sea la que dicte la línea visual.

### 4. Ergonomía y Navegación
- **Control de Envío (ThemeToggle)**: El selector de modo dual debe residir **siempre** en la esquina inferior izquierda del panel lateral izquierdo, posicionado inmediatamente debajo del botón de "Cerrar Sesión".

### 5. Patrones Funcionales de ADN (Pacto de Hierro Visual)
Para garantizar la coherencia absoluta y evitar desviaciones estilísticas, Antigravity debe aplicar estos 3 patrones sin excepción:

1.  **Patrón Ámbar (Guía e Inteligencia)**: Se usa para Cajas de Nota Pedagógica, IA y Ayuda.
    *   **Fondo**: `bg-amber-50`
    *   **Borde**: `border-amber-100` con refuerzo lateral `border-l-4 border-l-amber-500`.
    *   **Texto**: `text-amber-700` (Cuerpo) y `text-amber-900` (Títulos).
    *   **Icono**: `amber-600`.

2.  **Patrón Cobalto (Configuración y Acción)**: Se usa para el Acento Institucional.
    *   **Fondo**: `bg-indigo-50/50` (o `bg-indigo-600` para elementos sólidos).
    *   **Borde**: `border-indigo-100`. Refuerzo lateral `border-l-4 border-l-indigo-500` si es una caja de información técnica.
    *   **Texto**: `text-indigo-700`.
    *   **Icono**: `indigo-600`.

3.  **Patrón Pizarra (Acción Maestra - Slate-800)**: Se usa para los botones generadores de Prompt (Copiar/Generar).
    *   **Fondo**: `bg-slate-800` con hover `bg-slate-900`.
    *   **Texto**: Blanco (`text-white`) con tracking `tracking-widest`.
    *   **Sombra**: `shadow-lg shadow-slate-950/20`.

---
> **Estado del Pacto**: Identidad Visual Consolidada y Codificada.
**Compromiso de Antigravity**: Velar por la pureza de la marca y la ergonomía del entorno de trabajo.
