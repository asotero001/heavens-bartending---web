(function () {
  'use strict';

  // ---------- Footer year ----------
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- Nav dropdown ----------
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  var navIcon = document.getElementById('navIcon');

  function setNavOpen(open) {
    if (!navLinks) return;
    navLinks.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navIcon.innerHTML = open
      ? '<line x1="4" y1="4" x2="18" y2="18"></line><line x1="18" y1="4" x2="4" y2="18"></line>'
      : '<line x1="2" y1="6" x2="20" y2="6"></line><line x1="2" y1="11" x2="20" y2="11"></line><line x1="2" y1="16" x2="20" y2="16"></line>';
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setNavOpen(!navLinks.classList.contains('open'));
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setNavOpen(false); });
    });
    document.addEventListener('click', function (e) {
      if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && !navToggle.contains(e.target)) {
        setNavOpen(false);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        setNavOpen(false);
        navToggle.focus();
      }
    });
  }

  // ---------- Inquiry form ----------
  var form = document.getElementById('inquireForm');
  if (!form) return;

  var successMsg = document.getElementById('successMsg');
  var errorMsg = document.getElementById('errorMsg');
  var invalidMsg = document.getElementById('invalidMsg');
  var submitBtn = document.getElementById('submitBtn');
  var remember = document.getElementById('rememberDraft');
  var rememberStatus = document.getElementById('rememberStatus');
  var clearBtn = document.getElementById('clearDraft');

  // Optional, opt-in draft saving.
  // Uses sessionStorage only: it stays in this one browser tab,
  // is never sent anywhere, and the browser deletes it when the tab closes.
  // Nothing is stored unless the visitor ticks the box.
  var DRAFT_KEY = 'hb-inquiry-draft';
  var NEVER_SAVE = { _gotcha: 1, _subject: 1, age_confirm: 1, contact_consent: 1 };

  function getStore() {
    try { return window.sessionStorage; } catch (e) { return null; }
  }

  function collect() {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || NEVER_SAVE[el.name] || el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;
      if (el.type === 'checkbox') {
        if (!data[el.name]) data[el.name] = [];
        if (el.checked) data[el.name].push(el.value);
      } else if (el.type === 'radio') {
        if (el.checked) data[el.name] = el.value;
      } else {
        data[el.name] = el.value;
      }
    });
    return data;
  }

  function apply(data) {
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || NEVER_SAVE[el.name] || !Object.prototype.hasOwnProperty.call(data, el.name)) return;
      var v = data[el.name];
      if (el.type === 'checkbox') el.checked = Array.isArray(v) && v.indexOf(el.value) > -1;
      else if (el.type === 'radio') el.checked = (v === el.value);
      else if (typeof v === 'string') el.value = v;
    });
  }

  function clearDraft() {
    var s = getStore();
    if (s) { try { s.removeItem(DRAFT_KEY); } catch (e) {} }
  }

  function saveDraft() {
    if (!remember || !remember.checked) return;
    var s = getStore();
    if (!s) return;
    try { s.setItem(DRAFT_KEY, JSON.stringify(collect())); } catch (e) {}
  }

  function showRememberStatus(on) {
    if (rememberStatus) rememberStatus.classList.toggle('show', on);
  }

  // Restore only if the visitor opted in earlier in this same tab
  (function restore() {
    var s = getStore();
    if (!s) return;
    try {
      var raw = s.getItem(DRAFT_KEY);
      if (raw) {
        apply(JSON.parse(raw));
        remember.checked = true;
        showRememberStatus(true);
      }
    } catch (e) { clearDraft(); }
  })();

  if (remember) {
    remember.addEventListener('change', function () {
      if (remember.checked) { saveDraft(); showRememberStatus(true); }
      else { clearDraft(); showRememberStatus(false); }
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      clearDraft();
      remember.checked = false;
      showRememberStatus(false);
    });
  }
  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);

  function hideMessages() {
    [successMsg, errorMsg, invalidMsg].forEach(function (m) { if (m) m.classList.remove('show'); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideMessages();

    if (!form.checkValidity()) {
      invalidMsg.classList.add('show');
      form.reportValidity();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    })
      .then(function (response) {
        if (response.ok) {
          form.reset();
          clearDraft();
          if (remember) remember.checked = false;
          showRememberStatus(false);
          successMsg.classList.add('show');
          successMsg.focus();
        } else {
          errorMsg.classList.add('show');
          errorMsg.focus();
        }
      })
      .catch(function () {
        errorMsg.classList.add('show');
        errorMsg.focus();
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send My Inquiry';
      });
  });
})();
