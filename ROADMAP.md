# 🛰️ Roadmap — Sistema Solar más Dinámico, Educativo y Visual

> Documento de propuestas derivado de la revisión del repositorio (2026-08).
> Estado actual verificado: `npm run build` ✅ (tsc + vite), 4 suites de tests (catalog, nbody, kerr, sky).
> Nota de mantenimiento: la FASE 1 visual (items 1–4) se completó en las sesiones 5–7 (bloom, sombras,
> atmósfera Fresnel, cielo con twinkle y meteoros) y las lunas orbitan en el plano ecuatorial
> (`axialTiltGroup`) desde la sesión 7.

---

## 1. Diagnóstico resumido

**Lo que ya existe (fortalezas):**
- 5 espacios científicos: **Sistema Solar 3D** (legacy), **Cielo local** (`SkyEngine`), **Atlas exoplanetario** (`exoplanets.data` + actualización NASA), **Laboratorio N-cuerpos** (`NBodyEngine` en Web Worker) y **Relatividad Kerr** (`KerrEngine` en Web Worker).
- Propagación kepleriana J2000 real (`KeplerianEngine`), termodinámica Stefan-Boltzmann + Kopparapu (`ThermodynamicsEngine`), geología con corte 3D y pines geográficos, termostato solar interactivo con zona de habitabilidad dinámica.
- Texturas NASA reales en `public/textures/planets/` (8 planetas + Plutón + nubes + Vía Láctea) cargadas sobre fallback procedural.
- Estética dark sci-fi con glassmorphism, gráficos Chart.js en tiempo real, arquitectura modular y física desacoplada del render.

**Debilidades detectadas en la revisión de código:**
| Área | Hallazgo concreto |
|---|---|
| Dinamismo | La rotación se acelera con `deltaDays` sin límite realista; no hay tiempo negativo ni presets; los cinturones giran con velocidades angulares fijas; no hay eclipses, tránsitos, estaciones ni cometas. (Lunas en plano ecuatorial: resuelto en sesión 7.) |
| Dinamismo | El render 3D se ejecuta siempre aunque el workspace activo sea Cielo/Atlas/Lab/Kerr (`main.ts` + `SceneManager.update`), desperdiciando CPU. |
| Educativo | Las ecuaciones existen en `Architecture.md` pero no en la UI; no hay comparador de cuerpos, búsqueda global, misiones guiadas ni efemérides de eventos próximos. |
| Visual | Etiquetas/labels sin jerarquía de información. (Bloom, sombras y atmósfera Fresnel: completados en FASE 1, sesiones 5–6.) |
| Rendimiento | Chunk principal de 649 KB (warning de Vite); texturas procedurales regeneradas en runtime; sin `manualChunks`. |

---

## 2. Acciones propuestas (priorizadas)

### 🎯 FASE 1 — Impacto visual inmediato (alto retorno / esfuerzo medio)

1. **Postprocesado Bloom** (`three/examples/jsm/postprocessing/*`)
   - `UnrealBloomPass` sobre el render final: el Sol, atmósferas y etiquetas brillarán como una fotografía real.
   - Archivos: `src/render/SceneManager.ts`, nuevo `src/render/PostFX.ts`.
   - Cargar módulos de postprocesado con `import()` diferido para no penalizar el arranque.

2. **Sombras reales**
   - Activar `renderer.shadowMap`, `pointLight.castShadow`, `castShadow/receiveShadow` en planetas, lunas, anillos y Sol.
   - Las lunas proyectarán sombra sobre sus planetas y viceversa: eclipses visuales sin física extra.
   - Archivos: `SceneManager.ts`, `CelestialBody.ts`, `SunBody.ts`.

3. **Shader de atmósfera Fresnel** (reemplazo de la esfera aditiva)
   - Glow dependiente del ángulo de visión (`dot(viewDir, normal)`), con color por densidad atmosférica (`AtmosphereData`).
   - Archivos: `CelestialBody.ts` (nuevo `AtmosphereShader`), `render/`.

4. **Cielo más vivo**
   - Estrellas con twinkle (material con `sizeAttenuation` + variación de alpha) y estrellas fugaces ocasionales.
   - Archivos: `SceneManager.createStarfield`.

### ⚙️ FASE 2 — Dinamismo

5. **Controles de tiempo avanzados** (`TimeEngine.ts`, `UIController.ts`)
   - Velocidad negativa (retroceder), presets didácticos (1 h/s, 1 d/s, 1 mes/s, 1 año/s, 1 siglo/s) y fecha-hora con minutos.
   - Actualizar `datePicker` a `datetime-local`.

6. **Tour guiado cinemático** (nuevo `CameraRig.ts` o `TourController.ts`)
   - Secuencia auto-orbital entre cuerpos con easing (fly-to), pausable, que muestre la ficha de cada planeta al llegar.
   - Reutiliza `SceneManager.selectPlanet` / `focusOnLandmark`.

7. **Terminador día/noche y estaciones**
   - Malla/shader de terminador sobre el planeta seleccionado + marcador del punto subsolar.
   - Control de inclinación axial interactivo en la Tierra para enseñar las estaciones.
   - Archivos: `CelestialBody.ts`, `SceneManager.ts`, UI en `PlanetDossier.ts`.

8. **Eclipses y tránsitos detectables**
   - Detectar alineación Sol–Luna–planeta (proyección cónica) y emitir un evento UI ("¡Tránsito de Venus en curso!").
   - Archivos: `core/physics/` (nuevo `EclipseEngine.ts`, puro y testeable), `UIController.ts`.

9. **Cometa con cola dinámica**
   - Núcleo + coma + cola orientada en dirección antisolar, con cola iónica/de polvo animada.
   - Archivos: `render/` (nuevo `CometBody.ts`), `data/`.

10. **Optimización: pausar el render 3D fuera del workspace solar**
    - `SceneManager` expone `setActive(boolean)`; `main.ts` o `WorkspaceController` lo llama al cambiar de pestaña.

### 🎓 FASE 3 — Educativo

11. **Panel "Aprender": ecuaciones en vivo** (nuevo `EducationPanel.ts`)
    - Mostrar la ecuación de Kepler, ley de Stefan-Boltzmann, `Teq` y límites de Kopparapu **con los valores numéricos actuales** del sistema (reutiliza `KeplerianEngine` y `ThermodynamicsEngine`).
    - Alta fidelidad didáctica: la física ya existe y es pura; solo falta exponerla en la UI.

12. **Comparador de cuerpos** (nuevo `ComparisonPanel.ts` o extensión de `ChartsManager`)
    - Seleccionar 2+ cuerpos y comparar lado a lado: masa, gravedad, Teq, rotación, lunas, presión atmosférica.
    - Gráfico radar/barras con Chart.js (ya integrado).

13. **Búsqueda global**
    - Input que filtra planetas, lunas y accidentes geográficos (`geography.data.ts`); al elegir, vuela y enfoca (`focusOnLandmark`/`selectPlanet`).

14. **Misiones guiadas** ("¿Por qué Venus es más caliente que Mercurio?", "Encuentra la zona habitable")
    - Pasos que mueven cámara, resaltan objetos y muestran tarjetas de contexto.

15. **Efemérides de eventos próximos en el Cielo**
    - Conjunciones, oposiciones y máximas elongaciones calculadas con `SkyEngine` para los próximos N meses.

### 🧹 FASE 4 — Integración, rendimiento y calidad

16. **Laboratorio N-cuerpos → vista 3D**: botón "Ver en 3D" que vuelca `labSystem` en la escena Three.js (mapeo SI→escena).
17. **Sincronizar Cielo ↔ Sistema Solar** (misma fecha y hora).
18. **Bundle**: `manualChunks` (three, chart.js) y texturas con caché de canvas; objetivo < 250 KB por chunk.
19. **Accesibilidad**: navegación por teclado en la escena, foco visible, ARIA y contraste AA en paneles nuevos.
20. **CI + tests**: GitHub Actions (`npm ci`, `tsc`, `vitest run`); tests para `TimeEngine` (velocidad negativa), `EclipseEngine` y comparador.
21. **Documentación**: actualizar `session_log.json`, `CLAUDE.md` y `Architecture.md` en cada hito; decidir si `dist/` debe versionarse.

---

## 3. Orden de ejecución sugerido

| Fase | Entregable | Esfuerzo estimado |
|---|---|---|
| 1 | Bloom + sombras + atmósfera Fresnel + cielo vivo | ✅ Completada (sesiones 5–7) |
| 2 | Tiempo avanzado + tour + terminador/estaciones + eclipses + cometa | Medio-alto |
| 3 | Panel Aprender + comparador + búsqueda + misiones | Medio |
| 4 | Integración N-body↔3D, sincronización, rendimiento, CI, accesibilidad | Continuo |

*Cada fase termina con build ✅ y tests verdes ✅, y actualiza `session_log.json`.*
