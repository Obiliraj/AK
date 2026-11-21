/*
  Remembers the player's name in this browser (localStorage).
  Used by the landing page and by games.
*/
window.PlayerName = (function () {
  const KEY = "kgz.playerName";
  const MAX = 30;
  function clean(name) {
    return String(name || "").replace(/\s+/g, " ").trim().slice(0, MAX);
  }
  return {
    MAX: MAX,
    get: function () {
      try { return clean(localStorage.getItem(KEY)); } catch (e) { return ""; }
    },
    set: function (name) {
      const n = clean(name);
      try { if (n) localStorage.setItem(KEY, n); else localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
      return n;
    }
  };
})();
