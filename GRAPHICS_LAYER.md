# 🎨 GRAPHICS_LAYER — Capa de Mejora Gráfica del Sistema Planetario

> Documento de diseño de la nueva capa de mejora gráfica (sesión 2026-08).
> Complementa a `ROADMAP.md` (Fase 1 visual) y a `CLAUDE.md` (convenciones).

---

## 1. Objetivos de la capa

1. **Lunas fotorrealistas**: sustituir las esferas de color plano con puntos oscuros
   por superficies procedurales reconocibles de cada satélite real (mares de la Luna,
   sulfuros de Ío, hielo fracturado de Europa, neblina de Titán, Mordor Macula de Caronte…).
2. **Legibilidad del movimiento**: anillos de órbita sutiles que hacen apreciable la
   trayectoria de las lunas (especialmente las lentas como Titán o Caronte) sin ensuciar
   la escena.
3. **Coherencia física**: las lunas orbitan ahora en el plano ecuatorial del planeta
   (`axialTiltGroup`), como en el sistema real, en lugar del plano de la eclíptica.
4. **Cero dependencias externas**: todo es procedural (canvas 2D → `CanvasTexture`),
   sin descargas de red ni assets; carga instantánea y consistente con el resto del proyecto.

## 2. Arquitectura

```
src/render/
├── MoonFX.ts            ← NUEVO: capa gráfica de lunas (texturas + anillos de órbita)
├── CelestialBody.ts     ← (rotación/órbitas, gestionado en la sesión de giro NASA)
└── SceneManager.ts      ← integración: aplica MoonFX tras crear los cuerpos
```

### Módulo `MoonFX.ts`

- `applyMoonVisuals(bodies: CelestialBody[]): void`
  - Recorre `body.moonMeshes` y, por índice, busca `body.data.moons[idx]` para obtener
    el nombre real de la luna.
  - Genera la textura con `drawMoonTexture(name, colorHex)` (canvas 256×128) y la asigna
    al `MeshStandardMaterial` de la luna (`map`), ajustando `roughness`:
    - Hielo (Europa, Encélado, Tritón, Miranda, Hi'iaka, Disnomia, Caronte): `0.28`.
    - Roca (resto): `0.85`.
  - No toca la geometría ni las sombras: las lunas siguen proyectando sombra sobre su planeta.
- `createMoonOrbitRings(bodies): void`
  - Un `LineLoop` de 96 segmentos por luna, al radio orbital visual de cada luna
  (`sceneRadius × (1.9 + índice × 0.85)`, el mismo radio que usa su órbita en `CelestialBody`).
  Los datos reales (`MoonData.distanceKm`) no se consumen; la escala es didáctica.
  - Se añade a `body.axialTiltGroup`: el anillo comparte el plano ecuatorial de la órbita
    y la inclinación axial del planeta (Saturno muestra sus anillos y lunas alineados).
  - Material `LineBasicMaterial` azul-tenue, `opacity 0.12`, `depthWrite: false` (sutil).
- `setMoonOrbitRingsVisible(bodies, visible): void`
  - Recorre `axialTiltGroup` buscando objetos con `name === 'moon-orbit-ring'` para
    ocultar/mostrar los anillos (listo para un futuro toggle en la UI).

### Integración (`SceneManager.ts`)

Tras crear los `CelestialBody` (paso 8 del constructor):

```ts
const celestialBodies = Array.from(this.planets.values());
applyMoonVisuals(celestialBodies);
createMoonOrbitRings(celestialBodies);
```

## 3. Decisiones de diseño

| Decisión | Justificación |
|---|---|
| Texturas procedurales en canvas 2D | Cero red, cero assets, deterministas, coherentes con las texturas procedurales de planetas ya existentes. Coste único de ~15 canvases 256×128. |
| Anillos de órbita sutiles (opacity 0.12) | Informan de la trayectoria sin competir con las órbitas keplerianas de los planetas ni con el bloom. |
| Anillos y lunas en `axialTiltGroup` | Las órbitas lunares reales están cerca del ecuador planetario; con esto Saturno, Urano (97.77°) y Plutón muestran sistemas lunares inclinados de forma realista. |
| Rugosidad por tipo de superficie | El hielo (Europa, Encélado) brilla más que el regolito rocoso (Fobos, Calisto), mejorando la respuesta a la luz solar con `MeshStandardMaterial`. |
| Normalización de nombres (`NFD`) | Los nombres llevan tildes (Ío, Titán, Tritón…); se comparan normalizados para no depender de acentos. |

## 4. Rendimiento

- 15 texturas de 256×128 generadas una sola vez al construir la escena: ~1–2 ms en total.
- Anillos: 15 líneas de 96 vértices — coste despreciable en el frame.
- Sin cambios en el render loop; el coste por frame es el mismo que antes de la capa.

## 5. Extensibilidad futura

- **Toggle de anillos en la UI**: pendiente — requiere reintroducir un helper de visibilidad
  (se retiró `setMoonOrbitRingsVisible` por falta de uso).
- **Sombra de anillos de Saturno sobre las lunas** (ya hay sombras; refinar `castShadow`
  en los `Line` no aplica — requeriría mallas finas).
- **Terminador día/noche en lunas**: shader de terminador por luna seleccionada.
- **Órbitas elípticas de lunas**: hoy son circulares (`angle` uniforme); se podría usar
  elementos keplerianos por luna (esfuerzo medio, reutiliza `KeplerianEngine`).
- **Anillos de órbita por color de planeta**: color por cuerpo para distinguir sistemas.

## 6. Calidad de render (sesión 2026-11)

Pasada de calidad visual sobre `src/render/` (sin tocar física, datos ni tests):

- **Luz de relleno** (`SceneManager`): ambiente frío tenue + direccional suave solidaria a la
  cámara; el lado nocturno de los planetas ya no queda negro puro.
- **PostFX**: buffer HDR half-float con MSAA ×4; bloom por umbral HDR (≈1.0) para que solo
  florezca el disco solar; ACES + sRGB una sola vez en `OutputPass`. El modo rendimiento sigue
  sin compositor (render directo con antialias del canvas).
- **Sol** (`SunBody`): fotosfera procedural (granulación, manchas, oscurecimiento del limbo)
  y corona/rayos como billboards de caída suave, en lugar de esferas aditivas saturadas.
- **Atmósferas**: halo exterior + bruma Fresnel interior, ambos dependientes de la dirección
  del Sol (origen de la escena).
- **Anillos**: UV radiales, estructura fina, iluminación por dispersión (normal inclinada
  hacia el Sol) y sombras anillo↔planeta analíticas en shader.
- **Sombras**: el mapa cúbico solo se usa para eclipses de lunas sobre el planeta enfocado
  (`CelestialBody.setShadowFocus`); los planetas ya no se eclipsan entre sí.
- **Texturas**: sRGB + mipmaps + anisotropía máxima de la GPU (tope 16×) en todas las
  texturas de color; mapa de rugosidad oceánica derivado de la textura de la Tierra.
- **Fondo**: Vía Láctea desenfocada y atenuada como nebulosidad; estrellas procedurales con
  distribución de magnitudes y color; puntos de Kuiper/Oort con disco suave.
- Rugosidad de lunas heladas: `0.28` → `0.55` (sustituye el valor citado en la sección 2).

---

*Verificación: `npm run build` ✅ (tsc + vite).*
