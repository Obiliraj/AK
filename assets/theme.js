/*
  Color themes for the whole site.
  Load this in the <head> of every page (before the stylesheet is used),
  so the saved theme is applied before anything is drawn.
  The colors themselves live in assets/portal.css.
*/
window.SiteTheme = (function () {
  const KEY = "kgz.theme";
  const THEMES = [
    { id: "midnight",  name: "Midnight Pop",   emoji: "🌙", meta: "#1A252C",
      swatch: ["#1A252C", "#FAD201", "#E15959", "#00A8B5", "#FFFFFF"] },
    { id: "berry",     name: "Berry Twilight", emoji: "🍇", meta: "#1e1027",
      swatch: ["#b7094c", "#a01a58", "#892b64", "#723c70", "#5c4d7d", "#455e89", "#2e6f95", "#1780a1", "#0091ad"] },
    { id: "lagoon",    name: "Neon Lagoon",    emoji: "🐢", meta: "#2b0f30",
      swatch: ["#3c1642", "#086375", "#1dd3b0", "#affc41", "#b2ff9e"] },
    { id: "sunset",    name: "Ocean Sunset",   emoji: "🌅", meta: "#001219",
      swatch: ["#001219", "#005f73", "#0a9396", "#94d2bd", "#e9d8a6", "#ee9b00", "#ca6702", "#bb3e03", "#ae2012", "#9b2226"] },
    { id: "steel",     name: "Silver Steel",   emoji: "🪙", meta: "#e9ecef",
      swatch: ["#f8f9fa", "#e9ecef", "#dee2e6", "#ced4da", "#adb5bd", "#6c757d", "#495057", "#343a40", "#212529"] },
    { id: "christmas", name: "Christmas",      emoji: "🎄", meta: "#24442b",
      swatch: ["#386641", "#6a994e", "#a7c957", "#f2e8cf", "#bc4749"] }
  ];
  const DEFAULT = "midnight";

  function find(id) { return THEMES.find((t) => t.id === id) || THEMES[0]; }

  function apply(id) {
    const t = find(id);
    const root = document.documentElement;
    if (t.id === DEFAULT) root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t.id);
    let meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t.meta);
    return t;
  }

  function get() {
    try { return find(localStorage.getItem(KEY) || DEFAULT).id; } catch (e) { return DEFAULT; }
  }

  function set(id) {
    const t = apply(id);
    try { localStorage.setItem(KEY, t.id); } catch (e) { /* storage blocked */ }
    return t;
  }

  apply(get());
  return { list: THEMES, get: get, set: set };
})();
