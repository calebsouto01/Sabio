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

  // Hero: logo 3D — cai e bate no chão, quebra como tela trincada, forma um celular e se conserta.
  // Roda sozinha (sem clique nem interação).
  (function () {
    var stage = document.getElementById("logoStage");
    if (!stage) return;
    var dataEl = document.getElementById("logoData");
    if (reduce || !dataEl) {
      Array.prototype.slice.call(document.querySelectorAll("animateTransform")).forEach(function (a) { a.remove(); });
      return;
    }
    var D = JSON.parse(dataEl.textContent);
    var OX = D.ox, OY = D.oy, VS = D.vs, U = 100 / VS, P = D.pieces, N = P.length;
    var els = Array.prototype.slice.call(stage.querySelectorAll(".pc"));
    var $ = function (id) { return document.getElementById(id); };
    var applePose = $("applePose"), phone = $("phone"), scan = $("scan"), shake = $("shake");
    var shock1 = $("shock1"), shock2 = $("shock2"), status = $("stageStatus");
    var sparks = Array.prototype.slice.call($("sparks").children), dust = Array.prototype.slice.call($("dust").children);

    // ---------- linha do tempo (segundos, ciclo de 15 s) ----------
    var CY = 15;
    var T = { wind: 4.3, drop: 5.0, imp: 5.36, frz: 5.46, bur: 6.45, dr: 7.6, asm: 9.5, hold: 10.9, rep: 11.15, repEnd: 12.45, res: 12.9 };

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function mix(a, b, k) { return a + (b - a) * k; }
    function k01(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
    function ease3(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
    function outCubic(k) { return 1 - Math.pow(1 - k, 3); }
    function outBack(k) { var c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
    function rng(seed) {
      return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    }
    function mixPose(a, b, k) {
      return { x: mix(a.x, b.x, k), y: mix(a.y, b.y, k), z: mix(a.z, b.z, k), rx: mix(a.rx, b.rx, k), ry: mix(a.ry, b.ry, k), rz: mix(a.rz, b.rz, k), s: mix(a.s, b.s, k), th: mix(a.th, b.th, k) };
    }
    var ID = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, th: 1 };

    // ---------- giro das trilhas (estado "logo") ----------
    function ramp(dt) { var r = 1.2; return dt < r ? dt * dt / (2 * r) : dt - r / 2; }
    function ringAngle(g, tc) {
      var dt = tc >= T.res ? tc - T.res : tc + CY - T.res;
      var a = ramp(dt);
      return g === "long" ? a * 7.8 : -a * 12;
    }
    function ringPose(i, tc) {
      var p = P[i], th = ringAngle(p.g, tc), r = th * Math.PI / 180, dx = p.cx - OX, dy = p.cy - OY;
      return { x: dx * Math.cos(r) - dy * Math.sin(r) - dx, y: dx * Math.sin(r) + dy * Math.cos(r) - dy, z: 0, rx: 0, ry: 0, rz: th, s: 1, th: 1 };
    }

    // ---------- estados por ciclo: dispersão e celular ----------
    var SCR = { w: 124, h: 260 }, IMPACT = { x: OX + 12, y: OY + 36 };
    var S = [], PH = [], cycleId = -1;
    function buildCycle(n) {
      cycleId = n;
      var r = rng(n * 7919 + 13);
      S = P.map(function (p) {
        var a = r() * Math.PI * 2, rad = 62 + r() * 58;
        return { x: Math.cos(a) * rad + (OX - p.cx), y: Math.sin(a) * rad + (OY - p.cy), z: -60 + r() * 150,
                 rx: (r() - 0.5) * 150, ry: (r() - 0.5) * 150, rz: (r() - 0.5) * 360, s: 0.75 + r() * 0.45, th: 1, ph: r() * 6.28, amp: 5 + r() * 8 };
      });
      // rachaduras a partir do ponto de impacto: peças mais longas pegam as direções mais longas
      var dirs = [], k;
      for (k = 0; k < N; k++) {
        var a2 = ((k * 360 / N) + 12 + (r() - 0.5) * 16) * Math.PI / 180, ca = Math.cos(a2), sa = Math.sin(a2), t = 1e9;
        if (ca > 0) t = Math.min(t, (OX + SCR.w / 2 - IMPACT.x) / ca); else if (ca < 0) t = Math.min(t, (OX - SCR.w / 2 - IMPACT.x) / ca);
        if (sa > 0) t = Math.min(t, (OY + SCR.h / 2 - IMPACT.y) / sa); else if (sa < 0) t = Math.min(t, (OY - SCR.h / 2 - IMPACT.y) / sa);
        dirs.push({ a: a2, t: t });
      }
      var byLen = P.map(function (p, i) { return i; }).sort(function (a, b) { return P[b].len - P[a].len; });
      dirs.sort(function (a, b) { return b.t - a.t; });
      PH = new Array(N);
      byLen.forEach(function (i, rank) {
        var p = P[i], d = dirs[rank], gap = 7 + (rank % 3) * 5, cd = Math.abs(Math.cos(d.a)), sd = Math.abs(Math.sin(d.a));
        var s = clamp(Math.min((d.t - gap) * 0.9, p.len) / p.len, 0.3, 1);
        // a peça inteira (comprimento + dobras já afinadas) precisa caber dentro da tela
        s = Math.min(s, (SCR.w / 2 - 4) / (cd * p.len / 2 + sd * p.rad * 0.35 + 0.001), (SCR.h / 2 - 4) / (sd * p.len / 2 + cd * p.rad * 0.35 + 0.001));
        var half = s * p.len / 2, w2 = s * p.rad * 0.35;
        var hx = cd * half + sd * w2, hy = sd * half + cd * w2;
        var mx = IMPACT.x + Math.cos(d.a) * (gap + half), my = IMPACT.y + Math.sin(d.a) * (gap + half);
        mx = clamp(mx, OX - SCR.w / 2 + hx + 2, OX + SCR.w / 2 - hx - 2); my = clamp(my, OY - SCR.h / 2 + hy + 2, OY + SCR.h / 2 - hy - 2);
        var rz = d.a * 180 / Math.PI - p.ang;
        rz += 360 * Math.round((S[i].rz - rz) / 360);
        PH[i] = { x: mx - p.cx, y: my - p.cy, z: 6, rx: 0, ry: 0, rz: rz, s: s, th: 0.42 };   // linhas finas e suaves
      });
    }
    function scatterAt(i, tc) {
      var b = S[i];
      return { x: b.x + Math.sin(tc * 1.3 + b.ph) * b.amp, y: b.y + Math.cos(tc * 1.1 + b.ph * 1.7) * b.amp, z: b.z + Math.sin(tc * 0.9 + b.ph) * 14,
               rx: b.rx + Math.sin(tc * 0.7 + b.ph) * 16, ry: b.ry + Math.cos(tc * 0.6 + b.ph) * 16, rz: b.rz + Math.sin(tc * 0.5 + b.ph * 2) * 20, s: b.s, th: 1 };
    }
    function pieceAt(i, tc) {
      var d = i * 0.03;
      if (tc < T.wind) return ringPose(i, tc);
      if (tc < T.imp) {                        // sobe, hesita e cai: a logo inteira se move (ver wrapper); aqui só um leve tremor
        var q = ringPose(i, tc), a = k01(tc, T.wind, T.drop) * 1.4;
        q.x += Math.sin(tc * 97 + i * 7) * a; q.y += Math.cos(tc * 83 + i * 5) * a; return q;
      }
      if (tc < T.frz) return ringPose(i, T.imp);   // instante do impacto
      if (tc < T.dr - 1.15) {                  // estilhaça a partir do chão
        return mixPose(ringPose(i, T.imp), scatterAt(i, tc), outCubic(k01(tc, T.frz + d * 0.6, T.bur)));
      }
      if (tc < T.dr) return scatterAt(i, tc);
      if (tc < T.asm + 0.05) {                 // reúne no formato de celular (suave)
        return mixPose(scatterAt(i, tc), PH[i], ease3(k01(tc, T.dr + d, T.asm)));
      }
      if (tc < T.hold) {                       // celular trincado
        var h = PH[i], br = Math.sin(tc * 2.4 + i) * 0.4; return { x: h.x, y: h.y, z: h.z + br, rx: 0, ry: 0, rz: h.rz, s: h.s, th: h.th };
      }
      var st = PH[i], start = { x: st.x, y: st.y, z: 40, rx: 0, ry: 0, rz: st.rz - 360 * Math.round(st.rz / 360), s: st.s, th: st.th };
      if (tc < T.rep + 0.25 + d) {             // solta do vidro
        var lift = ease3(k01(tc, T.hold, T.rep + 0.25));
        return { x: st.x, y: st.y, z: mix(st.z, 40, lift), rx: 0, ry: 0, rz: start.rz, s: st.s, th: st.th };
      }
      if (tc < T.repEnd + 0.4) return mixPose(start, ID, outBack(k01(tc, T.rep + 0.25 + d, T.repEnd)));   // encaixa de volta na logo
      return tc < T.res ? ID : ringPose(i, tc);
    }

    // ---------- queda e impacto no chão (a logo inteira) ----------
    var RH = 44;   // altura da subida, px (ajustada ao tamanho da cena)
    function wrapperAt(tc) {
      var w = { y: 0, rot: 0, sx: 1, sy: 1, jx: 0, jy: 0 };
      if (tc < T.wind) return w;
      if (tc < T.drop) {                       // sobe devagar (como se fosse lançada) e hesita no topo
        w.y = -RH * outCubic(k01(tc, T.wind, T.drop - 0.12));
        w.jx = Math.sin(tc * 60) * 0.8; return w;
      }
      if (tc < T.imp) {                        // cai acelerando, girando um pouco
        var k = k01(tc, T.drop, T.imp);
        w.y = -RH * (1 - k * k); w.rot = -5 * k; w.sy = 1 + 0.05 * k; w.sx = 1 - 0.03 * k; return w;
      }
      var t = tc - T.imp;
      if (t < 0.1) { w.y = 3; w.sy = 0.84; w.sx = 1.1; w.rot = -1; return w; }        // achata no impacto
      t -= 0.1;
      if (t < 1.1) {                           // quica e se recompõe (amortecido)
        var dcy = Math.exp(-t * 6.5);
        w.y = -RH * 0.45 * Math.abs(Math.sin(t * 9.5)) * dcy;
        var sq = Math.cos(t * 26) * Math.exp(-t * 9);
        w.sy = 1 - 0.16 * sq; w.sx = 1 + 0.1 * sq; w.rot = -1 * Math.exp(-t * 8);
        w.jx = Math.sin(t * 110) * 5 * Math.exp(-t * 10); w.jy = Math.cos(t * 95) * 4 * Math.exp(-t * 10);
      }
      // conserto: pequeno "estalo" ao encaixar
      var t2 = tc - (T.repEnd - 0.1);
      if (t2 >= 0 && t2 < 0.5) { var e = Math.exp(-t2 * 9) * Math.sin(t2 * 30); w.sy *= 1 - 0.05 * e; w.sx *= 1 + 0.03 * e; }
      return w;
    }

    // ---------- estados dos demais elementos ----------
    var lastStatus = "";
    function setStatus(txt, bad) {
      var key = txt + (bad ? "!" : "");
      if (key === lastStatus) return; lastStatus = key;
      status.textContent = txt; status.classList.toggle("on", !!txt); status.classList.toggle("bad", !!bad);
    }
    function render(tc) {
      var i, v, sw = stage.clientWidth || 464, sk = sw / 464;
      RH = Math.max(18, (stage.clientHeight || 500) * 0.13);
      // peças
      for (i = 0; i < N; i++) {
        var p = pieceAt(i, tc), ang = P[i].ang.toFixed(1), nang = (-P[i].ang).toFixed(1);
        els[i].style.transform = "translate3d(" + (p.x * U).toFixed(3) + "%," + (p.y * U).toFixed(3) + "%," + p.z.toFixed(2) + "px) rotateX(" + p.rx.toFixed(2) + "deg) rotateY(" + p.ry.toFixed(2) + "deg) rotateZ(" + p.rz.toFixed(2) + "deg) scale(" + p.s.toFixed(3) + ") rotateZ(" + ang + "deg) scale(1," + p.th.toFixed(3) + ") rotateZ(" + nang + "deg)";
      }
      // logo inteira: queda, achatamento, quique e tremor
      var w = wrapperAt(tc);
      shake.style.transform = "translate3d(" + w.jx.toFixed(2) + "px," + (w.y + w.jy).toFixed(2) + "px,0) rotate(" + w.rot.toFixed(2) + "deg) scale(" + (0.9 * w.sx).toFixed(4) + "," + (0.9 * w.sy).toFixed(4) + ")";
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
        var kd = outCubic(life / 1.0), side = n % 2 ? 1 : -1, dist = (20 + (n >> 1) * 11) * sk;
        el.style.opacity = (0.4 * (1 - life / 1.0)).toFixed(3);
        el.style.transform = "translate(" + (side * dist * kd * 3).toFixed(1) + "px," + (-(6 + (n % 4) * 5) * sk * kd).toFixed(1) + "px) scale(" + (0.7 + kd * 1.1).toFixed(2) + ")";
      });
      // maçã: núcleo que vira "fantasma" atrás do vidro e acende no conserto
      var ao = 1, as = 1, jx = 0, jy = 0;
      if (tc >= T.wind && tc < T.frz) { var am = tc < T.drop ? 0.6 : 0.4; jx = Math.sin(tc * 110) * am; jy = Math.cos(tc * 95) * am; }
      if (tc >= T.frz && tc < T.rep) { var kq = ease3(k01(tc, T.frz + 0.1, 6.6)); ao = mix(1, 0.4, kq); as = mix(1, 0.9, kq); if (tc > T.asm) ao += Math.sin(tc * 3.4) * 0.08; }
      if (tc >= T.rep && tc < T.repEnd + 0.3) { var kr = k01(tc, T.rep, T.repEnd + 0.1); ao = mix(0.4, 1, ease3(kr)); as = mix(0.9, 1, outBack(kr)); }
      applePose.style.transform = "translate(" + jx.toFixed(2) + "px," + jy.toFixed(2) + "px) scale(" + as.toFixed(3) + ")";
      applePose.style.opacity = ao.toFixed(3);
      // volume das peças: achata (fica só o traço fino) enquanto vira celular
      var tk = 1;
      if (tc >= T.dr && tc < T.hold) tk = 1 - 0.9 * ease3(k01(tc, T.dr, T.asm));
      else if (tc >= T.hold && tc < T.rep + 0.8) tk = 0.1 + 0.9 * ease3(k01(tc, T.hold + 0.3, T.rep + 0.8));
      stage.style.setProperty("--tk", tk.toFixed(3));
      // celular
      var po = 0, ps = 0.86;
      if (tc >= 7.35 && tc < T.rep) { v = ease3(k01(tc, 7.35, 8.8)); po = v; ps = mix(0.86, 1, v); }
      if (tc >= T.rep && tc < T.repEnd + 0.3) { v = ease3(k01(tc, T.rep + 0.05, T.repEnd)); po = 1 - v; ps = mix(1, 0.55, v); }
      phone.style.setProperty("--po", po.toFixed(3)); phone.style.setProperty("--ps", ps.toFixed(3));
      // feixe de conserto
      var so = 0, sy = 0;
      if (tc >= T.hold && tc < T.hold + 0.8) { v = k01(tc, T.hold, T.hold + 0.8); so = Math.sin(v * Math.PI); sy = v; }
      scan.style.setProperty("--so", so.toFixed(3)); scan.style.setProperty("--sy", (sy * (phone.offsetHeight || 1)).toFixed(1) + "px");
      // faíscas no conserto
      var sp = tc - (T.repEnd - 0.25);
      sparks.forEach(function (el, n) {
        if (sp < 0 || sp > 1.0) { if (el.style.opacity !== "0") el.style.opacity = 0; return; }
        var a = n * 2.399963 + 0.5, dist = 12 + (n % 4) * 9, kx = outCubic(clamp(sp / 0.9, 0, 1));
        el.style.opacity = (1 - clamp(sp / 1.0, 0, 1)).toFixed(3);
        el.style.transform = "translate(" + (Math.cos(a) * dist * kx * 4 * sk).toFixed(1) + "px," + (Math.sin(a) * dist * kx * 4 * sk).toFixed(1) + "px) scale(" + mix(1.3, 0.3, kx).toFixed(2) + ")";
      });
      // legenda
      if (tc >= 6.2 && tc < T.hold + 0.6) setStatus("Tela quebrada", true);
      else if (tc >= T.repEnd - 0.1 && tc < 14.6) setStatus("Consertado ✓", false);
      else setStatus("", false);
    }

    // ---------- laço de animação (automático) ----------
    var t0 = performance.now(), raf = 0, running = false;
    function frame(now) {
      var el = (now - t0) / 1000, n = Math.floor(el / CY);
      if (n !== cycleId) buildCycle(n);
      render(el - n * CY);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    buildCycle(0);
    window.__sabioSeek = function (tc, cyc) { stop(); buildCycle(cyc || 1); render(tc); };
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
