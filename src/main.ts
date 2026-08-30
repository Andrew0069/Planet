import { TimeEngine } from './core/physics/TimeEngine';
import { SceneManager } from './render/SceneManager';
import { UIController } from './ui/UIController';
import { WorkspaceController } from './ui/WorkspaceController';

document.addEventListener('DOMContentLoaded', () => {
  const viewport = document.getElementById('viewport-3d');
  if (!viewport) {
    console.error('No se encontró el contenedor #viewport-3d para WebGL.');
    return;
  }

  // 1. Instanciar motor de tiempo
  const timeEngine = new TimeEngine(new Date());

  // 2. Instanciar gestor de escena 3D (Three.js)
  const sceneManager = new SceneManager(viewport);

  // 3. Instanciar controlador de interfaz de usuario
  const uiController = new UIController(sceneManager, timeEngine);
  new WorkspaceController({
    onSelectBody: (id) => {
      if (id && id !== 'moon' && id !== 'sun') uiController.selectPlanet(id);
    }
  });

  // 4. Gestión de visibilidad y foco para ahorro de energía en ejecutable nativo
  let isAppActive = true;
  document.addEventListener('visibilitychange', () => {
    isAppActive = !document.hidden;
  });
  window.addEventListener('blur', () => {
    isAppActive = false;
  });
  window.addEventListener('focus', () => {
    isAppActive = true;
  });

  // 5. Render & Simulation Loop con throttling inteligente
  let lastDays = timeEngine.getDaysSinceJ2000();
  const startTime = performance.now();
  let lastFrameTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    // En segundo plano / minimizado: reducir frecuencia a ~5 FPS para ahorrar CPU/GPU
    const now = performance.now();
    if (!isAppActive && now - lastFrameTime < 200) {
      return;
    }
    lastFrameTime = now;

    const currentDays = timeEngine.update();
    const deltaDays = currentDays - lastDays;
    lastDays = currentDays;

    const elapsedTime = (now - startTime) / 1000;

    // Actualizar escena 3D
    sceneManager.update(currentDays, deltaDays, elapsedTime);

    // Actualizar interfaz y gráficos
    uiController.update(currentDays);
  }

  animate();
  console.log('🌌 Simulador Astrofísico 3D inicializado con éxito (Optimizado para Escritorio).');
});
