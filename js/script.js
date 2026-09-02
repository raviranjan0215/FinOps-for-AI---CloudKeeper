/**
 * FinOps for AI LP — nav, tabs, forms, HubSpot stub, reveals, confetti.
 */
(function () {
  var header = document.getElementById("site-header");
  var toggle = header.querySelector(".header__toggle");
  var links = Array.from(document.querySelectorAll("[data-scroll]"));
  var navLinks = Array.from(header.querySelectorAll(".header__link"));
  var sectionIds = ["hero", "capabilities", "offerings", "resources", "about"];
  var sections = sectionIds
    .map(function (id) {
      return document.getElementById(id);
    })
    .filter(Boolean);

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ctaIconMarkup(isGhost) {
    if (isGhost) {
      return (
        '<span class="cta__icon" aria-hidden="true">' +
        '<img class="cta__icon-img cta__icon-img--default" src="assets/icons/arrow-blue.svg" alt="" width="17" height="17" />' +
        '<img class="cta__icon-img cta__icon-img--hover" src="assets/icons/arrow-white.svg" alt="" width="17" height="17" />' +
        "</span>"
      );
    }
    return (
      '<span class="cta__icon" aria-hidden="true">' +
      '<img class="cta__icon-img" src="assets/icons/arrow-white.svg" alt="" width="17" height="17" />' +
      "</span>"
    );
  }

  function decorateCtaButtons(root) {
    (root || document).querySelectorAll(".cta").forEach(function (btn) {
      if (btn.querySelector(".cta__icon")) {
        return;
      }
      btn.insertAdjacentHTML("beforeend", ctaIconMarkup(btn.classList.contains("cta--ghost")));
    });
  }

  decorateCtaButtons();

  function headerOffset() {
    return header ? header.offsetHeight : 0;
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
    if (header.classList.contains("header--open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 899) {
      closeMenu();
    }
  });

  function scrollToTarget(hash) {
    var target = document.querySelector(hash);
    if (!target) {
      return;
    }
    var top = target.getBoundingClientRect().top + window.scrollY - headerOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
  }

  function setActive(id) {
    navLinks.forEach(function (link) {
      var isMatch = link.getAttribute("href") === "#" + id;
      link.classList.toggle("header__link--active", isMatch);
    });
  }

  function focusHeroEmail() {
    var input = document.querySelector("#hero .field__input");
    if (input) {
      window.setTimeout(function () {
        input.focus();
      }, 350);
    }
  }

  links.forEach(function (link) {
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) !== "#") {
        return;
      }
      event.preventDefault();
      closeMenu();
      setActive(href.slice(1));
      scrollToTarget(href);
      if (link.hasAttribute("data-focus-form")) {
        focusHeroEmail();
      }
      if (history.replaceState) {
        history.replaceState(null, "", href);
      }
    });
  });

  function updateActiveFromScroll() {
    if (!sections.length) {
      return;
    }
    var probe = headerOffset() + 48;
    var current = sections[0].id;
    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= probe) {
        current = section.id;
      }
    });
    setActive(current);
  }

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(function () {
        updateActiveFromScroll();
        ticking = false;
      });
    },
    { passive: true }
  );
  window.addEventListener("resize", updateActiveFromScroll);
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

  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".reveal").forEach(function (node) {
      if (reduceMotion) {
        node.classList.add("is-in");
        return;
      }
      revealObserver.observe(node);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (node) {
      node.classList.add("is-in");
    });
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var HS_PORTAL = "";
  var HS_FORM = "";
  var HS_REGION = "na1";

  function burstConfetti(card) {
    if (reduceMotion || typeof confetti !== "function") {
      return;
    }
    var canvas = card.querySelector("[data-confetti-canvas]");
    if (!canvas || typeof confetti.create !== "function") {
      return;
    }
    var fire = confetti.create(canvas, { resize: true, useWorker: true });
    fire({
      particleCount: 90,
      spread: 72,
      startVelocity: 28,
      origin: { y: 0.55 },
      colors: ["#17a5fb", "#e80584", "#9a4bff", "#22c55e"],
    });
  }

  function showSuccess(card) {
    var form = card.querySelector("[data-lead-form]");
    var success = card.querySelector("[data-lead-success]");
    if (form) {
      form.hidden = true;
    }
    if (success) {
      success.hidden = false;
      success.classList.add("is-in");
    }
    burstConfetti(card);
  }

  function setLoading(form, loading) {
    var btn = form.querySelector('button[type="submit"]');
    if (!btn) {
      return;
    }
    var label = btn.querySelector("[data-cta-label]") || btn.childNodes[0];
    btn.disabled = loading;
    btn.classList.toggle("is-loading", loading);
    if (loading) {
      btn.dataset.label = (label.textContent || "").trim();
      label.textContent = "Booking…";
    } else if (btn.dataset.label) {
      label.textContent = btn.dataset.label;
    }
  }

  function validate(form) {
    var field = form.querySelector(".field");
    var input = form.querySelector('input[type="email"]');
    var error = form.querySelector("[data-error]");
    var value = (input.value || "").trim();
    var ok = EMAIL_RE.test(value);
    field.classList.toggle("is-error", !ok);
    input.setAttribute("aria-invalid", ok ? "false" : "true");
    if (error) {
      error.hidden = ok;
    }
    return ok;
  }

  document.querySelectorAll("[data-lead-form]").forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    if (input) {
      input.addEventListener("input", function () {
        if (form.querySelector(".field").classList.contains("is-error")) {
          validate(form);
        }
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!validate(form)) {
        form.querySelector('input[type="email"]').focus();
        return;
      }

      var card = form.closest("[data-form-card]");
      setLoading(form, true);

      window.setTimeout(function () {
        setLoading(form, false);
        showSuccess(card);
      }, 650);
    });
  });

  function formRoot($form) {
    if (!$form) {
      return null;
    }
    return $form.jquery ? $form.get(0) : $form;
  }

  function mountHubSpotForms() {
    if (!HS_PORTAL || !HS_FORM || !window.hbspt || !window.hbspt.forms) {
      return;
    }

    function create(target, instanceId) {
      if (!document.querySelector(target)) {
        return;
      }
      window.hbspt.forms.create({
        region: HS_REGION,
        portalId: HS_PORTAL,
        formId: HS_FORM,
        target: target,
        css: "",
        cssClass: "hs-form-finops",
        formInstanceId: instanceId,
        submitButtonClass: "cta cta--block",
        onFormSubmit: function ($form) {
          var root = formRoot($form);
          var native = root && root.closest("[data-lead-form]");
          if (native) {
            setLoading(native, true);
          }
        },
        onFormSubmitted: function ($form) {
          var root = formRoot($form);
          var card = root && root.closest("[data-form-card]");
          if (card) {
            showSuccess(card);
          }
        },
      });
      var mount = document.querySelector(target);
      if (mount) {
        mount.hidden = false;
        decorateCtaButtons(mount);
        var native = mount.parentElement.querySelector("[data-lead-form]");
        if (native) {
          native.hidden = true;
        }
      }
    }

    create("#hs-form-hero", "hero");
    create("#hs-form-footer", "footer");
  }

  function whenHubSpotReady(done) {
    if (window.hbspt && window.hbspt.forms) {
      done();
      return;
    }
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (window.hbspt && window.hbspt.forms) {
        window.clearInterval(timer);
        done();
      } else if (tries > 50) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  function loadHubSpotEmbed(done) {
    if (window.hbspt && window.hbspt.forms) {
      done();
      return;
    }
    if (document.getElementById("hs-embed-script")) {
      whenHubSpotReady(done);
      return;
    }
    var script = document.createElement("script");
    script.id = "hs-embed-script";
    script.src = "https://js.hsforms.net/forms/embed/v2.js";
    script.async = true;
    script.charset = "utf-8";
    script.onload = function () {
      whenHubSpotReady(done);
    };
    document.head.appendChild(script);
  }

  if (HS_PORTAL && HS_FORM) {
    loadHubSpotEmbed(mountHubSpotForms);
  }

  function initJourneySteps() {
    var list = document.querySelector("[data-journey-steps]");
    if (!list) {
      return;
    }

    var wrap = list.closest(".journey__steps-wrap") || list.parentElement;

    var steps = Array.from(list.querySelectorAll(".journey__step"));
    if (!steps.length) {
      return;
    }

    var current = 0;
    var timer = null;
    var paused = false;
    var STEP_MS = 1200;

    function progressFor(index) {
      if (steps.length <= 1) {
        return 0;
      }
      return index / (steps.length - 1);
    }

    function setActive(index, instant) {
      current = index;
      steps.forEach(function (step, i) {
        step.classList.toggle("journey__step--active", i === index);
      });
      wrap.classList.toggle("is-instant", Boolean(instant));
      wrap.style.setProperty("--journey-progress", String(progressFor(index)));
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
      if (reduceMotion || paused) {
        return;
      }
      timer = window.setInterval(function () {
        var next = (current + 1) % steps.length;
        setActive(next, next === 0);
      }, STEP_MS);
    }

    setActive(0, true);

    if (reduceMotion) {
      return;
    }

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
        setActive(index);
      });
    });

    list.addEventListener("focusout", function (event) {
      if (!list.contains(event.relatedTarget)) {
        paused = false;
        startCycle();
      }
    });

    if ("IntersectionObserver" in window) {
      var journeyObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              startCycle();
            } else {
              stopCycle();
              setActive(0, true);
            }
          });
        },
        { threshold: 0.35 }
      );
      journeyObserver.observe(list.closest(".journey") || list);
    } else {
      startCycle();
    }
  }

  initJourneySteps();
})();
