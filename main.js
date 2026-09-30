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

  // Loja: carrossel infinito com rolagem automática, botões laterais, pontos e swipe
  (function () {
    var root = document.getElementById("carousel");
    if (!root) return;
    var viewport = root.querySelector(".c-viewport");
    var track = root.querySelector(".c-track");
    var prevBtn = root.querySelector(".c-prev");
    var nextBtn = root.querySelector(".c-next");
    var dotsEl = document.getElementById("cDots");
    var originals = Array.prototype.slice.call(track.children);
    var n = originals.length;
    var GAP = 16, DELAY = 4500;
    var pv = 0, idx = 0, step = 0, busy = false, timer = null, hovering = false, inView = true;

    function perView() { return window.innerWidth >= 900 ? 2 : 1; }

    function build() {
      pv = perView();
      Array.prototype.slice.call(track.querySelectorAll("[data-clone]")).forEach(function (c) { c.remove(); });
      for (var i = 0; i < pv; i++) {
        var a = originals[n - 1 - i].cloneNode(true), b = originals[i].cloneNode(true);
        [a, b].forEach(function (c) {
          c.setAttribute("data-clone", "1");
          c.setAttribute("aria-hidden", "true");
          Array.prototype.slice.call(c.querySelectorAll("a,button")).forEach(function (x) { x.tabIndex = -1; });
        });
        track.insertBefore(a, track.firstChild);
        track.appendChild(b);
      }
      idx = pv;
      measure();
      place(false);
      dots();
    }

    function measure() { step = originals[0].getBoundingClientRect().width + GAP; }

    function place(animate) {
      track.classList.toggle("is-anim", !!animate && !reduce);
      track.style.transform = "translateX(" + -idx * step + "px)";
      var cur = (((idx - pv) % n) + n) % n;
      Array.prototype.slice.call(dotsEl.children).forEach(function (d, i) { d.classList.toggle("is-active", i === cur); });
    }

    function dots() {
      dotsEl.innerHTML = "";
      for (var i = 0; i < n; i++) dotsEl.appendChild(document.createElement("span"));
      place(false);
    }

    function go(dir) {
      if (busy) return;
      busy = true;
      idx += dir;
      place(true);
      if (reduce) settle();
    }

    // Ao terminar a animação nas cópias das pontas, salta sem transição pro item real
    function settle() {
      track.classList.remove("is-anim");
      if (idx >= n + pv) idx -= n;
      else if (idx < pv) idx += n;
      place(false);
      busy = false;
    }
    track.addEventListener("transitionend", function (e) { if (e.target === track && busy) settle(); });

    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() {
      stop();
      if (reduce || hovering || !inView || document.hidden) return;
      timer = setInterval(function () { go(1); }, DELAY);
    }

    prevBtn.addEventListener("click", function () { go(-1); start(); });
    nextBtn.addEventListener("click", function () { go(1); start(); });
    root.addEventListener("mouseenter", function () { hovering = true; stop(); });
    root.addEventListener("mouseleave", function () { hovering = false; start(); });
    root.addEventListener("focusin", function () { hovering = true; stop(); });
    root.addEventListener("focusout", function () { hovering = false; start(); });
    document.addEventListener("visibilitychange", start);
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { go(-1); start(); }
      if (e.key === "ArrowRight") { go(1); start(); }
    });

    // Arrastar com o dedo/mouse
    var sx = 0, dx = 0, drag = false;
    viewport.addEventListener("pointerdown", function (e) {
      if (busy || e.target.closest("a")) return;
      drag = true; sx = e.clientX; dx = 0; hovering = true; stop();
      track.classList.remove("is-anim"); track.classList.add("is-dragging");
      if (viewport.setPointerCapture) viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener("pointermove", function (e) {
      if (!drag) return;
      dx = e.clientX - sx;
      track.style.transform = "translateX(" + (-idx * step + dx) + "px)";
    });
    function endDrag() {
      if (!drag) return;
      drag = false; track.classList.remove("is-dragging");
      hovering = root.matches(":hover");
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); else place(true);
      start();
    }
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting; start();
      }, { threshold: 0.25 }).observe(root);
    }

    var lastPv = perView();
    window.addEventListener("resize", function () {
      if (perView() !== lastPv) { lastPv = perView(); build(); }
      else { measure(); place(false); }
    });
    window.addEventListener("load", function () { measure(); place(false); });

    build();
    start();
  })();
})();
