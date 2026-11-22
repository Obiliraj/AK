/*
  Site-wide sound on/off (one setting for every game).
  The switch lives on the landing page; games ask SiteSound.isMuted() before playing
  any sound or reading text aloud. Load this in the <head> of every page, after theme.js.
  While muted, <html> gets the class "muted" (portal.css hides the "Read it to me" buttons).
*/
window.SiteSound = (function () {
  const KEY = "kgz.muted";
  const listeners = [];

  function read() {
    try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }
  let muted = read();

  function apply() {
    document.documentElement.classList.toggle("muted", muted);
    if (muted && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    }
    listeners.forEach((fn) => { try { fn(muted); } catch (e) { /* ignore */ } });
  }

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch (e) { /* storage blocked */ }
    apply();
    return muted;
  }

  // Another tab changed the setting
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) { muted = read(); apply(); }
  });

  apply();

  return {
    isMuted: () => muted,
    setMuted: setMuted,
    toggle: () => setMuted(!muted),
    onChange: (fn) => { listeners.push(fn); }
  };
})();
