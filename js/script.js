/**
 * FinOps for AI LP — nav, tabs, reveals, HubSpot embeds, journey.
 */
(function () {
  var header = document.getElementById("site-header");
  var toggle = header.querySelector(".header__toggle");
  var navLinks = Array.from(header.querySelectorAll(".header__link"));
  var sections = ["hero", "capabilities", "offerings", "resources", "about"]
    .map(function (id) {
      return document.getElementById(id);
    })
    .filter(Boolean);
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function headerOffset() {
    return header.offsetHeight || 0;
  }

  function closeMenu() {
    header.classList.remove("header--open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  }

  function openMenu() {
    header.classList.add("header--open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
  }

  toggle.addEventListener("click", function () {
    header.classList.contains("header--open") ? closeMenu() : openMenu();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  function setActive(id) {
    navLinks.forEach(function (link) {
      link.classList.toggle("header__link--active", link.getAttribute("href") === "#" + id);
    });
  }

  function scrollToTarget(hash) {
    var target = document.querySelector(hash);
    if (!target) return;
    var top = target.getBoundingClientRect().top + window.scrollY - headerOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
  }

  function focusHeroEmail() {
    var input = document.querySelector(
      "#form-finopsai input[type='email'], #form-finopsai input[name='email'], #form-finopsai .hs-input"
    );
    if (input) {
      window.setTimeout(function () {
        input.focus();
      }, 350);
    }
  }

  document.querySelectorAll("[data-scroll]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) !== "#") return;
      e.preventDefault();
      closeMenu();
      setActive(href.slice(1));
      scrollToTarget(href);
      if (link.hasAttribute("data-focus-form")) focusHeroEmail();
      if (history.replaceState) history.replaceState(null, "", href);
    });
  });

  function updateActiveFromScroll() {
    if (!sections.length) return;
    var probe = headerOffset() + 48;
    var current = sections[0].id;
    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= probe) current = section.id;
    });
    setActive(current);
  }

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        updateActiveFromScroll();
        ticking = false;
      });
    },
    { passive: true }
  );

  window.addEventListener("resize", function () {
    if (window.innerWidth > 899) closeMenu();
    updateActiveFromScroll();
  });
  updateActiveFromScroll();

  document.querySelectorAll(".pill-tabs__btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tab = btn.getAttribute("data-tab");
      document.querySelectorAll(".pill-tabs__btn").forEach(function (other) {
        var on = other === btn;
        other.classList.toggle("is-active", on);
        other.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll(".offer-panel").forEach(function (panel) {
        var match = panel.getAttribute("data-panel") === tab;
        panel.classList.toggle("is-active", match);
        panel.hidden = !match;
      });
    });
  });

  var revealNodes = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
    );
    revealNodes.forEach(function (node) {
      revealObserver.observe(node);
    });
  } else {
    revealNodes.forEach(function (node) {
      node.classList.add("is-in");
    });
  }

  /* Same HubSpot form twice needs unique target + formInstanceId */
  var HS = {
    portalId: "47057450",
    formId: "9c9163c2-6f41-4369-bac9-8f4668c93889",
    region: "na1",
  };

  function burstConfetti(card) {
    if (reduceMotion || typeof confetti !== "function" || typeof confetti.create !== "function") {
      return;
    }
    var canvas = card.querySelector("[data-confetti-canvas]");
    if (!canvas) return;
    confetti.create(canvas, { resize: true, useWorker: true })({
      particleCount: 90,
      spread: 72,
      startVelocity: 28,
      origin: { y: 0.55 },
      colors: ["#17a5fb", "#e80584", "#9a4bff", "#22c55e"],
    });
  }

  function showSuccess(card) {
    if (!card) return;
    var native = card.querySelector("[data-hs-lead]");
    var success = card.querySelector("[data-lead-success]");
    if (native) native.hidden = true;
    if (success) {
      success.hidden = false;
      success.classList.add("is-in");
    }
    if (!card.classList.contains("lead-card--inline")) burstConfetti(card);
  }

  function createHubSpotForm(targetSel, formInstanceId) {
    var target = document.querySelector(targetSel);
    if (!target) return;
    var card = target.closest("[data-form-card]");

    function create() {
      if (!window.hbspt || !window.hbspt.forms) return false;
      if (target.dataset.hsReady === "true") return true;
      target.dataset.hsReady = "true";
      window.hbspt.forms.create({
        portalId: HS.portalId,
        formId: HS.formId,
        region: HS.region,
        target: targetSel,
        formInstanceId: formInstanceId,
        css: "",
        cssClass: "form-finopsai__hs",
        onFormSubmitted: function () {
          showSuccess(card);
        },
      });
      return true;
    }

    if (create()) return;
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (create() || tries > 40) window.clearInterval(timer);
    }, 150);
  }

  createHubSpotForm("#form-finopsai", "1");
  createHubSpotForm("#form-finopsai-footer", "2");

  (function initJourneySteps() {
    var list = document.querySelector("[data-journey-steps]");
    if (!list) return;

    var wrap = list.closest(".journey__steps-wrap") || list.parentElement;
    var steps = Array.from(list.querySelectorAll(".journey__step"));
    if (!steps.length) return;

    var current = 0;
    var timer = null;
    var paused = false;
    var STEP_MS = 1200;

    function setStepActive(index, instant) {
      current = index;
      steps.forEach(function (step, i) {
        step.classList.toggle("journey__step--active", i === index);
      });
      wrap.classList.toggle("is-instant", Boolean(instant));
      wrap.style.setProperty(
        "--journey-progress",
        String(steps.length <= 1 ? 0 : index / (steps.length - 1))
      );
      if (instant) {
        window.requestAnimationFrame(function () {
          wrap.classList.remove("is-instant");
        });
      }
    }

    function stopCycle() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function startCycle() {
      stopCycle();
      if (reduceMotion || paused) return;
      timer = window.setInterval(function () {
        var next = (current + 1) % steps.length;
        setStepActive(next, next === 0);
      }, STEP_MS);
    }

    setStepActive(0, true);
    if (reduceMotion) return;

    list.addEventListener("mouseenter", function () {
      paused = true;
      stopCycle();
    });
    list.addEventListener("mouseleave", function () {
      paused = false;
      startCycle();
    });
    steps.forEach(function (step, index) {
      step.addEventListener("focusin", function () {
        paused = true;
        stopCycle();
        setStepActive(index);
      });
    });
    list.addEventListener("focusout", function (e) {
      if (!list.contains(e.relatedTarget)) {
        paused = false;
        startCycle();
      }
    });

    if ("IntersectionObserver" in window) {
      var journeyObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) startCycle();
            else {
              stopCycle();
              setStepActive(0, true);
            }
          });
        },
        { threshold: 0.35 }
      );
      journeyObserver.observe(list.closest(".journey") || list);
    } else {
      startCycle();
    }
  })();
})();
