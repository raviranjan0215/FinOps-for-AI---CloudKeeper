/**
 * FinOps for AI LP — nav, tabs, forms, HubSpot lead API, reveals, confetti.
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
  var DUPLICATE_EMAIL_ERROR =
    "This email ID is already registered. Please use another one.";
  var GENERIC_EMAIL_ERROR = "Something went wrong. Please try again.";
  var LEAD_API = "/api/lead";
  var HS_PORTAL = "47057450";
  var HS_FORM = "9c9163c2-6f41-4369-bac9-8f4668c93889";
  var HS_SUBMIT =
    "https://api.hsforms.com/submissions/v3/integration/submit/" +
    HS_PORTAL +
    "/" +
    HS_FORM;

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

  function getHutk() {
    var match = document.cookie.match(/(?:^|; )hubspotutk=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function leadPayload(email, form) {
    var source = (form && form.getAttribute("data-lead-source")) || "hero";
    return {
      email: email,
      pageUri: window.location.href.split("#")[0] + (source === "footer" ? "#footer-cta" : "#hero"),
      pageName: document.title + " — " + source,
      hutk: getHutk(),
    };
  }

  function isApiUnavailable(res) {
    return res.status === 404 || res.status === 501 || res.status === 503;
  }

  function submitHubSpotDirect(email, form) {
    var payload = leadPayload(email, form);
    var context = {};
    if (payload.pageUri) {
      context.pageUri = payload.pageUri;
    }
    if (payload.pageName) {
      context.pageName = payload.pageName;
    }
    if (payload.hutk) {
      context.hutk = payload.hutk;
    }

    return fetch(HS_SUBMIT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: [{ objectTypeId: "0-1", name: "email", value: email }],
        context: context,
      }),
    }).then(function (res) {
      if (!res.ok) {
        return { ok: false, message: GENERIC_EMAIL_ERROR };
      }
      return { ok: true };
    });
  }

  function submitLead(email, form) {
    var payload = leadPayload(email, form);

    return fetch(LEAD_API, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        var type = (res.headers.get("content-type") || "").toLowerCase();
        if (!type.includes("application/json")) {
          if (isApiUnavailable(res) || !res.ok) {
            return submitHubSpotDirect(email, form);
          }
          return { ok: false, message: GENERIC_EMAIL_ERROR };
        }

        return res.json().then(function (data) {
          if (res.status === 409 || data.registered) {
            return { registered: true };
          }
          if (res.ok) {
            return { ok: true };
          }
          if (isApiUnavailable(res)) {
            return submitHubSpotDirect(email, form);
          }
          return {
            ok: false,
            message: data.message || GENERIC_EMAIL_ERROR,
          };
        });
      })
      .catch(function () {
        return submitHubSpotDirect(email, form);
      });
  }

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
      var card = form.closest("[data-form-card]");
      setLoading(form, true);

      submitLead(email, form)
        .then(function (result) {
          setLoading(form, false);
          if (result.registered) {
            showDuplicateError(form);
            return;
          }
          if (result.ok) {
            showSuccess(card);
            return;
          }
          if (form.classList.contains("lead-form--inline")) {
            setFormError(form, result.message || GENERIC_EMAIL_ERROR);
          } else {
            setFieldError(form, result.message || GENERIC_EMAIL_ERROR);
          }
        })
        .catch(function () {
          setLoading(form, false);
          if (form.classList.contains("lead-form--inline")) {
            setFormError(form, GENERIC_EMAIL_ERROR);
          } else {
            setFieldError(form, GENERIC_EMAIL_ERROR);
          }
        });
    });
  });

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
  var reportSelectedFile = null;
  var REPORT_MAX_BYTES = 10 * 1024 * 1024;
  var REPORT_PDF_SIZE_ERROR = "PDF must be 10MB or smaller.";
  var REPORT_PDF_TYPE_ERROR = "Please upload a PDF file.";
  var REPORT_PDF_REQUIRED_ERROR = "Upload a PDF up to 10MB.";
  var REPORT_SUBMIT_ERROR = "Something went wrong. Please try again.";
  var REPORT_HS_PORTAL = "47057450";
  var REPORT_HS_FORM = "a6b8fd7b-c8a3-447c-a914-8fc32cf6e2ab";
  var REPORT_HS_REGION = "na1";
  var reportHsReady = false;
  var reportHsMounting = false;
  var reportHsFormEl = null;
  var reportHsPendingSend = null;
  var reportHsWatchTimer = null;

  function isPdfFile(file) {
    if (!file) {
      return false;
    }
    return file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  }

  function getPdfValidationError(file) {
    if (!file) {
      return REPORT_PDF_REQUIRED_ERROR;
    }
    if (!isPdfFile(file)) {
      return REPORT_PDF_TYPE_ERROR;
    }
    if (file.size > REPORT_MAX_BYTES) {
      return REPORT_PDF_SIZE_ERROR;
    }
    return "";
  }

  function setFileFieldError(wrap, message) {
    var err = wrap && wrap.querySelector("[data-report-file-error]");
    if (!wrap) {
      return;
    }
    if (message) {
      wrap.classList.add("is-error");
      if (err) {
        err.textContent = message;
        err.hidden = false;
      }
    } else {
      wrap.classList.remove("is-error");
      if (err) {
        err.hidden = true;
        err.textContent = REPORT_PDF_REQUIRED_ERROR;
      }
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
    var upload = wrap && wrap.querySelector(".report-upload");
    var nameEl = wrap && wrap.querySelector("[data-report-filename]");
    var browse = wrap && wrap.querySelector("[data-report-browse]");
    var clear = wrap && wrap.querySelector("[data-report-clear]");
    var fileInput = wrap && wrap.querySelector(".report-upload__input");

    if (!upload || !nameEl) {
      return;
    }

    reportSelectedFile = file || null;

    if (file) {
      upload.classList.add("is-selected");
      nameEl.textContent = truncateFileName(file.name);
      if (browse) {
        browse.hidden = true;
      }
      if (clear) {
        clear.hidden = false;
      }
      setFileFieldError(wrap, "");
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

  function setReportSubmitError(message) {
    var err = reportModal && reportModal.querySelector("[data-report-submit-error]");
    if (!err) {
      return;
    }
    if (message) {
      err.textContent = message;
      err.hidden = false;
    } else {
      err.textContent = "";
      err.hidden = true;
    }
  }

  function setReportSubmitting(loading) {
    var form = reportModal && reportModal.querySelector("[data-report-form]");
    var submit = form && form.querySelector("[data-report-submit]");
    if (!submit) {
      return;
    }
    submit.disabled = loading;
    submit.textContent = loading ? "Submitting…" : "Submit";
  }

  function formRoot($form) {
    if (!$form) {
      return null;
    }
    return $form.jquery ? $form.get(0) : $form;
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
    script.onerror = function () {
      reportHsMounting = false;
    };
    document.head.appendChild(script);
  }

  function clearReportHubSpotFields() {
    if (!reportHsFormEl) {
      return;
    }
    var emailInput = reportHsFormEl.querySelector('input[name="email"]');
    var fileInput = reportHsFormEl.querySelector('input[type="file"]');
    if (emailInput) {
      emailInput.value = "";
    }
    if (fileInput) {
      fileInput.value = "";
    }
  }

  function remountReportHubSpotForm() {
    reportHsReady = false;
    reportHsFormEl = null;
    var mount = document.getElementById("hs-form-report");
    if (mount) {
      mount.innerHTML = "";
    }
    mountReportHubSpotForm();
  }

  function mountReportHubSpotForm() {
    if (reportHsReady || reportHsMounting) {
      return;
    }
    if (!document.getElementById("hs-form-report")) {
      return;
    }
    reportHsMounting = true;
    loadHubSpotEmbed(function () {
      if (!window.hbspt || !window.hbspt.forms) {
        reportHsMounting = false;
        return;
      }
      window.hbspt.forms.create({
        region: REPORT_HS_REGION,
        portalId: REPORT_HS_PORTAL,
        formId: REPORT_HS_FORM,
        target: "#hs-form-report",
        css: "",
        cssClass: "hs-form-report",
        formInstanceId: "report",
        onFormReady: function ($form) {
          reportHsFormEl = formRoot($form);
          reportHsReady = true;
          reportHsMounting = false;
          if (reportHsPendingSend) {
            var send = reportHsPendingSend;
            reportHsPendingSend = null;
            send();
          }
        },
        onFormSubmitted: function () {
          if (reportHsWatchTimer) {
            window.clearTimeout(reportHsWatchTimer);
            reportHsWatchTimer = null;
          }
          setReportSubmitting(false);
          showReportSuccessState();
          remountReportHubSpotForm();
        },
      });
    });
  }

  function fillReportHubSpotForm(email, file) {
    var hs = reportHsFormEl;
    if (!hs) {
      return false;
    }
    var emailInput = hs.querySelector('input[name="email"]');
    var fileInput = hs.querySelector('input[type="file"]');
    if (emailInput) {
      emailInput.value = email;
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      emailInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (file && fileInput && typeof DataTransfer === "function") {
      var data = new DataTransfer();
      data.items.add(file);
      fileInput.files = data.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
  }

  function clickReportHubSpotSubmit() {
    var hs = reportHsFormEl;
    if (!hs) {
      return false;
    }
    var btn = hs.querySelector('input[type="submit"], button[type="submit"], .hs-button');
    if (btn) {
      btn.click();
      return true;
    }
    var native = hs.tagName === "FORM" ? hs : hs.querySelector("form");
    if (native && typeof native.requestSubmit === "function") {
      native.requestSubmit();
      return true;
    }
    return false;
  }

  function submitReportToHubSpot(email, file, onFail) {
    function send() {
      if (!fillReportHubSpotForm(email, file) || !clickReportHubSpotSubmit()) {
        onFail();
        return;
      }
      if (reportHsWatchTimer) {
        window.clearTimeout(reportHsWatchTimer);
      }
      reportHsWatchTimer = window.setTimeout(function () {
        reportHsWatchTimer = null;
        onFail();
      }, 12000);
    }

    if (reportHsReady && reportHsFormEl) {
      send();
      return;
    }

    reportHsPendingSend = send;
    mountReportHubSpotForm();
    window.setTimeout(function () {
      if (!reportHsReady && reportHsPendingSend === send) {
        reportHsPendingSend = null;
        onFail();
      }
    }, 8000);
  }

  /* Visibility is class-driven (.is-success). Do not use [hidden] on form/success —
     global [hidden]{display:none!important} fights the success layout. */
  function showReportFormState() {
    if (!reportModal) {
      return;
    }
    var successView = reportModal.querySelector('[data-report-view="success"]');
    reportModal.classList.remove("is-success");
    if (successView) {
      successView.setAttribute("aria-hidden", "true");
    }
  }

  function showReportSuccessState() {
    if (!reportModal) {
      return;
    }
    var successView = reportModal.querySelector('[data-report-view="success"]');
    var closeBtn = reportModal.querySelector(".report-modal__close");

    reportModal.classList.add("is-success");
    if (successView) {
      successView.setAttribute("aria-hidden", "false");
    }
    if (closeBtn) {
      closeBtn.focus();
    }
  }

  function resetReportModal() {
    var form = reportModal && reportModal.querySelector("[data-report-form]");
    var uploadWrap = reportModal && reportModal.querySelector("[data-report-upload]");
    var submit = form && form.querySelector("[data-report-submit]");

    showReportFormState();
    reportSelectedFile = null;
    clearReportHubSpotFields();

    if (form) {
      form.reset();
      form.querySelectorAll(".report-field.is-error").forEach(function (field) {
        field.classList.remove("is-error");
      });
      form.querySelectorAll("[data-report-email-error], [data-report-file-error]").forEach(function (err) {
        err.hidden = true;
      });
    }
    if (uploadWrap) {
      setUploadState(uploadWrap, null);
      setFileFieldError(uploadWrap, "");
    }
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Submit";
    }
    var submitError = reportModal && reportModal.querySelector("[data-report-submit-error]");
    if (submitError) {
      submitError.hidden = true;
      submitError.textContent = "";
    }
  }

  function openReportModal() {
    if (!reportModal || reportModalOpen) {
      return;
    }

    resetReportModal();
    reportLastFocus = document.activeElement;
    reportModalOpen = true;
    reportModal.hidden = false;
    reportModal.classList.add("is-open");
    reportModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("report-modal-open");
    mountReportHubSpotForm();

    var emailInput = reportModal.querySelector('input[type="email"]');
    if (emailInput) {
      emailInput.focus();
    } else {
      var closeBtn = reportModal.querySelector(".report-modal__close");
      if (closeBtn) {
        closeBtn.focus();
      }
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
    resetReportModal();

    if (reportLastFocus && typeof reportLastFocus.focus === "function") {
      reportLastFocus.focus();
    }
  }

  function validateReportForm(form) {
    var emailField = form.querySelector(".report-field:not(.report-field--upload)");
    var emailInput = form.querySelector('input[type="email"]');
    var uploadWrap = form.querySelector("[data-report-upload]");
    var emailError = form.querySelector("[data-report-email-error]");
    var emailValue = emailInput ? (emailInput.value || "").trim() : "";
    var emailOk = EMAIL_RE.test(emailValue);
    var file =
      reportSelectedFile ||
      (form.querySelector(".report-upload__input") &&
        form.querySelector(".report-upload__input").files &&
        form.querySelector(".report-upload__input").files[0]);
    var fileErrorMsg = getPdfValidationError(file);
    var fileOk = !fileErrorMsg;

    if (emailField) {
      emailField.classList.toggle("is-error", !emailOk);
    }
    if (emailInput) {
      emailInput.setAttribute("aria-invalid", emailOk ? "false" : "true");
    }
    if (emailError) {
      emailError.hidden = emailOk;
    }

    setFileFieldError(uploadWrap, fileOk ? "" : fileErrorMsg);

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
        clear.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          setUploadState(uploadWrap, null);
          setFileFieldError(uploadWrap, "");
        });
      }

      if (fileInput && uploadWrap) {
        fileInput.addEventListener("change", function () {
          var file = fileInput.files && fileInput.files[0];
          if (!file) {
            setUploadState(uploadWrap, null);
            setFileFieldError(uploadWrap, "");
            return;
          }

          var errorMsg = getPdfValidationError(file);
          if (errorMsg) {
            setUploadState(uploadWrap, null);
            setFileFieldError(uploadWrap, errorMsg);
            return;
          }

          setUploadState(uploadWrap, file);
        });
      }

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        event.stopPropagation();

        /* Already on success — keep modal open; never close from submit */
        if (reportModal.classList.contains("is-success")) {
          return;
        }

        if (!validateReportForm(form)) {
          return;
        }

        var submit = form.querySelector("[data-report-submit]");
        if (submit) {
          submit.disabled = true;
          submit.textContent = "Submitting…";
        }
        setReportSubmitError("");

        var emailInput = form.querySelector('input[type="email"]');
        var email = emailInput ? (emailInput.value || "").trim() : "";
        var file =
          reportSelectedFile ||
          (fileInput && fileInput.files && fileInput.files[0]);

        submitReportToHubSpot(email, file, function () {
          if (!reportModalOpen || reportModal.classList.contains("is-success")) {
            return;
          }
          setReportSubmitting(false);
          setReportSubmitError(REPORT_SUBMIT_ERROR);
        });
      });
    }
  }
})();
