(() => {
  const panels = [...document.querySelectorAll('[data-app-install]')];
  if (!panels.length) return;
  const standalone = matchMedia('(display-mode: standalone)');
  let pendingPrompt;
  const update = () => { panels.forEach(panel => panel.hidden = standalone.matches || navigator.standalone === true); };
  update();
  standalone.addEventListener('change', update);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingPrompt = event;
    panels.forEach(panel => panel.querySelector('[role=status]').textContent = '');
  });
  window.addEventListener('appinstalled', () => {
    pendingPrompt = null;
    panels.forEach(panel => panel.hidden = true);
  });
  for (const panel of panels) panel.querySelector('button').addEventListener('click', async () => {
    const hint = panel.querySelector('[role=status]');
    const prompt = pendingPrompt;
    if (prompt) {
      pendingPrompt = null;
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === 'accepted') return;
      } catch { /* Offer the browser's own installation steps. */ }
    }
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    hint.textContent = ios
      ? 'En Safari, toca Compartir y luego Agregar a inicio. Si aparece «Abrir como app web», actívalo y toca Agregar.'
      : 'Abre el menú del navegador y busca «Instalar aplicación» o «Agregar a la pantalla de inicio». Si la opción no aparece, abre la página en Chrome o Edge.';
  });
})();
