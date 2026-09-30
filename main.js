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
    var els = Array.prototype.slice.call(document.querySelectorAll(".reveal, .perk"));
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
    var GAP = 16, DELAY = 3500;
    // "hovering" só vale durante o arraste; o carrossel continua girando com mouse em cima ou foco nos botões
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
      hovering = false;
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

  // Hero: logo 3D — cai e bate no chão, os cacos assentam no piso, o celular de tela trincada levanta
  // do monte, a tela se cura e a logo nasce de dentro dela. Roda sozinha, em ciclo.
  (function () {
    var stage = document.getElementById("logoStage");
    if (!stage) return;
    var dataEl = document.getElementById("logoData");
    if (reduce || !dataEl) {
      Array.prototype.slice.call(document.querySelectorAll("animateTransform")).forEach(function (a) { a.remove(); });
      return;
    }
    var D = JSON.parse(dataEl.textContent);
    var OX = D.ox, OY = D.oy, VS = D.vs, U = 100 / VS, P = D.pieces, N = P.length, AP = D.apple;
    var FL = D.vy + 0.96 * D.vs;                       // altura do chão, em unidades do desenho
    var els = Array.prototype.slice.call(stage.querySelectorAll(".pc"));
    var $ = function (id) { return document.getElementById(id); };
    var applePose = $("applePose"), phone = $("phone"), scan = $("scan"), shake = $("shake"), sway = stage.querySelector(".sway");
    var shock1 = $("shock1"), shock2 = $("shock2"), bloom = $("bloom");
    var sparks = Array.prototype.slice.call($("sparks").children), dust = Array.prototype.slice.call($("dust").children);

    // ---------- linha do tempo (segundos, ciclo de 12,4 s; a abertura pula direto para 1 s antes da queda) ----------
    var CY = 13.15, OPEN_HOLD = 1.0;
    var T = { wind: 3.0, drop: 4.3, imp: 4.8, frz: 4.9, rise: 7.35, riseEnd: 9.05, heal: 9.75, healEnd: 10.95, birth: 10.95, birthEnd: 12.65 };

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function mix(a, b, k) { return a + (b - a) * k; }
    function k01(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
    function ease3(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
    function outCubic(k) { return 1 - Math.pow(1 - k, 3); }
    function outQuad(k) { return 1 - (1 - k) * (1 - k); }
    function outBack(k) { var c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
    function rng(seed) {
      return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    }
    function mixPose(a, b, k) {
      return { x: mix(a.x, b.x, k), y: mix(a.y, b.y, k), z: mix(a.z, b.z, k), rx: mix(a.rx, b.rx, k), ry: mix(a.ry, b.ry, k), rz: mix(a.rz, b.rz, k), s: mix(a.s, b.s, k), th: mix(a.th, b.th, k), op: mix(a.op, b.op, k) };
    }
    var ID = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, th: 1, op: 1 };

    // ---------- giro das trilhas (estado "logo"): recomeça do zero a cada ciclo ----------
    function ramp(dt) { var r = 1.2; return dt < r ? dt * dt / (2 * r) : dt - r / 2; }
    function ringPose(i, tc) {
      var p = P[i], a = ramp(tc), th = p.g === "long" ? a * 7.8 : -a * 12, r = th * Math.PI / 180, dx = p.cx - OX, dy = p.cy - OY;
      return { x: dx * Math.cos(r) - dy * Math.sin(r) - dx, y: dx * Math.sin(r) + dy * Math.cos(r) - dy, z: 0, rx: 0, ry: 0, rz: th, s: 1, th: 1, op: 1 };
    }

    // ---------- estados por ciclo: queda no chão e celular ----------
    var SCR = { w: 124, h: 260 }, IMPACT = { x: OX + 12, y: OY + 36 };
    var F = [], PH = [], PHY = [], AF = null, cycleId = -1;
    function buildCycle(n) {
      cycleId = n;
      var r = rng(n * 7919 + 13), i;
      // cacos que assentam no chão (elipse rasa), com salto e giro próprios
      F = P.map(function (p, j) {
        var a = j * 2.39996 + r() * 0.7, rad = Math.sqrt((j + 0.5) / N), st = ringPose(j, T.imp);
        var ax = OX + Math.cos(a) * rad * 88, ay = FL - 5 + Math.sin(a) * rad * 13;
        return { x: ax - p.cx, y: ay - p.cy, z: -18 + r() * 42, rx: 70 + r() * 12, ry: (r() - 0.5) * 16, rz: st.rz + (r() < 0.5 ? -1 : 1) * (120 + r() * 200),
                 s: 0.8 + r() * 0.12, d: r() * 0.09, D: 0.7 + r() * 0.3, H: 8 + r() * 20, B: 5 + r() * 8, st: st };
      });
      // a maçã não quebra: cai inteira no meio do monte
      AF = { x: OX - AP.cx, y: FL - 10 - AP.cy, z: 8, rx: 68, ry: 0, rz: 10, s: 0.82, d: 0.03, D: 0.85, H: 10, B: 6 };
      // rachaduras a partir do ponto de impacto: peças mais longas pegam as direções mais longas
      var dirs = [], k;
      for (k = 0; k < N; k++) {
        var a2 = ((k * 360 / N) + 12 + (r() - 0.5) * 16) * Math.PI / 180, ca = Math.cos(a2), sa = Math.sin(a2), t = 1e9;
        if (ca > 0) t = Math.min(t, (OX + SCR.w / 2 - IMPACT.x) / ca); else if (ca < 0) t = Math.min(t, (OX - SCR.w / 2 - IMPACT.x) / ca);
        if (sa > 0) t = Math.min(t, (OY + SCR.h / 2 - IMPACT.y) / sa); else if (sa < 0) t = Math.min(t, (OY - SCR.h / 2 - IMPACT.y) / sa);
        dirs.push({ a: a2, t: t });
      }
      var byLen = P.map(function (p, j) { return j; }).sort(function (a, b) { return P[b].len - P[a].len; });
      dirs.sort(function (a, b) { return b.t - a.t; });
      PH = new Array(N); PHY = new Array(N);
      byLen.forEach(function (i, rank) {
        var p = P[i], d = dirs[rank], gap = 7 + (rank % 3) * 5, cd = Math.abs(Math.cos(d.a)), sd = Math.abs(Math.sin(d.a));
        var s = clamp(Math.min((d.t - gap) * 0.9, p.len) / p.len, 0.3, 1);
        s = Math.min(s, (SCR.w / 2 - 4) / (cd * p.len / 2 + sd * p.rad * 0.35 + 0.001), (SCR.h / 2 - 4) / (sd * p.len / 2 + cd * p.rad * 0.35 + 0.001));
        var half = s * p.len / 2, w2 = s * p.rad * 0.35, hx = cd * half + sd * w2, hy = sd * half + cd * w2;
        var mx = IMPACT.x + Math.cos(d.a) * (gap + half), my = IMPACT.y + Math.sin(d.a) * (gap + half);
        mx = clamp(mx, OX - SCR.w / 2 + hx + 2, OX + SCR.w / 2 - hx - 2); my = clamp(my, OY - SCR.h / 2 + hy + 2, OY + SCR.h / 2 - hy - 2);
        var rz = d.a * 180 / Math.PI - p.ang;
        rz += 360 * Math.round((F[i].rz - rz) / 360);
        PH[i] = { x: mx - p.cx, y: my - p.cy, z: 6, rx: 0, ry: 0, rz: rz, s: s, th: 0.42, op: 1 };
        PHY[i] = clamp((my - (OY - SCR.h / 2)) / SCR.h, 0, 1);   // altura da peça na tela (0 topo, 1 base)
      });
    }
    // voo dos cacos: sobem em arco, caem, quicam e assentam deitados no chão
    function flight(f, tc, home) {
      var t = tc - T.frz - f.d, k = clamp(t / f.D, 0, 1), st = home || f.st;
      var q = { x: mix(st.x, f.x, outQuad(k)), y: mix(st.y, f.y, k) - f.H * 4 * k * (1 - k), z: f.z * outQuad(k),
                rx: mix(st.rx || 0, f.rx, ease3(k)), ry: f.ry * Math.sin(k * Math.PI), rz: mix(st.rz || 0, f.rz, outCubic(k)), s: mix(1, f.s, k), th: 1, op: 1 };
      if (t > f.D) {
        var u = t - f.D, dm = Math.exp(-u * 6);
        q.y -= f.B * dm * Math.abs(Math.sin(u * 12)); q.rx += 4 * Math.exp(-u * 5) * Math.sin(u * 17); q.rz += 3 * Math.exp(-u * 4) * Math.sin(u * 11);
      }
      return q;
    }
    function restOf(f) { return { x: f.x, y: f.y, z: f.z, rx: f.rx, ry: 0, rz: f.rz, s: f.s, th: 1, op: 1 }; }

    function pieceAt(i, tc) {
      if (tc < T.wind) return ringPose(i, tc);
      if (tc < T.imp) return ringPose(i, tc);   // a logo inteira sobe e cai (ver wrapper), sem vibrar
      if (tc < T.frz) return ringPose(i, T.imp);
      var f = F[i];
      if (tc < T.rise + i * 0.035) return flight(f, tc);                       // voa, quica e fica no chão
      if (tc < T.riseEnd) {                                                    // levanta do monte e vira as rachaduras do celular
        var st0 = T.rise + i * 0.035, k = ease3(k01(tc, st0, st0 + 1.25)), r = mixPose(restOf(f), PH[i], k), arc = Math.sin(Math.PI * k);
        r.y -= 26 * arc; r.z += 40 * arc; return r;
      }
      var h = PH[i], br = Math.sin(tc * 2.4 + i) * 0.4;
      var pose = { x: h.x, y: h.y, z: h.z + br, rx: 0, ry: 0, rz: h.rz, s: h.s, th: h.th, op: 1 };
      if (tc < T.birth - 0.001) {                                              // a tela é curada: o feixe apaga as rachaduras por onde passa
        var v = k01(tc, T.heal, T.heal + 0.75), fade = clamp((v - PHY[i]) / 0.14, 0, 1);
        if (tc >= T.heal) { pose.op = 1 - ease3(fade); pose.s = h.s * (1 - 0.12 * fade); }
        return pose;
      }
      if (tc < T.birthEnd) {                                                   // a logo nasce de dentro da tela e cresce
        var b0 = T.birth + i * 0.02, kb = k01(tc, b0, T.birthEnd);
        var seed = { x: OX - P[i].cx, y: OY - P[i].cy, z: -6, rx: 0, ry: 0, rz: (i % 2 ? 1 : -1) * 110, s: 0.05, th: 1, op: 0 };
        var g = mixPose(seed, ID, outBack(kb)); g.op = clamp(kb * 3.2, 0, 1); return g;
      }
      return ID;
    }
    function appleAt(tc) {
      var ghost = { x: 0, y: 0, z: 4, rx: 0, ry: 0, rz: 0, s: 0.9, th: 1, op: 0.42 };
      if (tc < T.wind) return ID;
      if (tc < T.frz) return ID;
      if (tc < T.rise) return flight(AF, tc, { x: 0, y: 0, rx: 0, rz: 0 });
      if (tc < T.riseEnd) {
        var k = ease3(k01(tc, T.rise + 0.1, T.riseEnd - 0.1)), r = mixPose(restOf(AF), ghost, k);
        r.y -= 30 * Math.sin(Math.PI * k); r.z += 30 * Math.sin(Math.PI * k); return r;
      }
      if (tc < T.birth) { var lit = k01(tc, T.heal + 0.5, T.healEnd); return { x: 0, y: 0, z: 4, rx: 0, ry: 0, rz: 0, s: 0.9, th: 1, op: mix(0.42, 0.56, lit) + Math.sin(tc * 3.4) * 0.05 }; }
      if (tc < T.birthEnd) { var g = mixPose({ x: 0, y: 0, z: 4, rx: 0, ry: 0, rz: 0, s: 0.9, th: 1, op: 0.56 }, ID, outBack(k01(tc, T.birth + 0.1, T.birthEnd))); g.op = clamp(g.op, 0, 1); return g; }
      return ID;
    }

    // ---------- queda e impacto no chão (a logo inteira) ----------
    var RH = 44;   // altura da subida, px (ajustada ao tamanho da cena)
    function wrapperAt(tc) {
      var w = { y: 0, rot: 0, sx: 1, sy: 1, jx: 0, jy: 0 };
      if (tc < T.wind) return w;
      if (tc < T.drop) {                       // sobe suave (sem tremer), desacelera e hesita no topo
        var ku = k01(tc, T.wind, T.wind + 1.15);
        w.y = -RH * (0.5 - 0.5 * Math.cos(Math.PI * ku)) - 3 * k01(tc, T.wind + 1.15, T.drop); w.rot = 1.5 * Math.sin(Math.PI * ku); return w;
      }
      if (tc < T.imp) {                        // despenca: acelera, inclina e estica com a velocidade
        var k = k01(tc, T.drop, T.imp), y0 = -RH - 3;
        w.y = y0 * (1 - k * k); w.rot = 1.5 - 9.5 * k; w.sy = 1 + 0.08 * k; w.sx = 1 - 0.05 * k; return w;
      }
      var t = tc - T.imp;
      if (t < 0.1) { w.y = 3; w.sy = 0.84; w.sx = 1.1; w.rot = -1; return w; }        // achata no impacto
      t -= 0.1;
      if (t < 1.1) {                           // quica e se recompõe (amortecido)
        var dcy = Math.exp(-t * 6.5);
        w.y = -Math.min(RH * 0.22, 24) * Math.abs(Math.sin(t * 9.5)) * dcy;
        var sq = Math.cos(t * 26) * Math.exp(-t * 9);
        w.sy = 1 - 0.16 * sq; w.sx = 1 + 0.1 * sq; w.rot = -1 * Math.exp(-t * 8);
        w.jx = Math.sin(t * 110) * 5 * Math.exp(-t * 10); w.jy = Math.cos(t * 95) * 4 * Math.exp(-t * 10);
      }
      // a logo termina de nascer: pequeno "estalo" ao assentar
      var t2 = tc - (T.birthEnd - 0.15);
      if (t2 >= 0 && t2 < 0.5) { var e = Math.exp(-t2 * 9) * Math.sin(t2 * 30); w.sy *= 1 - 0.05 * e; w.sx *= 1 + 0.03 * e; }
      return w;
    }
    // balanço de flutuação: forte quando a logo paira, some no chão, volta suave no final
    function swayAmp(tc) {
      if (tc < T.drop) return 1;
      if (tc < T.imp) return mix(1, 0.25, k01(tc, T.drop, T.imp));
      if (tc < T.imp + 0.12) return mix(0.25, 0, k01(tc, T.imp, T.imp + 0.12));
      if (tc < T.riseEnd - 0.5) return 0;
      if (tc < T.birth) return mix(0, 0.4, k01(tc, T.riseEnd - 0.5, T.riseEnd + 0.3));
      if (tc < T.birthEnd) return mix(0.4, 1, ease3(k01(tc, T.birth, T.birthEnd)));
      return 1;
    }

    function poseStr(p) {
      return "translate3d(" + (p.x * U).toFixed(3) + "%," + (p.y * U).toFixed(3) + "%," + p.z.toFixed(2) + "px) rotateX(" + p.rx.toFixed(2) + "deg) rotateY(" + p.ry.toFixed(2) + "deg) rotateZ(" + p.rz.toFixed(2) + "deg) scale(" + p.s.toFixed(3) + ")";
    }
    function render(tc, tabs) {
      var i, v, sw = stage.clientWidth || 464, sk = sw / 464;
      RH = Math.max(26, (stage.clientHeight || 500) * 0.17);
      for (i = 0; i < N; i++) {
        var p = pieceAt(i, tc), ang = P[i].ang.toFixed(1), nang = (-P[i].ang).toFixed(1);
        els[i].style.transform = poseStr(p) + " rotateZ(" + ang + "deg) scale(1," + p.th.toFixed(3) + ") rotateZ(" + nang + "deg)";
        els[i].style.opacity = p.op.toFixed(3);
      }
      var ap = appleAt(tc);
      applePose.style.transform = poseStr(ap); applePose.style.opacity = clamp(ap.op, 0, 1).toFixed(3);
      // logo inteira: queda, achatamento, quique e tremor
      var w = wrapperAt(tc);
      shake.style.transform = "translate3d(" + w.jx.toFixed(2) + "px," + (w.y + w.jy).toFixed(2) + "px,0) rotate(" + w.rot.toFixed(2) + "deg) scale(" + (0.9 * w.sx).toFixed(4) + "," + (0.9 * w.sy).toFixed(4) + ")";
      var amp = swayAmp(tc), pp = tabs * 2 * Math.PI / 9, u = (1 - Math.cos(pp)) / 2;
      sway.style.transform = "translateY(" + ((-10 + 20 * u) * amp).toFixed(2) + "px) rotateY(" + ((-16 + 32 * u) * amp).toFixed(2) + "deg) rotateX(" + ((7 - 12 * u) * amp).toFixed(2) + "deg)";
      // sombra no chão reage à altura; onda de choque e poeira no impacto
      var raise = clamp(-w.y / RH, 0, 1), tt = tc - T.imp;
      var fsx = mix(1, 0.6, raise), fop = mix(0.75, 0.38, raise), flare = tt >= 0 && tt < 0.9 ? Math.exp(-tt * 5) : 0;
      fsx *= 1 + 0.6 * flare; fop = Math.min(1, fop + 0.25 * flare);
      stage.style.setProperty("--fsx", fsx.toFixed(3)); stage.style.setProperty("--fsy", (mix(1, 0.7, raise) * (1 + 0.3 * flare)).toFixed(3)); stage.style.setProperty("--fop", fop.toFixed(3));
      var kk1 = k01(tt, 0, 0.95), kk2 = k01(tt, 0.13, 1.1);
      shock1.style.setProperty("--ks", (0.2 + 1.25 * outCubic(kk1)).toFixed(3)); shock1.style.setProperty("--ko", (tt < 0 ? 0 : (1 - kk1) * 0.85).toFixed(3));
      shock2.style.setProperty("--ks", (0.2 + 1.25 * outCubic(kk2)).toFixed(3)); shock2.style.setProperty("--ko", (tt < 0.13 ? 0 : (1 - kk2) * 0.5).toFixed(3));
      dust.forEach(function (el, n) {
        var life = tt - (n % 3) * 0.03;
        if (life < 0 || life > 1.0) { if (el.style.opacity !== "0") el.style.opacity = 0; return; }
        var kd = outCubic(life), side = n % 2 ? 1 : -1, dist = (20 + (n >> 1) * 11) * sk;
        el.style.opacity = (0.4 * (1 - life)).toFixed(3);
        el.style.transform = "translate(" + (side * dist * kd * 3).toFixed(1) + "px," + (-(6 + (n % 4) * 5) * sk * kd).toFixed(1) + "px) scale(" + (0.7 + kd * 1.1).toFixed(2) + ")";
      });
      // volume das peças: fica só o traço fino enquanto vira rachadura; volta ao nascer a logo
      var tk = 1;
      if (tc >= T.rise && tc < T.riseEnd) tk = 1 - 0.9 * ease3(k01(tc, T.rise, T.riseEnd));
      else if (tc >= T.riseEnd && tc < T.birth) tk = 0.1;
      else if (tc >= T.birth && tc < T.birthEnd) tk = 0.1 + 0.9 * ease3(k01(tc, T.birth, T.birthEnd));
      stage.style.setProperty("--tk", tk.toFixed(3));
      // celular: levanta do chão, fica de pé, acende inteiro e some quando a logo nasce
      var po = 0, ps = 0.5, py = 7;
      if (tc >= T.rise + 0.25 && tc < T.birth + 0.2) { v = ease3(k01(tc, T.rise + 0.25, T.riseEnd)); po = clamp(v * 1.8, 0, 1); ps = mix(0.5, 1, v); py = (1 - v) * 7; }
      if (tc >= T.birth + 0.2 && tc < T.birthEnd) { v = ease3(k01(tc, T.birth + 0.2, T.birthEnd - 0.2)); po = 1 - v; ps = mix(1, 0.78, v); py = 0; }
      if (tc >= T.birthEnd) { po = 0; ps = 0.78; py = 0; }
      phone.style.setProperty("--po", po.toFixed(3)); phone.style.setProperty("--ps", ps.toFixed(3)); phone.style.setProperty("--py", py.toFixed(2) + "%");
      // tela acesa (curada) e feixe de conserto
      var lo = tc >= T.heal + 0.5 ? ease3(k01(tc, T.heal + 0.5, T.healEnd)) : 0;
      phone.style.setProperty("--lo", lo.toFixed(3));
      var so = 0, sy = 0;
      if (tc >= T.heal && tc < T.heal + 0.8) { v = k01(tc, T.heal, T.heal + 0.75); so = Math.sin(Math.min(v, 1) * Math.PI); sy = v; }
      scan.style.setProperty("--so", so.toFixed(3)); scan.style.setProperty("--sy", (sy * (phone.offsetHeight || 1)).toFixed(1) + "px");
      // brilho suave no nascimento (sem clarão) e faíscas discretas
      var kbl = k01(tc, T.birth, T.birthEnd + 0.4);
      bloom.style.setProperty("--bo", (Math.sin(kbl * Math.PI) * 0.6).toFixed(3)); bloom.style.setProperty("--bs", (0.6 + 0.7 * kbl).toFixed(3));
      var sp = tc - (T.birthEnd - 0.5);
      sparks.forEach(function (el, n) {
        if (sp < 0 || sp > 1.0) { if (el.style.opacity !== "0") el.style.opacity = 0; return; }
        var a = n * 2.399963 + 0.5, dist = 12 + (n % 4) * 9, kx = outCubic(clamp(sp / 0.9, 0, 1));
        el.style.opacity = (1 - clamp(sp / 1.0, 0, 1)).toFixed(3);
        el.style.transform = "translate(" + (Math.cos(a) * dist * kx * 4 * sk).toFixed(1) + "px," + (Math.sin(a) * dist * kx * 4 * sk).toFixed(1) + "px) scale(" + mix(1.3, 0.3, kx).toFixed(2) + ")";
      });
    }

    // ---------- laço de animação (automático) ----------
    var t0 = performance.now() - (T.wind - OPEN_HOLD) * 1000, raf = 0, running = false;
    function frame(now) {
      var el = (now - t0) / 1000, n = Math.floor(el / CY);
      if (n !== cycleId) buildCycle(n);
      render(el - n * CY, el);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    buildCycle(0);
    window.__sabioSeek = function (tc, cyc) { stop(); buildCycle(cyc || 1); render(tc, tc); };
    // pausa fora da tela ou com a aba em segundo plano
    var visible = true;
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting; stage.classList.toggle("is-off", !visible);
        if (visible && !document.hidden) start(); else stop();
      }, { threshold: 0.05 }).observe(stage);
    } else start();
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else if (visible) start(); });
  })();
})();
