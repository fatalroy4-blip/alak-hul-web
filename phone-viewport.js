/* Fit the full character sheet on phones using the browser's native zoom. */
(() => {
  const phone = navigator.userAgentData?.mobile ||
    /iPhone|iPod|Android.+Mobile|Windows Phone/i.test(navigator.userAgent);
  // A narrow browser window is not an installed phone app. Exclude tablets,
  // including iPads requesting desktop websites, and keep rotation independent.
  const phoneApp = () => !!phone && !/iPad|Tablet|Silk/i.test(navigator.userAgent) &&
    Math.min(screen.width, screen.height) < 600 &&
    (matchMedia('(display-mode: standalone)').matches || navigator.standalone === true);
  window.alakPhoneApp = phoneApp;
  if (phone) {
    document.querySelector('meta[name="viewport"]').content = 'width=1440, user-scalable=yes';
  }
})();
