# Guía de Proyecto & Contexto de Sesión - Sistema Solar Astrofísica 3D

Este archivo (`CLAUDE.md`) sirve como referencia de contexto, convenciones de desarrollo y guía rápida para el mantenimiento y futuras sesiones de desarrollo del simulador del Sistema Solar 3D.

---

## 🚀 Comandos Rápidos de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo con Hot-Reload
npm run dev

# Compilar proyecto y validar tipos TypeScript
npm run build

# Previsualizar el bundle de producción
npm run preview
```

---

## 🛠️ Stack Tecnológico y Dependencias

- **Frontend & Bundler:** Vite + TypeScript
- **Motor Gráfico 3D:** Three.js (`three`, `@types/three`)
- **Visualización de Gráficos Científicos:** Chart.js
- **Estilos:** Vanilla CSS moderno con tokens de diseño, efectos Glassmorphism y estética dark sci-fi.

---

## 📐 Estructura de Directorios

```
Sistema planetario/
├── Architecture.md           # Especificaciones detalladas de arquitectura y física
├── CLAUDE.md                 # Este archivo de convenciones y contexto de sesión
├── GRAPHICS_LAYER.md         # Diseño de la capa gráfica de lunas (MoonFX)
├── ROADMAP.md                # Plan priorizado de mejoras (Fases 1-4)
├── session_log.json          # Historial estructurado de cambios y versiones
├── package.json              # Configuración de dependencias y scripts
├── tsconfig.json             # Configuración TypeScript
├── vite.config.ts            # Configuración de Vite
├── index.html                # Interfaz principal de la aplicación
├── Planet.html               # Archivo original 2D histórico de referencia
├── public/
│   ├── favicon.svg           # Favicon del observatorio
│   └── textures/
│       ├── planets/          # Texturas JPG NASA (planetas y nubes terrestres)
│       └── sky/              # Vía Láctea equirectangular
├── tests/                    # Suites vitest: catalog, nbody, kerr, sky
└── src/
    ├── main.ts               # Punto de entrada de la aplicación
    ├── core/                 # Física y modelos (sin DOM; Three.js solo como contenedores de vectores)
    │   ├── physics/          # KeplerianEngine, TimeEngine, NBodyEngine, SkyEngine
    │   ├── thermodynamics/   # Stefan-Boltzmann, irradiancia, habitabilidad y Kopparapu
    │   ├── geology/          # Modelos de corteza/manto/núcleo y accidentes geográficos
    │   ├── relativity/       # KerrEngine (geodésicas, horizonte, ergosfera, ISCO)
    │   └── scientific.types.ts # Modelo SI común y metadatos de procedencia
    ├── data/
    │   ├── planets.data.ts   # Datos físicos, orbitales y geológicos de cuerpos celestes
    │   ├── geography.data.ts # Catálogo de accidentes topográficos y coordenadas
    │   ├── star.data.ts      # Clases estelares y datos base del Sol
    │   ├── brightStars.data.ts # Estrellas brillantes J2000 para el Cielo
    │   └── exoplanets.data.ts  # Sistemas exoplanetarios curados (Atlas)
    ├── services/
    │   ├── NasaExoplanetClient.ts # Consulta TAP al NASA Exoplanet Archive
    │   └── NBodyWorkerClient.ts   # Cliente del worker de N-cuerpos
    ├── workers/
    │   ├── nbody.worker.ts   # Leapfrog N-cuerpos fuera del hilo principal
    │   └── kerr.worker.ts    # Integración de geodésicas Kerr
    ├── render/
    │   ├── SceneManager.ts   # Escena Three.js, cámara, luces, sombras, raycasting
    │   ├── CelestialBody.ts  # Mallas, texturas procedurales, atmósferas Fresnel y lunas
    │   ├── SunBody.ts        # Sol reactivo a temperatura con shaders
    │   ├── HabitableZone.ts  # Visualizador de zona de habitabilidad 3D
    │   ├── InternalLayers.ts # Corte geológico 3D (Rayos X)
    │   ├── GeographyPins.ts  # Marcadores de superficie interactivos
    │   ├── OrbitsRenderer.ts # Trazado de órbitas keplerianas 3D
    │   ├── PostFX.ts         # Postprocesado: bloom cinematográfico y tone mapping final
    │   ├── Meteors.ts        # Estrellas fugaces ocasionales en la bóveda celeste
    │   ├── MoonFX.ts         # Texturas procedurales de lunas y anillos de órbita
    │   ├── SkyRenderer.ts    # Render del cielo local (horizonte, astros, trayectorias)
    │   └── catalogTextures.ts # Carga de texturas NASA desde /textures
    └── ui/
        ├── UIController.ts   # Controlador de interacción y eventos del DOM
        ├── WorkspaceController.ts # Orquestador de los 5 espacios científicos
        ├── StarControls.ts   # Manejador del termostato estelar
        ├── PlanetDossier.ts  # Ficha técnica planetaria
        ├── ChartsManager.ts  # Integración de gráficos Chart.js
        ├── KerrRenderer.ts   # Visualización GPU del laboratorio Kerr
        └── styles/
            └── main.css      # Estilos CSS de alta gama (dark sci-fi)
```

---

## 🧬 Convenciones de Código y Física

1. **Unidades Físicas Estándar:**
   - Distancias orbitales en el núcleo de cálculo: **Unidades Astronómicas (UA)**.
   - Radios planetarios en datos: **Kilómetros (km)**.
   - Temperaturas: **Kelvin (K)** en el motor físico, convertidas a **Celsius (°C)** en la UI.
   - Radiación e Irradiancia: **W/m²**.
   - Masas: **kg** y masas relativas a la Tierra ($M_\oplus$).

2. **Modularidad e Independencia:**
   - La física y termodinámica (`src/core/`) no dependen del DOM ni del render de Three.js; son evaluables
     independientemente (tests vitest). Nota: `KeplerianEngine` y `GeologyEngine` importan `three` solo como
     contenedores de tipos/vectores, no para renderizar.
   - Las mallas de renderizado (`src/render/`) reciben datos del núcleo físico para actualizar sus transformaciones (posición, rotación, escala).

3. **Registro de Cambios:**
   - En cada sesión donde se añadan o modifiquen funcionalidades mayores, actualizar `session_log.json` con la fecha, descripción de cambios y componentes afectados.
