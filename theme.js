/* Переключатель светлой и тёмной темы. Выбор запоминается в этом браузере.
   Пока не выбрано — тема как в системе компьютера. */
(function () {
  var K = "medic-theme";
  var MOON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  var SUN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var saved = null;
  try { saved = localStorage.getItem(K); } catch (e) {}
  if (saved === "dark" || saved === "light") document.documentElement.setAttribute("data-theme", saved);
  function current() {
    var a = document.documentElement.getAttribute("data-theme");
    if (a) return a;
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function paint() {
    var b = document.getElementById("themeBtn");
    if (!b) return;
    var dark = current() === "dark";
    b.innerHTML = dark ? SUN : MOON;
    b.title = dark ? "Включить светлую тему" : "Включить тёмную тему";
    b.setAttribute("aria-label", b.title);
  }
  window.toggleTheme = function () {
    var next = current() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(K, next); } catch (e) {}
    paint();
  };
  function init() { var b = document.getElementById("themeBtn"); if (b) { b.onclick = window.toggleTheme; paint(); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
