/* Fit the full character sheet on phones using the browser's native zoom. */
(() => {
  const phone = navigator.userAgentData?.mobile ||
    /iPhone|iPod|Android.+Mobile|Windows Phone/i.test(navigator.userAgent);
  if (phone) {
    document.querySelector('meta[name="viewport"]').content = 'width=1440, user-scalable=yes';
  }
})();
