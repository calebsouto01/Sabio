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

  // Hero: logo 3D — quebra como uma tela trincada, forma um celular e se conserta na logo
  (function () {
    var stage = document.getElementById("logoStage"), tilt = document.getElementById("tilt");
    if (!stage || !tilt) return;
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
    var flash = $("flash"), cracks = $("cracks"), status = $("stageStatus");
    var sparks = Array.prototype.slice.call($("sparks").children);

    // ---------- linha do tempo (segundos, ciclo de 15 s) ----------
    var CY = 15;
    var T = { tre: 5.05, imp: 5.4, frz: 5.52, bur: 6.5, dr: 7.7, asm: 9.4, hold: 10.9, rep: 11.15, repEnd: 12.45, res: 12.9 };

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
      return { x: mix(a.x, b.x, k), y: mix(a.y, b.y, k), z: mix(a.z, b.z, k), rx: mix(a.rx, b.rx, k), ry: mix(a.ry, b.ry, k), rz: mix(a.rz, b.rz, k), s: mix(a.s, b.s, k) };
    }
    var ID = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };

    // ---------- giro das trilhas (estado "logo") ----------
    function ramp(dt) { var r = 1.2; return dt < r ? dt * dt / (2 * r) : dt - r / 2; }
    function ringAngle(g, tc) {
      var dt = tc >= T.res ? tc - T.res : tc + CY - T.res;
      var a = ramp(dt);
      return g === "long" ? a * 7.8 : -a * 12;
    }
    function ringPose(i, tc) {
      var p = P[i], th = ringAngle(p.g, tc), r = th * Math.PI / 180, dx = p.cx - OX, dy = p.cy - OY;
      return { x: dx * Math.cos(r) - dy * Math.sin(r) - dx, y: dx * Math.sin(r) + dy * Math.cos(r) - dy, z: 0, rx: 0, ry: 0, rz: th, s: 1 };
    }

    // ---------- estados por ciclo: dispersão e celular ----------
    var SCR = { w: 124, h: 260 }, IMPACT = { x: OX + 14, y: OY + 40 };
    var S = [], PH = [], cycleId = -1;
    function buildCycle(n) {
      cycleId = n;
      var r = rng(n * 7919 + 13);
      S = P.map(function (p) {
        var a = r() * Math.PI * 2, rad = 62 + r() * 58;
        return { x: Math.cos(a) * rad + (OX - p.cx), y: Math.sin(a) * rad + (OY - p.cy), z: -60 + r() * 150,
                 rx: (r() - 0.5) * 150, ry: (r() - 0.5) * 150, rz: (r() - 0.5) * 360, s: 0.75 + r() * 0.45, ph: r() * 6.28, amp: 5 + r() * 8 };
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
        var p = P[i], d = dirs[rank], s = clamp(Math.min(d.t * 0.9, p.len) / p.len, 0.28, 1);
        var gap = 5 + (rank % 3) * 5, half = s * p.len / 2;
        var mx = IMPACT.x + Math.cos(d.a) * (gap + half), my = IMPACT.y + Math.sin(d.a) * (gap + half);
        var rz = d.a * 180 / Math.PI - p.ang;
        rz += 360 * Math.round((S[i].rz - rz) / 360);
        PH[i] = { x: mx - p.cx, y: my - p.cy, z: 8, rx: 0, ry: 0, rz: rz, s: s };
      });
    }
    function scatterAt(i, tc) {
      var b = S[i];
      return { x: b.x + Math.sin(tc * 1.3 + b.ph) * b.amp, y: b.y + Math.cos(tc * 1.1 + b.ph * 1.7) * b.amp, z: b.z + Math.sin(tc * 0.9 + b.ph) * 14,
               rx: b.rx + Math.sin(tc * 0.7 + b.ph) * 16, ry: b.ry + Math.cos(tc * 0.6 + b.ph) * 16, rz: b.rz + Math.sin(tc * 0.5 + b.ph * 2) * 20, s: b.s };
    }
    function pieceAt(i, tc) {
      var d = i * 0.03;
      if (tc < T.tre) return ringPose(i, tc);
      if (tc >= T.repEnd + 0.4) return tc < T.res ? ID : ringPose(i, tc);
      if (tc < T.imp) {                       // anticipação: tremor crescente
        var a = ((tc - T.tre) / (T.imp - T.tre)) * 1.8, q = ringPose(i, tc);
        q.x += Math.sin(tc * 97 + i * 7) * a; q.y += Math.cos(tc * 83 + i * 5) * a; return q;
      }
      if (tc < T.frz) {                       // pausa do impacto
        var f = ringPose(i, T.imp);
        f.x += Math.sin(tc * 140 + i) * 1.2; f.y += Math.cos(tc * 120 + i) * 1.2; return f;
      }
      if (tc < T.dr - 1.2) {                  // estilhaça
        return mixPose(ringPose(i, T.imp), scatterAt(i, tc), outCubic(k01(tc, T.frz + d * 0.6, T.bur)));
      }
      if (tc < T.dr) return scatterAt(i, tc);
      if (tc < T.asm + 0.05) {                // reúne no formato de celular
        return mixPose(scatterAt(i, tc), PH[i], ease3(k01(tc, T.dr + d, T.asm)));
      }
      if (tc < T.hold) {                      // celular trincado
        var h = PH[i], br = Math.sin(tc * 3 + i) * 0.5; return { x: h.x, y: h.y, z: h.z + br, rx: 0, ry: 0, rz: h.rz, s: h.s };
      }
      var st = PH[i], start = { x: st.x, y: st.y, z: 40, rx: 0, ry: 0, rz: st.rz - 360 * Math.round(st.rz / 360), s: st.s };
      if (tc < T.rep + 0.25 + d) {            // solta do vidro
        var lift = ease3(k01(tc, T.hold, T.rep + 0.25));
        return { x: st.x, y: st.y, z: mix(st.z, 40, lift), rx: 0, ry: 0, rz: start.rz, s: st.s };
      }
      return mixPose(start, ID, outBack(k01(tc, T.rep + 0.25 + d, T.repEnd)));   // encaixa de volta na logo
    }

    // ---------- estados dos demais elementos ----------
    var lastStatus = "";
    function setStatus(txt, bad) {
      var key = txt + (bad ? "!" : "");
      if (key === lastStatus) return; lastStatus = key;
      status.textContent = txt; status.classList.toggle("on", !!txt); status.classList.toggle("bad", !!bad);
    }
    function render(tc) {
      var i, tt, v;
      for (i = 0; i < N; i++) {
        var p = pieceAt(i, tc);
        els[i].style.transform = "translate3d(" + (p.x * U).toFixed(3) + "%," + (p.y * U).toFixed(3) + "%," + p.z.toFixed(2) + "px) rotateX(" + p.rx.toFixed(2) + "deg) rotateY(" + p.ry.toFixed(2) + "deg) rotateZ(" + p.rz.toFixed(2) + "deg) scale(" + p.s.toFixed(3) + ")";
      }
      // maçã: núcleo que vira "fantasma" atrás do vidro e acende no conserto
      var ao = 1, as = 1, jx = 0, jy = 0;
      if (tc >= T.tre && tc < T.frz) { var am = tc < T.imp ? 1.2 : 3; jx = Math.sin(tc * 110) * am; jy = Math.cos(tc * 95) * am; }
      if (tc >= T.frz && tc < T.rep) { var kk = ease3(k01(tc, T.frz + 0.1, 6.6)); ao = mix(1, 0.4, kk); as = mix(1, 0.9, kk); if (tc > T.asm) ao += Math.sin(tc * 4) * 0.1; }
      if (tc >= T.rep && tc < T.repEnd + 0.3) { var kr = k01(tc, T.rep, T.repEnd + 0.1); ao = mix(0.4, 1, ease3(kr)); as = mix(0.9, 1, outBack(kr)); }
      applePose.style.transform = "translate(" + jx.toFixed(2) + "px," + jy.toFixed(2) + "px) scale(" + as.toFixed(3) + ")";
      applePose.style.opacity = ao.toFixed(3);
      // celular
      var po = 0, ps = 0.86;
      if (tc >= 7.35 && tc < T.rep) { v = ease3(k01(tc, 7.35, 8.7)); po = v; ps = mix(0.86, 1, v); }
      if (tc >= T.rep && tc < T.repEnd + 0.3) { v = ease3(k01(tc, T.rep + 0.05, T.repEnd)); po = 1 - v; ps = mix(1, 0.55, v); }
      phone.style.setProperty("--po", po.toFixed(3)); phone.style.setProperty("--ps", ps.toFixed(3));
      // feixe de conserto
      var so = 0, sy = 0;
      if (tc >= T.hold && tc < T.hold + 0.7) { v = k01(tc, T.hold, T.hold + 0.7); so = Math.sin(v * Math.PI); sy = v * 100; }
      scan.style.setProperty("--so", so.toFixed(3)); scan.style.setProperty("--sy", (sy * (phone.offsetHeight || 1) / 100).toFixed(1) + "px");
      // impacto: flash, rachaduras e tremor
      tt = tc - T.imp; var fo = 0, co = 0, cd = 1, sx = 0, sh = 0;
      if (tt >= 0 && tt < 0.6) { fo = tt < 0.06 ? tt / 0.06 : Math.exp(-(tt - 0.06) * 9); }
      if (tt >= 0 && tt < 1.05) { cd = 1 - clamp(tt / 0.2, 0, 1); co = tt < 0.5 ? 1 : 1 - (tt - 0.5) / 0.55; }
      if (tt >= 0 && tt < 0.5) { var am2 = 9 * (1 - tt / 0.5); sx = Math.sin(tt * 130) * am2; sh = Math.cos(tt * 110) * am2; }
      var t2 = tc - (T.repEnd - 0.2);
      if (t2 >= 0 && t2 < 0.5) fo = Math.max(fo, 0.45 * Math.exp(-t2 * 7));
      flash.style.setProperty("--fo", fo.toFixed(3)); cracks.style.setProperty("--co", co.toFixed(3)); cracks.style.setProperty("--cd", cd.toFixed(3));
      shake.style.transform = "translate3d(" + sx.toFixed(2) + "px," + sh.toFixed(2) + "px,0)";
      // faíscas no conserto
      var sp = tc - (T.repEnd - 0.25);
      sparks.forEach(function (el, n) {
        if (sp < 0 || sp > 1.0) { if (el.style.opacity !== "0") el.style.opacity = 0; return; }
        var a = n * 2.399963 + 0.5, dist = 12 + (n % 4) * 9, kx = outCubic(clamp(sp / 0.9, 0, 1));
        el.style.opacity = (1 - clamp(sp / 1.0, 0, 1)).toFixed(3);
        el.style.transform = "translate(" + (Math.cos(a) * dist * kx * 4).toFixed(1) + "px," + (Math.sin(a) * dist * kx * 4).toFixed(1) + "px) scale(" + mix(1.3, 0.3, kx).toFixed(2) + ")";
      });
      // legenda
      if (tc >= 6.2 && tc < T.hold + 0.6) setStatus("Tela quebrada", true);
      else if (tc >= T.repEnd - 0.1 && tc < 14.6) setStatus("Consertado ✓", false);
      else setStatus("", false);
    }

    // ---------- laço de animação ----------
    var t0 = performance.now(), off = 0, raf = 0, running = false;
    function frame(now) {
      var el = (now - t0) / 1000 + off, n = Math.floor(el / CY);
      if (n !== cycleId) buildCycle(n);
      render(el - n * CY);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    buildCycle(0);
    // toque/clique: dispara a quebra
    stage.addEventListener("click", function () {
      var now = performance.now(), el = (now - t0) / 1000 + off, tc = el - Math.floor(el / CY) * CY;
      if (tc < T.tre - 0.5 || tc >= T.res) off += (T.tre - 0.35) - tc + (tc >= T.res ? CY : 0);
    });
    window.__sabioSeek = function (tc) { stop(); buildCycle(1); render(tc); };
    // inclina com o mouse; pausa fora da tela
    var hero = stage.closest(".hero") || stage;
    if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.setProperty("--ry", (x * 34).toFixed(1) + "deg");
        tilt.style.setProperty("--rx", (-y * 24).toFixed(1) + "deg");
      });
      hero.addEventListener("pointerleave", function () {
        tilt.style.setProperty("--ry", "0deg"); tilt.style.setProperty("--rx", "0deg");
      });
    }
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
