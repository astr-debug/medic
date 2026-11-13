/* Руководство поверх текущей страницы: открывается в этой же вкладке,
   «Вернуться», Esc или кнопка «Назад» браузера закрывают его — и вы там же, где были. */
(function () {
  var view = null, opened = false;
  function close(fromPop) {
    if (!opened) return;
    opened = false;
    view.hidden = true;
    document.documentElement.classList.remove("hv-open");
    if (!fromPop && history.state && history.state.hv) history.back();
    if (view._ret && view._ret.focus) view._ret.focus();
  }
  window.openHelpView = function (opt) {
    if (!view) {
      view = document.createElement("div");
      view.id = "helpView";
      view.className = "hv";
      view.setAttribute("role", "dialog");
      view.setAttribute("aria-modal", "true");
      document.body.appendChild(view);
      window.addEventListener("popstate", function () { if (opened) close(true); });
      document.addEventListener("keydown", function (e) { if (opened && e.key === "Escape") { e.preventDefault(); close(false); } }, true);
    }
    view._ret = document.activeElement;
    view.innerHTML =
      '<div class="hv-bar"><button type="button" class="btn primary hv-back">← ' + (opt.backLabel || "Вернуться") + '</button>' +
      '<span class="hv-title">' + opt.title + '</span></div>' +
      '<div class="hv-doc"><nav class="hv-toc" aria-label="Содержание">' + opt.toc + '</nav>' +
      '<article class="hv-art">' + opt.body + '</article></div>';
    view.hidden = false;
    opened = true;
    document.documentElement.classList.add("hv-open");
    view.scrollTop = 0;
    history.pushState({ hv: 1 }, "");
    view.querySelector(".hv-back").onclick = function () { close(false); };
    view.querySelector(".hv-back").focus();
    /* оглавление прокручивает внутри руководства, адрес страницы не меняется */
    view.querySelectorAll('.hv-toc a[href^="#"]').forEach(function (a) {
      a.onclick = function (e) {
        e.preventDefault();
        var t = view.querySelector('[id="' + a.getAttribute("href").slice(1) + '"]');
        if (t) t.scrollIntoView({ block: "start", behavior: "smooth" });
      };
    });
  };
  window.helpViewOpen = function () { return opened; };
})();
