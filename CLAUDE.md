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
- **Iconografía:** Lucide (`lucide`)
- **Estilos:** Vanilla CSS moderno con tokens de diseño, efectos Glassmorphism y estética dark sci-fi.

---

## 📐 Estructura de Directorios

```
Sistema planetario/
├── Architecture.md           # Especificaciones detalladas de arquitectura y física
├── CLAUDE.md                 # Este archivo de convenciones y contexto de sesión
├── session_log.json          # Historial estructurado de cambios y versiones
├── package.json              # Configuración de dependencias y scripts
├── tsconfig.json             # Configuración TypeScript
├── vite.config.ts            # Configuración de Vite
├── index.html                # Interfaz principal de la aplicación
├── Planet.html               # Archivo original 2D histórico de referencia
└── src/
    ├── main.ts               # Punto de entrada de la aplicación
    ├── core/
    │   ├── physics/          # Mecánica orbital kepleriana 3D, tiempo y gravedad
    │   ├── thermodynamics/   # Ley de Stefan-Boltzmann, irradiancia y habitabilidad
    │   └── geology/          # Modelos de corteza/manto/núcleo y accidentes geográficos
    ├── data/
    │   ├── planets.data.ts   # Datos físicos, orbitales y geológicos de cuerpos celestes
    │   ├── geography.data.ts # Catálogo de accidentes topográficos y coordenadas
    │   └── star.data.ts      # Clases estelares y temperaturas solares
    ├── render/
    │   ├── SceneManager.ts   # Escena Three.js, cámara, luces y render loop
    │   ├── CelestialBody.ts  # Mallas de planetas, texturas procedurales y atmósferas
    │   ├── SunBody.ts        # Sol reactivo a temperatura con shaders
    │   ├── HabitableZone.ts  # Visualizador de zona de habitabilidad 3D
    │   ├── InternalLayers.ts # Corte geológico 3D (Rayos X)
    │   ├── GeographyPins.ts  # Marcadores de superficie interactivos
    │   └── OrbitsRenderer.ts # Trazado de órbitas keplerianas 3D
    └── ui/
        ├── UIController.ts   # Controlador de interacción y eventos del DOM
        ├── StarControls.ts   # Manejador del termostato estelar
        ├── PlanetDossier.ts  # Ficha técnica planetaria
        ├── ChartsManager.ts  # Integración de gráficos Chart.js
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
   - La física y termodinámica (`src/core/`) no dependen de Three.js ni del DOM. Son funciones puras evaluables independientemente.
   - Las mallas de renderizado (`src/render/`) reciben datos del núcleo físico para actualizar sus transformaciones (posición, rotación, escala).

3. **Registro de Cambios:**
   - En cada sesión donde se añadan o modifiquen funcionalidades mayores, actualizar `session_log.json` con la fecha, descripción de cambios y componentes afectados.
