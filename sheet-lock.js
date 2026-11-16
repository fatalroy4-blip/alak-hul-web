(() => {
  const sheet = document.querySelector('#character .sheet-scroll');
  const toggle = document.querySelector('[data-sheet-lock]');
  if (!sheet || !toggle) return;

  const live = '[data-char="hpCurrent"], [data-char="hpTemp"], [data-char="hitDice"], [data-char="hitDiceUsed"], [data-char^="spell_slots"], [data-death] *, .sheet-level-slot-track *, .sheet-spell-name';
  const controls = 'input:not([type="hidden"]), textarea, select, [contenteditable="true"]';
  const protectedField = element => element.matches(controls) && !element.matches(live);
  let locked = true;
  // Keep native disabled/readonly flags under the control of the sheet and its permissions.
  function sync(element) {
    if (!protectedField(element)) return;
    if (locked && !element.inert) {
      element.setAttribute('data-sheet-protected', '');
      element.inert = true;
    } else if (!locked && element.hasAttribute('data-sheet-protected')) {
      element.inert = false;
      element.removeAttribute('data-sheet-protected');
    }
  }
  function refresh() {
    sheet.querySelectorAll(controls).forEach(sync);
    toggle.textContent = locked ? '🔒 Desbloquear escritura' : '🔓 Bloquear escritura';
    toggle.setAttribute('aria-label', 'Bloqueo de escritura');
    toggle.setAttribute('aria-pressed', String(locked));
  }
  toggle.addEventListener('click', () => { locked = !locked; refresh(); });
  // Labels can forward a click to an inert checkbox or file picker.
  sheet.addEventListener('click', event => {
    if (!locked || event.target.closest('button, a')) return;
    const field = event.target.closest('label')?.control;
    if (field && protectedField(field)) event.preventDefault();
  }, true);
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType !== 1) continue;
      sync(node);
      node.querySelectorAll(controls).forEach(sync);
    }
  }).observe(sheet, {subtree:true, childList:true});
  refresh();
})();
