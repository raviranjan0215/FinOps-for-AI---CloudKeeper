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
  var DEFAULT_EMAIL_ERROR = "Enter a valid work email.";
  var DUPLICATE_EMAIL_ERROR = "You've already booked a demo with this email.";

  var submittedEmails = (function loadSubmittedEmails() {
    var set = new Set();
    try {
      var raw = window.sessionStorage.getItem("finops-demo-emails");
      if (raw) {
        JSON.parse(raw).forEach(function (email) {
          set.add(String(email).toLowerCase());
        });
      }
    } catch (err) {
      /* ignore storage errors */
    }
    return set;
  })();

  function persistSubmittedEmails() {
    try {
      window.sessionStorage.setItem(
        "finops-demo-emails",
        JSON.stringify(Array.from(submittedEmails))
      );
    } catch (err) {
      /* ignore storage errors */
    }
  }

  function rememberEmail(email) {
    submittedEmails.add(email.toLowerCase());
    persistSubmittedEmails();
  }

  function isDuplicateEmail(email) {
    return submittedEmails.has(email.toLowerCase());
  }

  function getEmailValue(form) {
    var input = form.querySelector('input[type="email"]');
    return (input && input.value ? input.value : "").trim();
  }

  function clearFormError(form) {
    var alert = form.querySelector("[data-form-error]");
    if (alert) {
      alert.hidden = true;
      alert.textContent = "";
    }
  }

  function setFormError(form, message) {
    var alert = form.querySelector("[data-form-error]");
    if (alert) {
      alert.textContent = message;
      alert.hidden = false;
    }
  }

  function setFieldError(form, message) {
    var field = form.querySelector(".field");
    var input = form.querySelector('input[type="email"]');
    var error = form.querySelector("[data-error]");
    if (field) {
      field.classList.add("is-error");
    }
    if (input) {
      input.setAttribute("aria-invalid", "true");
    }
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
  }

  function clearFieldError(form) {
    var field = form.querySelector(".field");
    var input = form.querySelector('input[type="email"]');
    var error = form.querySelector("[data-error]");
    if (field) {
      field.classList.remove("is-error");
    }
    if (input) {
      input.setAttribute("aria-invalid", "false");
    }
    if (error) {
      error.textContent = DEFAULT_EMAIL_ERROR;
      error.hidden = true;
    }
    clearFormError(form);
  }

  function showDuplicateError(form) {
    var input = form.querySelector('input[type="email"]');
    var field = form.querySelector(".field");
    var isInline = form.classList.contains("lead-form--inline");
    clearFieldError(form);
    if (isInline) {
      setFormError(form, DUPLICATE_EMAIL_ERROR);
      if (field) {
        field.classList.add("is-error");
      }
      if (input) {
        input.setAttribute("aria-invalid", "true");
      }
    } else {
      setFieldError(form, DUPLICATE_EMAIL_ERROR);
    }
    if (input) {
      input.focus();
    }
  }

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

  function showSuccess(card, email) {
    var form = card.querySelector("[data-lead-form]");
    var success = card.querySelector("[data-lead-success]");
    if (email) {
      rememberEmail(email);
    }
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
    var value = getEmailValue(form);
    var ok = EMAIL_RE.test(value);
    clearFieldError(form);
    if (!ok) {
      setFieldError(form, DEFAULT_EMAIL_ERROR);
    }
    return ok;
  }

  document.querySelectorAll("[data-lead-form]").forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    if (input) {
      input.addEventListener("input", function () {
        clearFormError(form);
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

      var email = getEmailValue(form);
      if (isDuplicateEmail(email)) {
        showDuplicateError(form);
        return;
      }

      var card = form.closest("[data-form-card]");
      setLoading(form, true);

      window.setTimeout(function () {
        setLoading(form, false);
        showSuccess(card, email);
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

  /* Report modal — upload-boll-popup-form */
  var reportModal = document.getElementById("report-modal");
  var reportModalOpen = false;
  var reportLastFocus = null;
  var REPORT_MAX_BYTES = 10 * 1024 * 1024;

  function openReportModal() {
    if (!reportModal || reportModalOpen) {
      return;
    }

    reportLastFocus = document.activeElement;
    reportModalOpen = true;
    reportModal.hidden = false;
    reportModal.classList.add("is-open");
    reportModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("report-modal-open");

    var closeBtn = reportModal.querySelector(".report-modal__close");
    if (closeBtn) {
      closeBtn.focus();
    }
  }

  function closeReportModal() {
    if (!reportModal || !reportModalOpen) {
      return;
    }

    reportModalOpen = false;
    reportModal.classList.remove("is-open");
    reportModal.hidden = true;
    reportModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("report-modal-open");

    if (reportLastFocus && typeof reportLastFocus.focus === "function") {
      reportLastFocus.focus();
    }
  }

  function truncateFileName(name, max) {
    var limit = max || 24;
    if (!name || name.length <= limit) {
      return name;
    }
    return name.slice(0, Math.max(0, limit - 2)) + "..";
  }

  function setUploadState(wrap, file) {
    var upload = wrap.querySelector(".report-upload");
    var nameEl = wrap.querySelector("[data-report-filename]");
    var browse = wrap.querySelector("[data-report-browse]");
    var clear = wrap.querySelector("[data-report-clear]");
    var fileInput = wrap.querySelector(".report-upload__input");

    if (!upload || !nameEl) {
      return;
    }

    if (file) {
      upload.classList.add("is-selected");
      nameEl.textContent = truncateFileName(file.name);
      if (browse) {
        browse.hidden = true;
      }
      if (clear) {
        clear.hidden = false;
      }
      wrap.classList.remove("is-error");
      var err = wrap.querySelector("[data-report-file-error]");
      if (err) {
        err.hidden = true;
      }
    } else {
      upload.classList.remove("is-selected");
      nameEl.textContent = "PDF (max 10MB)";
      if (browse) {
        browse.hidden = false;
      }
      if (clear) {
        clear.hidden = true;
      }
      if (fileInput) {
        fileInput.value = "";
      }
    }
  }

  function validateReportForm(form) {
    var emailField = form.querySelector(".report-field:not(.report-field--upload)");
    var emailInput = form.querySelector('input[type="email"]');
    var uploadWrap = form.querySelector("[data-report-upload]");
    var fileInput = form.querySelector(".report-upload__input");
    var emailError = form.querySelector("[data-report-email-error]");
    var fileError = form.querySelector("[data-report-file-error]");
    var emailOk = EMAIL_RE.test((emailInput.value || "").trim());
    var file = fileInput && fileInput.files && fileInput.files[0];
    var fileOk =
      !!file &&
      (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) &&
      file.size <= REPORT_MAX_BYTES;

    if (emailField) {
      emailField.classList.toggle("is-error", !emailOk);
    }
    if (emailInput) {
      emailInput.setAttribute("aria-invalid", emailOk ? "false" : "true");
    }
    if (emailError) {
      emailError.hidden = emailOk;
    }

    if (uploadWrap) {
      uploadWrap.classList.toggle("is-error", !fileOk);
    }
    if (fileError) {
      fileError.hidden = fileOk;
      if (!fileOk && file && file.size > REPORT_MAX_BYTES) {
        fileError.textContent = "File must be 10MB or smaller.";
      } else if (!fileOk && file) {
        fileError.textContent = "Upload a PDF file.";
      } else {
        fileError.textContent = "Upload a PDF up to 10MB.";
      }
    }

    return emailOk && fileOk;
  }

  if (reportModal) {
    document.querySelectorAll("[data-open-report-modal]").forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        openReportModal();
      });
    });

    reportModal.querySelectorAll("[data-report-close]").forEach(function (node) {
      node.addEventListener("click", closeReportModal);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && reportModalOpen) {
        closeReportModal();
      }
    });

    var form = reportModal.querySelector("[data-report-form]");
    if (form) {
      var uploadWrap = form.querySelector("[data-report-upload]");
      var fileInput = form.querySelector(".report-upload__input");
      var browse = form.querySelector("[data-report-browse]");
      var clear = form.querySelector("[data-report-clear]");

      if (browse && fileInput) {
        browse.addEventListener("click", function () {
          fileInput.click();
        });
      }

      if (clear && uploadWrap) {
        clear.addEventListener("click", function () {
          setUploadState(uploadWrap, null);
        });
      }

      if (fileInput && uploadWrap) {
        fileInput.addEventListener("change", function () {
          var file = fileInput.files && fileInput.files[0];
          if (!file) {
            setUploadState(uploadWrap, null);
            return;
          }
          if (file.size > REPORT_MAX_BYTES || !(file.type === "application/pdf" || /\.pdf$/i.test(file.name))) {
            setUploadState(uploadWrap, null);
            uploadWrap.classList.add("is-error");
            var err = uploadWrap.querySelector("[data-report-file-error]");
            if (err) {
              err.hidden = false;
              err.textContent =
                file.size > REPORT_MAX_BYTES
                  ? "File must be 10MB or smaller."
                  : "Upload a PDF file.";
            }
            return;
          }
          setUploadState(uploadWrap, file);
        });
      }

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!validateReportForm(form)) {
          return;
        }
        var submit = form.querySelector(".report-modal__submit");
        if (submit) {
          submit.disabled = true;
          submit.textContent = "Submitting…";
        }
        window.setTimeout(function () {
          if (submit) {
            submit.disabled = false;
            submit.textContent = "Submit";
          }
          closeReportModal();
          form.reset();
          if (uploadWrap) {
            setUploadState(uploadWrap, null);
          }
        }, 700);
      });
    }
  }
})();
