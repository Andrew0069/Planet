# 🖥️ Compilación de Aplicación de Escritorio Nativa (Tauri v2)

Este documento detalla el procedimiento para empaquetar el simulador del **Sistema Solar 3D** como una aplicación de escritorio ejecutable nativa (`.exe` en Windows, binario en Linux y macOS).

Al utilizar **Tauri v2** en lugar de Electron, el programa consume una fracción mínima de recursos:
- **Tamaño del instalador/ejecutable:** ~10 MB (vs. > 150 MB en Electron)
- **Consumo de Memoria RAM Base:** ~40 - 70 MB (vs. > 300 MB en Electron)
- **Rendimiento:** Ejecución sobre el runtime WebGL nativo del SO (`WebView2` en Windows, `WebKitGTK` en Linux, `WKWebView` en macOS).

---

## 🛠️ 1. Requisitos del Sistema para Compilar

### Node.js
- Node.js 18+ y npm (ya instalados para el proyecto).

### Rust Toolchain (`rustup`)
- **Windows:** Instalar [`rustup-init.exe`](https://rustup.rs/) o ejecutar `winget install --id Rustlang.Rustup`. Requiere las *Herramientas de compilación de Visual Studio C++* ("Desarrollo para el escritorio con C++").
- **Linux:** `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **macOS:** `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` y `xcode-select --install`.

Verifica la instalación ejecutando:
```bash
cargo --version
```

---

## 🚀 2. Comandos de Desarrollo y Compilación

### Instalación de dependencias
```bash
npm install
```

### Ejecutar en Modo Desarrollo de Escritorio (Hot-Reload)
```bash
npm run tauri:dev
```
Este comando inicia Vite en segundo plano y abre la ventana nativa de la aplicación a 1280×720 con live reload habilitado.

### Compilar Ejecutable de Producción Liviano
```bash
npm run tauri:build
```
Este comando:
1. Compila el frontend TypeScript + Vite (`npm run build` -> genera `dist/`).
2. Compila el backend en Rust optimizando tamaño (`lto`, `opt-level = "s"`, `strip`).
3. Empaqueta el instalador/ejecutable nativo.

---

## 📦 3. Ubicación de los Artefactos Generados

Una vez finalizado `npm run tauri:build`, encontrarás los archivos compilados en:

* **Ejecutable Standalone (Windows):** `src-tauri/target/release/sistema_solar_3d.exe`
* **Instaladores (MSI / NSIS):** `src-tauri/target/release/bundle/nsis/` o `bundle/msi/`
* **Binarios Linux / macOS:** `src-tauri/target/release/bundle/appimage/`, `deb/` o `dmg/`

---

## ⚡ 4. Recomendaciones para Equipos de Pocos Recursos

La aplicación cuenta con optimizaciones nativas integradas:
1. **Modo Rendimiento (Low-Spec):** Se puede activar desde la barra superior de la aplicación para desactivar sombras dinámicas y postprocesado Bloom (`UnrealBloomPass`), reduciendo la carga en GPU en un ~60%.
2. **Pausa Automática:** La aplicación detecta cuando la ventana pierde el foco o se minimiza y pausa la renderización 3D para liberar ciclos de CPU y GPU.
3. **Throttling de Gráficos:** Los gráficos telemétricos de Chart.js se actualizan con frecuencias reguladas sin animaciones pesadas de canvas.
