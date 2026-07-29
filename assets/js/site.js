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

  /* Soft particles */
  var canvas = document.getElementById("particles");
  if (canvas && !reduceMotion && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var particles = [];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
      particles = [];
      var count = Math.min(36, Math.floor(window.innerWidth / 40));
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: Math.random() * 1.6 + 0.4,
          a: Math.random() * 0.35 + 0.1,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25
        });
      }
    }

    function tick() {
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
    tick();
    window.addEventListener("resize", function () {
      resize();
      spawn();
    }, { passive: true });
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

  /* Showcase cinematic carousel */
  function initShowcase() {
    var stage = document.getElementById("showcaseStage");
    var track = document.getElementById("showcaseTrack");
    var prev = document.getElementById("showcasePrev");
    var next = document.getElementById("showcaseNext");
    var progress = document.getElementById("showcaseProgress");
    var countEl = document.getElementById("showcaseCount");
    if (!stage || !track) return;

    var items = Array.prototype.slice.call(track.querySelectorAll(".showcase-item"));
    if (!items.length) return;

    var index = 0;
    var x = 0;
    var dragging = false;
    var startX = 0;
    var startTranslate = 0;
    var autoTimer = null;
    var gap = 21.6; // 1.35rem approx fallback

    function pad(n) {
      return n < 10 ? "0" + n : String(n);
    }

    function measure() {
      var styles = window.getComputedStyle(track);
      gap = parseFloat(styles.columnGap || styles.gap) || 21.6;
    }

    function cardStep() {
      return items[0].offsetWidth + gap;
    }

    function centerOffset() {
      var viewport = track.parentElement;
      return (viewport.clientWidth - items[0].offsetWidth) / 2;
    }

    function targetXFor(i) {
      return centerOffset() - i * cardStep();
    }

    function setClasses() {
      items.forEach(function (item, i) {
        item.classList.toggle("is-active", i === index);
        item.classList.toggle("is-near", Math.abs(i - index) === 1);
      });
      if (progress) {
        progress.style.width = ((index + 1) / items.length) * 100 + "%";
      }
      if (countEl) {
        countEl.textContent = pad(index + 1) + " / " + pad(items.length);
      }
    }

    function applyX(val, animate) {
      x = val;
      if (typeof gsap === "undefined" || reduceMotion || animate === false) {
        if (typeof gsap !== "undefined") {
          gsap.set(track, { x: val });
        } else {
          track.style.transform = "translate3d(" + val + "px,0,0)";
        }
        return;
      }
      gsap.to(track, {
        x: val,
        duration: 0.75,
        ease: "power3.out",
        overwrite: true,
        onUpdate: function () {
          x = Number(gsap.getProperty(track, "x")) || val;
        }
      });
    }

    function goTo(i, animate) {
      index = (i + items.length) % items.length;
      setClasses();
      applyX(targetXFor(index), animate !== false);
    }

    function nextSlide() { goTo(index + 1, true); }
    function prevSlide() { goTo(index - 1, true); }

    function stopAuto() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
      }
    }

    function startAuto() {
      stopAuto();
      if (reduceMotion) return;
      autoTimer = setInterval(nextSlide, 4200);
    }

    function onPointerDown(e) {
      dragging = true;
      track.classList.add("is-dragging");
      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startTranslate = x;
      stopAuto();
      if (typeof gsap !== "undefined") gsap.killTweensOf(track);
    }

    function onPointerMove(e) {
      if (!dragging) return;
      var clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      var dx = clientX - startX;
      applyX(startTranslate + dx, false);
      if (e.cancelable && e.type === "touchmove") e.preventDefault();
    }

    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      track.classList.remove("is-dragging");
      var clientX = (e.changedTouches && e.changedTouches[0].clientX) || e.clientX || startX;
      var dx = clientX - startX;
      var threshold = Math.min(80, cardStep() * 0.22);
      if (dx < -threshold) goTo(index + 1, true);
      else if (dx > threshold) goTo(index - 1, true);
      else goTo(index, true);
      startAuto();
    }

    measure();
    goTo(0, false);

    if (next) next.addEventListener("click", function () { stopAuto(); nextSlide(); startAuto(); });
    if (prev) prev.addEventListener("click", function () { stopAuto(); prevSlide(); startAuto(); });

    track.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    track.addEventListener("touchstart", onPointerDown, { passive: true });
    track.addEventListener("touchmove", onPointerMove, { passive: false });
    track.addEventListener("touchend", onPointerUp);

    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); stopAuto(); nextSlide(); startAuto(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); stopAuto(); prevSlide(); startAuto(); }
    });

    items.forEach(function (item, i) {
      item.addEventListener("click", function () {
        if (Math.abs(x - startTranslate) > 8) return;
        if (i !== index) {
          stopAuto();
          goTo(i, true);
          startAuto();
        }
      });
    });

    stage.addEventListener("mouseenter", stopAuto);
    stage.addEventListener("mouseleave", startAuto);

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        measure();
        goTo(index, false);
      }, 120);
    }, { passive: true });

    startAuto();
  }

  /* GSAP */
  function initGsap() {
    if (typeof gsap === "undefined") {
      document.querySelectorAll(".hero-in, .reveal").forEach(function (el) {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      initShowcase();
      return;
    }

    if (reduceMotion) {
      gsap.set(".hero-in, .reveal", { opacity: 1, y: 0, clearProps: "all" });
      initShowcase();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    gsap.to(".hero-in", {
      opacity: 1,
      y: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: "power3.out",
      delay: 0.1
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

    initShowcase();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(initGsap, 0);
    });
  } else {
    setTimeout(initGsap, 0);
  }

  window.addEventListener("load", function () {
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  });
})();
