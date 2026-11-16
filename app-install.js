(() => {
  const panel = document.querySelector('[data-app-install]');
  if (!panel) return;
  const button = panel.querySelector('button');
  const hint = panel.querySelector('[role="status"]');
  const standalone = matchMedia('(display-mode: standalone)');
  let pendingPrompt;
  const update = () => { panel.hidden = standalone.matches || navigator.standalone === true; };
  update();
  standalone.addEventListener('change', update);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingPrompt = event;
    hint.textContent = '';
  });
  window.addEventListener('appinstalled', () => {
    pendingPrompt = null;
    panel.hidden = true;
  });
  button.addEventListener('click', async () => {
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
