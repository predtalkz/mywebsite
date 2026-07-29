(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Header + nav */
  var header = document.getElementById("header");
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");

  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 20);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  var sectionIds = ["hero", "why", "features", "showcase", "how", "download"];
  var sections = sectionIds.map(function (id) { return document.getElementById(id); }).filter(Boolean);

  function setActiveNav() {
    if (!nav || !sections.length) return;
    var y = window.scrollY + 140;
    var current = sections[0].id;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= y) current = sections[i].id;
    }
    nav.querySelectorAll("a").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      a.classList.toggle("is-active", href === "#" + current);
    });
  }
  window.addEventListener("scroll", setActiveNav, { passive: true });
  setActiveNav();

  /* Soft particles — start after first paint (idle) */
  function initParticles() {
    var canvas = document.getElementById("particles");
    if (!canvas || reduceMotion || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    var particles = [];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var running = false;

    function resize() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
      particles = [];
      var count = Math.min(22, Math.floor(window.innerWidth / 55));
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: Math.random() * 1.5 + 0.4,
          a: Math.random() * 0.3 + 0.08,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22
        });
      }
    }

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = window.innerWidth;
        if (p.x > window.innerWidth) p.x = 0;
        if (p.y < 0) p.y = window.innerHeight;
        if (p.y > window.innerHeight) p.y = 0;
        ctx.beginPath();
        ctx.fillStyle = "rgba(237,190,60," + p.a + ")";
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }

    resize();
    spawn();
    running = true;
    tick();
    window.addEventListener("resize", function () {
      resize();
      spawn();
    }, { passive: true });
  }

  function whenIdle(fn, timeout) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(fn, { timeout: timeout || 1800 });
    } else {
      setTimeout(fn, timeout || 900);
    }
  }

  /* Magnetic buttons */
  if (!reduceMotion) {
    document.querySelectorAll(".magnetic").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = "translate(" + x * 0.15 + "px," + y * 0.2 + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  }

  /* Showcase — 3D coverflow, smooth hand drag */
  function initShowcase() {
    var deck = document.getElementById("showcaseDeck");
    var titleEl = document.getElementById("showcaseTitle");
    var subEl = document.getElementById("showcaseSub");
    var dotsEl = document.getElementById("showcaseDots");
    if (!deck) return;

    var cards = Array.prototype.slice.call(deck.querySelectorAll(".showcase-card"));
    if (!cards.length) return;

    // avoid duplicate dots if init runs twice
    if (dotsEl) dotsEl.innerHTML = "";

    var n = cards.length;
    var pos = 0;
    var target = 0;
    var dragging = false;
    var axisLock = null; // null | "x" | "y"
    var pointerId = null;
    var startX = 0;
    var startY = 0;
    var startPos = 0;
    var lastX = 0;
    var lastT = 0;
    var velocity = 0;
    var raf = 0;
    var activeIndex = -1;

    cards.forEach(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Go to slide " + (i + 1));
      b.addEventListener("click", function () {
        target = i;
        velocity = 0;
        kick();
      });
      if (dotsEl) dotsEl.appendChild(b);
    });
    var dots = dotsEl ? Array.prototype.slice.call(dotsEl.querySelectorAll("button")) : [];

    function clampPos(v) {
      return Math.max(0, Math.min(n - 1, v));
    }

    function render(p) {
      var active = Math.round(clampPos(p));
      var mobile = window.innerWidth < 560;

      cards.forEach(function (card, i) {
        var offset = i - p;
        var abs = Math.abs(offset);
        var side = offset === 0 ? 0 : (offset < 0 ? -1 : 1);
        var spaced = Math.min(abs, 3.2);

        // side cards: soft blur behind | front card: razor sharp
        var x = side * spaced * (mobile ? 92 : 128);
        var z = 150 - spaced * 88;
        var rot = side * spaced * (mobile ? 12 : 15);
        var scale = spaced === 0 ? 1 : 1 - spaced * 0.065;
        var blur = spaced === 0 ? 0 : Math.min(2.2, spaced * 0.9);
        var opacity = spaced === 0 ? 1 : Math.max(0.28, 0.9 - spaced * 0.18);
        var zIndex = Math.round(40 - abs * 8);

        if (abs > 3.2) {
          opacity = 0;
          blur = 0;
          zIndex = 0;
        }

        // front card: avoid subpixel 3D mush — lock to clean transform
        if (spaced < 0.02) {
          card.style.transform = "translate(-50%, -50%) translateZ(160px) scale(1)";
          card.style.filter = "none";
          card.style.opacity = "1";
          card.style.zIndex = "50";
          card.classList.add("is-front");
          card.style.pointerEvents = "none";
          return;
        }

        card.style.transform =
          "translate(-50%, -50%) translate3d(" + x.toFixed(1) + "px,0," + z.toFixed(1) + "px) rotateY(" + (-rot).toFixed(2) + "deg) scale(" + scale.toFixed(3) + ")";
        card.style.filter = "blur(" + blur.toFixed(2) + "px)";
        card.style.opacity = String(opacity.toFixed(3));
        card.style.zIndex = String(zIndex);
        card.classList.toggle("is-front", i === active);
        card.style.pointerEvents = "none";
      });

      // whole deck handles drag — cards never steal pointer
      if (active !== activeIndex) {
        activeIndex = active;
        var front = cards[active];
        if (front) {
          if (titleEl) titleEl.textContent = front.getAttribute("data-title") || "";
          if (subEl) subEl.innerHTML = front.getAttribute("data-sub") || "";
        }
        dots.forEach(function (d, i) {
          d.classList.toggle("is-on", i === active);
        });
      }
    }

    function tick() {
      raf = 0;

      if (!dragging) {
        pos += (target - pos) * 0.22;
        if (Math.abs(target - pos) < 0.002) {
          pos = target;
          render(pos);
          return;
        }
      } else {
        pos = target;
      }

      render(pos);
      raf = requestAnimationFrame(tick);
    }

    function kick() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function goToIndex(i) {
      target = clampPos(i);
      velocity = 0;
      kick();
    }

    function onPointerDown(e) {
      if (e.button != null && e.button !== 0) return;
      dragging = true;
      axisLock = null;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startPos = Math.round(pos);
      pos = startPos;
      target = startPos;
      lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
    }

    function onPointerMove(e) {
      if (!dragging || (pointerId != null && e.pointerId !== pointerId)) return;

      var dx = e.clientX - startX;
      var dy = e.clientY - startY;

      // decide axis once — vertical page scroll must not move cards
      if (!axisLock) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          axisLock = "y";
          dragging = false;
          pointerId = null;
          deck.classList.remove("is-dragging");
          goToIndex(startPos);
          return;
        }
        axisLock = "x";
        deck.classList.add("is-dragging");
        try { deck.setPointerCapture(e.pointerId); } catch (err) {}
        kick();
      }

      if (axisLock !== "x") return;

      var step = Math.max(140, deck.clientWidth * 0.28);
      var progress = Math.max(-1, Math.min(1, -dx / step));
      target = clampPos(startPos + progress);

      var now = performance.now();
      var dt = Math.max(8, now - lastT);
      velocity = (lastX - e.clientX) / dt;
      lastX = e.clientX;
      lastT = now;
      kick();
    }

    function onPointerUp(e) {
      if (pointerId != null && e.pointerId !== pointerId) return;
      var wasHorizontal = axisLock === "x";
      dragging = false;
      pointerId = null;
      deck.classList.remove("is-dragging");

      if (!wasHorizontal) {
        axisLock = null;
        return;
      }
      axisLock = null;

      var dx = (e.clientX != null ? e.clientX : lastX) - startX;
      var step = Math.max(140, deck.clientWidth * 0.28);
      var progress = -dx / step;
      var flick = velocity > 0.35 ? 1 : (velocity < -0.35 ? -1 : 0);

      if (flick === 1 || progress > 0.28) {
        goToIndex(startPos + 1);
      } else if (flick === -1 || progress < -0.28) {
        goToIndex(startPos - 1);
      } else {
        goToIndex(startPos);
      }
    }

    deck.addEventListener("pointerdown", onPointerDown);
    deck.addEventListener("pointermove", onPointerMove);
    deck.addEventListener("pointerup", onPointerUp);
    deck.addEventListener("pointercancel", onPointerUp);
    deck.addEventListener("lostpointercapture", onPointerUp);

    var wheelLock = false;
    deck.addEventListener("wheel", function (e) {
      // only horizontal trackpad/mouse wheel — ignore vertical page scroll
      if (Math.abs(e.deltaX) < 6 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (wheelLock || dragging) return;
      wheelLock = true;
      goToIndex(Math.round(pos) + (e.deltaX > 0 ? 1 : -1));
      setTimeout(function () { wheelLock = false; }, 420);
    }, { passive: false });

    deck.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToIndex(Math.round(pos) + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToIndex(Math.round(pos) - 1);
      }
    });

    window.addEventListener("resize", function () {
      render(pos);
    }, { passive: true });

    render(0);
  }

  /* GSAP — lazy load after first paint (does not block initial load) */
  function revealFallback() {
    document.querySelectorAll(".hero-in, .reveal, .feature-card").forEach(function (el) {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
  }

  function initGsapAnimations() {
    if (typeof gsap === "undefined") {
      revealFallback();
      return;
    }

    if (reduceMotion) {
      gsap.set(".hero-in, .reveal, .feature-card", { opacity: 1, y: 0, clearProps: "transform" });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    gsap.to(".hero-in", {
      opacity: 1,
      y: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: "power3.out",
      delay: 0.05
    });

    gsap.utils.toArray(".reveal").forEach(function (el) {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none none"
        }
      });
    });

    gsap.utils.toArray(".feature-card").forEach(function (card, i) {
      gsap.fromTo(
        card,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay: (i % 3) * 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 90%",
            toggleActions: "play none none none"
          }
        }
      );
    });

    var phone = document.querySelector(".hero-phone");
    if (phone) {
      gsap.to(phone, {
        y: -18,
        ease: "none",
        scrollTrigger: {
          trigger: "#hero",
          start: "top top",
          end: "bottom top",
          scrub: true
        }
      });
    }
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadGsapLazy() {
    if (reduceMotion) {
      revealFallback();
      return;
    }
    var base = "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/";
    loadScript(base + "gsap.min.js")
      .then(function () { return loadScript(base + "ScrollTrigger.min.js"); })
      .then(function () { initGsapAnimations(); })
      .catch(function () { revealFallback(); });
  }

  function boot() {
    initShowcase();

    // quick hero visibility if GSAP arrives late
    setTimeout(function () {
      if (typeof gsap === "undefined") {
        document.querySelectorAll(".hero-in").forEach(function (el) {
          el.style.opacity = "1";
          el.style.transform = "none";
        });
      }
    }, 700);

    // safety: never leave content hidden if CDN fails / slow
    setTimeout(function () {
      if (typeof gsap === "undefined") revealFallback();
    }, 2200);

    whenIdle(function () {
      loadGsapLazy();
      initParticles();
    }, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("load", function () {
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  });
})();
