// Efeitos de interface inspirados no site Tribo Academia, sem tela de abertura.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // Ao rolar: chama a função no máximo uma vez por frame
  function onScrollFrame(fn) {
    var ticking = false;
    function run() { ticking = false; fn(); }
    function request() { if (!ticking) { ticking = true; requestAnimationFrame(run); } }
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    fn();
    return request;
  }

  document.getElementById("ano").textContent = new Date().getFullYear();

  // Rótulo "painel de aeroporto": as letras giram e travam da esquerda pra direita
  (function () {
    var el = document.getElementById("eyebrow");
    if (!el || reduce) return;
    var finalText = el.textContent.toUpperCase();
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@*";
    el.setAttribute("aria-label", el.textContent);
    var frame = 0;
    (function spin() {
      var locked = Math.floor(frame / 2);
      var out = "";
      for (var i = 0; i < finalText.length; i++) {
        out += i < locked || finalText[i] === " " ? finalText[i] : chars[(Math.random() * chars.length) | 0];
      }
      el.textContent = out;
      frame++;
      if (locked <= finalText.length) requestAnimationFrame(spin);
      else el.textContent = el.getAttribute("aria-label");
    })();
  })();

  // Revelar ao rolar
  (function () {
    var els = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (!els.length) return;
    if (!hasIO || reduce) { els.forEach(function (e) { e.classList.add("is-visible"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    els.forEach(function (e) { io.observe(e); });
  })();

  // Scrollspy do cabeçalho
  (function () {
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav a[href^='#']"));
    if (!links.length || !hasIO) return;
    var byId = {}, sections = [];
    links.forEach(function (l) {
      var id = l.getAttribute("href").slice(1), s = document.getElementById(id);
      if (s) { byId[id] = l; sections.push(s); }
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) links.forEach(function (l) { l.classList.toggle("is-active", byId[en.target.id] === l); });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (s) { io.observe(s); });
  })();

  // WhatsApp flutuante: só depois de passar da primeira tela
  (function () {
    var wa = document.getElementById("waFloat"), target = document.getElementById("servicos");
    if (!wa || !target) return;
    if (!hasIO) { wa.hidden = false; return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { wa.hidden = false; io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -60% 0px" });
    io.observe(target);
  })();

  // Cartões que empilham: o de baixo encolhe e escurece quando o próximo sobe
  (function () {
    var folhas = Array.prototype.slice.call(document.querySelectorAll(".folha"));
    if (!folhas.length || reduce) return;
    var TOPO = 90, naturais = [];
    function medir() {
      naturais = folhas.map(function (f) {
        var prev = f.style.position;
        f.style.position = "static";
        var y = f.getBoundingClientRect().top + window.scrollY;
        f.style.position = prev;
        return y;
      });
    }
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("load", medir);
    onScrollFrame(function () {
      folhas.forEach(function (f, i) {
        var vao = f.offsetHeight + 16;
        var preso = clamp((window.scrollY + TOPO - naturais[i]) / vao, 0, 1);
        f.style.transform = "scale(" + (1 - preso * 0.1) + ")";
        f.style.filter = "brightness(" + (1 - preso * 0.5) + ")";
        f.style.zIndex = i;
      });
    });
  })();

  // Painéis que expandem (clique / hover / teclado) com pulso de dica
  (function () {
    var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
    var plans = document.querySelector(".plans");
    if (!panels.length) return;
    var hasHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
    function open(target) {
      panels.forEach(function (p) { p.classList.toggle("is-open", p === target); });
      if (plans) plans.classList.remove("is-hinting");
    }
    panels.forEach(function (p) {
      p.addEventListener("click", function () { open(p); });
      p.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(p); }
      });
      if (hasHover) p.addEventListener("mouseenter", function () { open(p); });
    });
    if (plans && hasIO && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { plans.classList.add("is-hinting"); io.unobserve(en.target); }
        });
      }, { threshold: 0.4 });
      io.observe(plans);
    }
  })();

  // Loja: a seção fica presa e a rolagem vertical vira deslocamento horizontal
  (function () {
    var section = document.getElementById("loja"), track = document.getElementById("lojaTrack");
    if (!section || !track || reduce) return;
    var pan = 0;
    function recalc() {
      var prev = track.style.transform;
      track.style.transform = "translateX(0px)";
      pan = Math.max(track.getBoundingClientRect().left + track.scrollWidth - window.innerWidth, 0);
      track.style.transform = prev;
      section.style.height = pan + window.innerHeight + "px";
    }
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("load", recalc);
    onScrollFrame(function () {
      if (pan <= 0) { track.style.transform = ""; return; }
      var progress = clamp(-section.getBoundingClientRect().top / pan, 0, 1);
      track.style.transform = "translateX(-" + progress * pan + "px)";
    });
  })();
})();
