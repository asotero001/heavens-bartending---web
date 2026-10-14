(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.remove('no-js');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Pitch banner ---------- */
  var pitch = $('#pitch');
  function sizePitch() {
    if (pitch && !pitch.hidden) {
      document.body.classList.add('has-pitch');
      document.body.style.setProperty('--pitch-real', pitch.offsetHeight + 'px');
    } else {
      document.body.classList.remove('has-pitch');
    }
  }
  if (store.get('lr-pitch') === 'off' && pitch) pitch.hidden = true;
  $$('[data-dismiss-pitch]').forEach(function (b) {
    b.addEventListener('click', function () { pitch.hidden = true; store.set('lr-pitch', 'off'); sizePitch(); });
  });
  sizePitch();
  window.addEventListener('resize', sizePitch);

  /* ---------- Photo slots: swap in real photos when present ---------- */
  $$('.ph[data-img]').forEach(function (fig) {
    var img = new Image();
    img.alt = fig.getAttribute('data-alt') || '';
    img.decoding = 'async';
    img.onload = function () { fig.appendChild(img); fig.classList.add('has-photo'); };
    img.src = fig.getAttribute('data-img');
  });

  /* ---------- Nav ---------- */
  var nav = $('#nav');
  var dock = $('.dock');
  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle('is-solid', y > 40);
    if (dock) dock.classList.toggle('is-on', y > window.innerHeight * 0.6);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var burger = $('.burger');
  var drawer = $('#drawer');
  function setDrawer(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    drawer.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) nav.classList.add('is-solid'); else onScroll();
  }
  burger.addEventListener('click', function () { setDrawer(drawer.hidden); });
  $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) setDrawer(false); });

  // Active section highlight
  var links = $$('.nav__links a');
  if ('IntersectionObserver' in window) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (l) { var s = $(l.getAttribute('href')); if (s) secObs.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var rObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); rObs.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      rObs.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Signature rail ---------- */
  var rail = $('#rail');
  $$('[data-scroll]').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = $('.dish', rail);
      var step = card ? card.getBoundingClientRect().width + 24 : 360;
      rail.scrollBy({ left: step * Number(b.getAttribute('data-scroll')), behavior: 'smooth' });
    });
  });

  /* ---------- Menu tabs (WAI-ARIA tabs pattern) ---------- */
  var tabs = $$('[role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });

  /* ---------- Open now (Hialeah time) ---------- */
  function hialeahNow() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: days[o.weekday], mins: (Number(o.hour) % 24) * 60 + Number(o.minute) };
  }
  // Minutes from midnight; late nights run past 24:00
  function closeFor(day) { return day >= 4 && day <= 6 ? 25 * 60 : 22 * 60; }
  var OPEN = 11 * 60 + 30;
  function status() {
    var n = hialeahNow();
    var yesterday = (n.day + 6) % 7;
    if (n.mins < closeFor(yesterday) - 24 * 60) return { open: true, until: '1 AM', day: n.day };
    if (n.mins >= OPEN && n.mins < closeFor(n.day)) return { open: true, until: closeFor(n.day) > 1440 ? '1 AM' : '10 PM', day: n.day };
    return { open: false, day: n.day, before: n.mins < OPEN };
  }
  var lang = 'en';
  function paintOpen() {
    var s = status();
    var dot = $('#openDot');
    var label = $('#openNow');
    dot.classList.toggle('is-open', s.open);
    if (lang === 'es') label.textContent = s.open ? 'Abierto hasta las ' + s.until : (s.before ? 'Abrimos hoy 11:30 AM' : 'Cerrado · abrimos 11:30 AM');
    else label.textContent = s.open ? 'Open now · until ' + s.until : (s.before ? 'Opens today 11:30 AM' : 'Closed · opens 11:30 AM');
    $$('#hoursBody tr').forEach(function (tr) {
      tr.classList.toggle('is-today', tr.getAttribute('data-days').split(',').indexOf(String(s.day)) > -1);
    });
  }
  paintOpen();
  setInterval(paintOpen, 60000);

  /* ---------- Language toggle ---------- */
  var ES = {
    'nav.story': 'Historia', 'nav.menu': 'Menú', 'nav.lounge': 'Privato Lounge', 'nav.events': 'Eventos', 'nav.visit': 'Visítanos',
    'cta.reserve': 'Reservar', 'cta.reserveTable': 'Reservar Mesa', 'cta.viewMenu': 'Ver el Menú',
    'hero.eyebrow': 'Amelia District · Hialeah', 'hero.t1': 'Roma', 'hero.t2': 'conoce', 'hero.t3': 'La Habana.',
    'hero.lede': 'Cocina cubano-italiana y lounge hasta tarde. Pasta hecha en casa, pizza fina con acento habanero y una cava de 80 vinos, bajo un mural de Roma.',
    'hero.live': 'Jazz y trova en vivo', 'hero.weekends': 'Fines de semana',
    'story.eyebrow': 'Nuestra Historia', 'story.title': 'Dos capitales,<br><em>una mesa.</em>',
    'story.p1': 'La Romanita es el primer restaurante de Prestige Hospitality Group, en el corazón del Amelia District de Hialeah. La idea es simple y personal: la mesa italiana con la que soñaban nuestros abuelos, cocinada con los sabores cubanos con los que crecimos.',
    'story.p2': 'El Chef Ejecutivo Reinier "Rey" Mendez nació en La Habana, donde empezó dirigiendo una pizzería. Después vinieron STK Miami, Shula\'s Steakhouse, Casa Tua Cucina y Lure Fish Bar. Aquí lo trae a casa: vaca frita sobre masa crujiente, rabo en el risotto, guayaba en las torrejas.',
    'story.quote': '“Técnica italiana, alma cubana. Cada plato debe sentirse como un domingo en casa de abuela, pero saber a una noche en Roma.”',
    'stats.wine': 'Botellas en la carta de vinos', 'stats.seats': 'Puestos en el salón', 'stats.patio': 'En la terraza', 'stats.late': 'Hasta tarde, jueves a sábado',
    'sig.eyebrow': 'Le Firme · Especialidades', 'sig.title': 'Los platos por los que la gente <em>cruza Miami.</em>',
    'menu.eyebrow': 'Il Menù', 'menu.title': 'Cocinado en Hialeah, <em>soñado en Roma.</em>',
    'cta.pdf': 'Descargar Menú', 'cta.order': 'Ordenar en Línea',
    'lounge.eyebrow': 'Privato Lounge', 'lounge.title': 'Cuando se recogen los platos, <em>empieza la noche.</em>',
    'lounge.p': 'Luz baja, una barra larga y música en vivo el fin de semana. La trova cubana se alterna con el jazz mientras la cocina sigue abierta pasada la medianoche.',
    'cta.lounge': 'Reservar en el Lounge', 'gallery.title': 'Un lugar para <em>vestirse bien.</em>', 'cta.ig': 'Síguenos en Instagram',
    'praise.eyebrow': 'En la Prensa',
    'events.eyebrow': 'Eventos Privados', 'events.title': 'Quinceañeras, cenas de ensayo, <em>la familia entera.</em>',
    'events.p': 'Reserva el Privato Lounge, la terraza o el restaurante completo. Nuestro equipo arma el menú, el maridaje y la música alrededor de tu noche.',
    'events.form': 'Planifica tu evento', 'cta.send': 'Enviar Solicitud',
    'reserve.eyebrow': 'Prenota · Reservaciones', 'reserve.title': 'Tu mesa <em>te espera.</em>', 'cta.findTable': 'Buscar Mesa',
    'visit.eyebrow': 'Vieni a Trovarci · Visítanos', 'visit.title': 'En el corazón del <em>Amelia District.</em>',
    'order.label': 'Ordena para recoger o a domicilio', 'news.label': 'La Lettera: menús, noches de música y primicias.'
  };
  var EN = {};
  $$('[data-i18n]').forEach(function (el) { EN[el.getAttribute('data-i18n')] = el.textContent; });
  $$('[data-i18n-html]').forEach(function (el) { EN[el.getAttribute('data-i18n-html')] = el.innerHTML; });

  function setLang(l) {
    lang = l;
    var dict = l === 'es' ? ES : EN;
    doc.lang = l;
    $$('[data-i18n]').forEach(function (el) { var k = el.getAttribute('data-i18n'); if (dict[k] != null) el.textContent = dict[k]; });
    $$('[data-i18n-html]').forEach(function (el) { var k = el.getAttribute('data-i18n-html'); if (dict[k] != null) el.innerHTML = dict[k]; });
    $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === l)); });
    paintOpen();
    store.set('lr-lang', l);
  }
  $$('[data-lang]').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); }); });
  if (store.get('lr-lang') === 'es') setLang('es');

  /* ---------- Reservation mock ---------- */
  var resDate = $('#resDate');
  var today = new Date();
  var iso = function (d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  resDate.min = iso(today);
  resDate.value = iso(today);
  var slots = $('#slots');
  $('#booker').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!resDate.value) { resDate.focus(); return; }
    var seed = resDate.value.split('-').reduce(function (a, b) { return a + Number(b); }, 0) + $('#party').selectedIndex;
    var times = ['5:30', '6:00', '6:30', '7:00', '7:30', '8:00', '8:30', '9:00', '9:30'];
    slots.innerHTML = '';
    times.forEach(function (t, i) {
      if ((seed + i * 7) % 4 === 0) return; // some slots taken
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = t + ' PM';
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        $$('button', slots).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        var c = $('.confirm', slots) || slots.appendChild(document.createElement('p'));
        c.className = 'confirm';
        var d = new Date(resDate.value + 'T12:00:00');
        var when = d.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        c.textContent = (lang === 'es' ? 'Mesa para ' : 'Table for ') + $('#party').value.replace(/ guests?/, '') + ' · ' + when + ' · ' + t + ' PM';
      });
      slots.appendChild(b);
    });
  });

  /* ---------- Forms (mock submit) ---------- */
  function mockForm(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      $$('input,select,textarea', form).forEach(function (f) {
        var ok = f.checkValidity();
        f.setAttribute('aria-invalid', String(!ok));
        if (!ok && !bad) bad = f;
      });
      if (bad) { bad.focus(); return; }
      $('.form__ok', form).hidden = false;
      form.reset();
    });
  }
  mockForm($('#eventForm'));
  mockForm($('#news'));

  $('#yr').textContent = new Date().getFullYear();
})();
