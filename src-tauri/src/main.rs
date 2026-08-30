// Evita que se abra una consola adicional en Windows en release. NO ELIMINAR.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Punto de entrada de la aplicacion de escritorio nativo.
/// Arranca el runtime de Tauri, que crea la ventana principal (config en
/// `tauri.conf.json`) y sirve el bundle de Vite (`../dist` en release,
/// `devUrl` en desarrollo).
fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error al iniciar la aplicacion Tauri");
}
