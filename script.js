(function () {
  'use strict';

  // Set a GA4 measurement ID (e.g. "G-XXXXXXXXXX") to enable analytics.
  var MEASUREMENT_ID = '';
  var CONTACT_EMAIL = 'customercare@newvsys.com';
  var MAX_RESUME_BYTES = 5 * 1024 * 1024;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  if (MEASUREMENT_ID) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', MEASUREMENT_ID);
  }

  function track(name, params) {
    gtag('event', name, params || {});
  }

  // Mobile navigation
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', function () {
      setOpen(!nav.classList.contains('is-open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  // Conversion tracking: email, phone, WhatsApp and project-enquiry CTAs
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('mailto:') === 0) track('email_click', { link_url: href });
    else if (href.indexOf('tel:') === 0) track('phone_click', { link_url: href });
    else if (href.indexOf('wa.me') !== -1) track('whatsapp_click', { link_url: href });
    else if (a.hasAttribute('data-track')) track(a.getAttribute('data-track'), { link_url: href });
  });

  // Forms: post to the configured endpoint, otherwise fall back to the visitor's email client.
  function setStatus(form, message, type) {
    var el = form.querySelector('.form-status');
    if (!el) return;
    el.textContent = message;
    el.className = 'form-status' + (type ? ' is-' + type : '');
  }

  function mailtoFallback(form) {
    var lines = [];
    new FormData(form).forEach(function (value, key) {
      if (key === '_gotcha' || value instanceof File || !value) return;
      var label = form.querySelector('[name="' + key + '"]');
      var text = label && label.id ? form.querySelector('label[for="' + label.id + '"]') : null;
      lines.push((text ? text.textContent.trim() : key) + ': ' + value);
    });
    var subject = form.getAttribute('data-subject') || 'Website enquiry';
    window.location.href = 'mailto:' + CONTACT_EMAIL +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  document.querySelectorAll('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var trap = form.querySelector('[name="_gotcha"]');
      if (trap && trap.value) return;

      var resume = form.querySelector('input[type="file"]');
      if (resume && resume.files[0] && resume.files[0].size > MAX_RESUME_BYTES) {
        setStatus(form, 'Resume must be 5 MB or smaller.', 'error');
        return;
      }

      track('form_submit', { form_name: form.getAttribute('data-form') });

      var action = form.getAttribute('action') || '';
      if (!action || action.indexOf('REPLACE_') !== -1) {
        mailtoFallback(form);
        setStatus(form, resume
          ? 'Your email app should open. Please attach your resume to the email before sending.'
          : 'Your email app should open with your enquiry ready to send.', 'success');
        return;
      }

      setStatus(form, 'Sending...', '');
      fetch(action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        form.reset();
        setStatus(form, 'Thank you. We have received your message and will respond shortly.', 'success');
      }).catch(function () {
        setStatus(form, 'Something went wrong. Please email ' + CONTACT_EMAIL + ' instead.', 'error');
      });
    });
  });
})();
