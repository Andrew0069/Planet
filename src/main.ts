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

  // 4. Render & Simulation Loop
  let lastDays = timeEngine.getDaysSinceJ2000();
  const startTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const currentDays = timeEngine.update();
    const deltaDays = currentDays - lastDays;
    lastDays = currentDays;

    const elapsedTime = (performance.now() - startTime) / 1000;

    // Actualizar escena 3D
    sceneManager.update(currentDays, deltaDays, elapsedTime);

    // Actualizar interfaz y gráficos
    uiController.update(currentDays);
  }

  animate();
  console.log('🌌 Simulador Astrofísico 3D inicializado con éxito.');
});
