(() => {
  const counter = document.getElementById('fulgorUsos');
  const description = document.getElementById('fulgorDescripcion');
  function render() {
    const wisdom = Number(document.querySelector('[data-char="ability_4"]').value);
    const maximum = Math.max(1, Math.floor(((Number.isFinite(wisdom) ? wisdom : 10) - 10) / 2));
    const spent = Math.min(maximum, state.wardingFlareUsed || 0);
    counter.replaceChildren();
    for (let use = 1; use <= maximum; use++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'flare-dot';
      dot.title = 'Uso ' + use + ' de ' + maximum;
      dot.setAttribute('aria-label', dot.title);
      dot.setAttribute('aria-pressed', String(use <= spent));
      dot.onclick = () => {
        state.wardingFlareUsed = use <= spent ? use - 1 : use;
        saveState();
        render();
        counter.children[use - 1]?.focus({preventScroll:true});
      };
      counter.append(dot);
    }
  }
  document.getElementById('fulgorAbrir').onclick = () => {
    dialogContent.replaceChildren(description.content.cloneNode(true));
    spellDialog.showModal();
  };
  document.querySelector('[data-char="ability_4"]').addEventListener('input', render);
  new MutationObserver(render).observe(document.getElementById('channel'), {attributes:true, attributeFilter:['class']});
  window.alakRenderWardingFlare = render;
  render();
})();
