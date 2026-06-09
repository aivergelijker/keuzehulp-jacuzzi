/* =====================================================================
   eSails Jacuzzi-Afdekzeil Keuzehulp  -  wizard.js  (v4)
   ---------------------------------------------------------------------
   Volledig in de Bootkap-huisstijl: dezelfde esails-* classes, dezelfde
   systeemfont, hetzelfde kleurenpalet (--esails-* tokens) en hetzelfde
   init-/cart-patroon. Gebruikt de gedeelde Bootkap-CSS — neem die CSS
   over op de pagina, plus de kleine aanvulling onderaan dit bestand
   (.esails-preview-*) voor de live cover-visualisatie.

   MOUNT: <div id="esails-jacuzzi-mount"></div>  (eigen id — botst niet met Bootkap)
   CART : form-POST naar /cart (product + quantity) via verborgen iframe.

   TE DOEN: vervang elke "ID_..." en placeholder-prijs door de echte
   Lightspeed product-ID's en prijzen in CONFIG hieronder.
   ===================================================================== */
window.esailsJacuzziWizard = (function () {
  "use strict";

  var DOEK_BREEDTE_CM = 270;   // Serge Ferrari 705 doekbreedte

  /* -------------------- CONFIGURATIE -------------------- */
  var CONFIG = {
    doek: {
      antraciet: { id: "284515327", naam: "Serge Ferrari 705 — Antraciet # 1074", prijs: 30.95, unit: "meter" },
      zwart:     { id: "274126768", naam: "Serge Ferrari 705 — Zwart # 1075", prijs: 30.95, unit: "meter" },
      blauw:     { id: "274126759", naam: "Serge Ferrari 705 — Kobaltblauw # 1050", prijs: 30.95, unit: "meter" },
      groen:     { id: "289467471", naam: "Serge Ferrari 705 — Mosgroen # 1054", prijs: 30.95, unit: "meter" },
      ecru:      { id: "289467416", naam: "Serge Ferrari 705 — Ivoor # 1076", prijs: 30.95, unit: "meter" }
    },
    lijm: {
      pot250: { id: "282388634", naam: "Saba lijm — 250 ml met kwast", prijs: 11.75, unit: "stuk" },
      bus1l:  { id: "253895183",  naam: "Saba lijm — 1 liter", prijs: 32.99, unit: "stuk" }
    },
    cleaner:   { id: "253891984", naam: "Saba reiniger/ontvetter — 1 liter", prijs: 20.95, unit: "stuk" },
    loxx:      { id: "265509411",  naam: "Loxx snelsluiting — set", prijs: 27.90, unit: "set" },
    stansblok: { id: "299203891", naam: "Nylon stansblok (slagonderlegger)", prijs: 16.95, unit: "stuk" },
    shockcord: { id: "259527665", naam: "Shockcord 6 mm — zwart", prijs: 0.83, unit: "meter" },
    uv:        { id: "252696446",    naam: "303 UV-beschermer — 473 ml", prijs: 24.95, unit: "stuk" }
  };

  /* Rekenconstanten — finetune hier zonder de logica te raken */
  var REKEN = {
    rokhoogte_cm: 20,
    zoom_marge: 1.15,
    naadbreedte_cm: 4,
    lijm_g_per_m2: 350,
    pot250_g_max: 250,
    loxx_per_cm: 60
  };

  var DOEKEN = [
    { key: "antraciet", naam: "Antraciet / Grijs", hex: "#4a4d4f" },
    { key: "zwart",     naam: "Jet Black (Zwart)", hex: "#1f2024" },
    { key: "blauw",     naam: "Navy Blue",         hex: "#1b2a4a" },
    { key: "groen",     naam: "Donkergroen",       hex: "#2f4034" },
    { key: "ecru",      naam: "Ecru / Hennep",     hex: "#e4ddc7" }
  ];

  var TOTAL_INPUT_STEPS = 5;
  var RESULT_STEP = 6;

  /* -------------------- STATE -------------------- */
  var state;
  function resetState() {
    state = {
      currentStep: 1,
      project: null,         // 'herbekleden' | 'nieuw'
      lengte: 200,           // cm
      breedte: 200,          // cm
      radius: 30,            // cm
      kleur: "antraciet",
      verwerking: null,      // 'lijmen' | 'stikken'
      bevestiging: null,     // 'loxx' | 'shockcord'
      wil_cleaner: false,
      wil_uv: false,
      bundle: {}
    };
  }

  /* -------------------- HELPERS -------------------- */
  var root;
  function $(id) { return document.getElementById(id); }
  function money(n) { return n.toFixed(2).replace('.', ','); }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* -------------------- REKENMODULE -------------------- */
  function bereken() {
    var L = state.lengte, B = state.breedte, R = state.radius, PI = Math.PI;
    var A_dek = ((L * B) - (4 * R * R) + (PI * R * R)) / 10000;       // m²
    var omtrek = 2 * (L + B) - 8 * R + 2 * PI * R;                    // cm
    var A_rok = (omtrek * REKEN.rokhoogte_cm) / 10000;               // m²
    var pvc = ((A_dek + A_rok) * REKEN.zoom_marge) / (DOEK_BREEDTE_CM / 100);
    pvc = Math.ceil(pvc * 2) / 2;                                     // halve meter
    var lijm_g = ((omtrek * 2 * REKEN.naadbreedte_cm) / 10000) * REKEN.lijm_g_per_m2;
    var loxx = Math.max(4, 2 * Math.ceil(L / REKEN.loxx_per_cm) + 2 * Math.ceil(B / REKEN.loxx_per_cm) - 4);
    var shock = Math.ceil((omtrek / 100) * 1.1);
    return { A_dek: A_dek, omtrek: omtrek, pvc: pvc, lijm_g: lijm_g, loxx: loxx, shock: shock };
  }

  /* -------------------- HTML-TEMPLATE -------------------- */
  function wizardHTML() {
    return '' +
    '<div class="esails-wizard-header">' +
      '<h2>Jacuzzi-Afdekzeil Keuzehulp</h2>' +
      '<p>Stel in een paar stappen jouw ideale materiaalpakket samen</p>' +
      '<div class="esails-progress-wrapper"><div class="esails-progress-bar" id="ejProgressBar" style="width:20%;"></div></div>' +
      '<div class="esails-step-indicator" id="ejStepIndicator">Stap 1 van 5: Project</div>' +
    '</div>' +

    /* LIVE PREVIEW — boven de stappen, volle breedte */
    '<div class="esails-preview" id="ejPreview">' +
      '<div class="esails-preview-label">Live preview</div>' +
      '<div class="esails-preview-canvas" id="ejPreviewCanvas"></div>' +
      '<div class="esails-preview-stats" id="ejPreviewStats"></div>' +
    '</div>' +

    /* STAP 1 — Project */
    '<div class="esails-wizard-step active" data-step="1">' +
      '<h3>Wat ga je doen?</h3>' +
      '<p class="esails-step-subtitle">Hergebruik je de bestaande schuimkern, of maak je een losse beschermhoes?</p>' +
      '<div class="esails-card-grid esails-grid-2">' +
        card('project','herbekleden','♻️','Herbekleden','Je oude cover redden en de schuimkern hergebruiken.') +
        card('project','nieuw','✨','Nieuwe beschermhoes','Een losse over-hoes maken ter bescherming van de jacuzzi.') +
      '</div>' +
    '</div>' +

    /* STAP 2 — Afmetingen */
    '<div class="esails-wizard-step" data-step="2">' +
      '<h3>Wat zijn de maten van je jacuzzi?</h3>' +
      '<p class="esails-step-subtitle">In centimeters. De preview hierboven beweegt direct mee terwijl je sleept.</p>' +
      sliderHTML('lengte','Lengte','cm',100,400,5) +
      sliderHTML('breedte','Breedte','cm',100,400,5) +
      sliderHTML('radius','Hoekradius','cm',0,80,1) +
      '<p class="esails-help-note"><strong>Hoekradius meten:</strong> leg twee rechte latten haaks tegen de zijkanten. ' +
        'De afstand van hun kruispunt tot waar de rand begint te buigen, is je radius. Bij een rechthoekige bak is de radius 0.</p>' +
    '</div>' +

    /* STAP 3 — Kleur */
    '<div class="esails-wizard-step" data-step="3">' +
      '<h3>Kies de kleur van het doek</h3>' +
      '<p class="esails-step-subtitle">Serge Ferrari 705 in mat. De preview toont je keuze direct. Alle kleuren zijn even sterk.</p>' +
      '<div class="esails-color-grid" id="ejColorGrid">' + kleurKaarten() + '</div>' +
    '</div>' +

    /* STAP 4 — Verwerking */
    '<div class="esails-wizard-step" data-step="4">' +
      '<h3>Hoe wil je het doek verwerken?</h3>' +
      '<p class="esails-step-subtitle">Lijmen is volledig waterdicht en je hebt er geen naaimachine voor nodig.</p>' +
      '<div class="esails-card-grid esails-grid-2">' +
        cardBadge('verwerking','lijmen','🧪','Lijmen (koudlassen)','Naden worden met Saba-lijm waterdicht aan elkaar gezet. Geen naaimachine nodig.','Makkelijkst','navy') +
        card('verwerking','stikken','🪡','Stikken','Met een jeansnaald op een normale naaimachine. Vraagt wat naai-ervaring.') +
      '</div>' +
    '</div>' +

    /* STAP 5 — Bevestiging + onderhoud */
    '<div class="esails-wizard-step" data-step="5">' +
      '<h3>Hoe maak je de cover windvast?</h3>' +
      '<p class="esails-step-subtitle">Voorkom dat de hoes bij wind losraakt.</p>' +
      '<div class="esails-card-grid esails-grid-2">' +
        card('bevestiging','loxx','🔘','Loxx snelsluitingen','Zelfborgende druksluitingen die nooit uit zichzelf loswaaien.') +
        card('bevestiging','shockcord','🔗','Zeilringen + shockcord','Elastisch koord om de hoes strak op te spannen.') +
      '</div>' +
      '<div class="esails-garen-keuze">' +
        '<div class="esails-garen-info"><strong>Saba reiniger/ontvetter toevoegen?</strong>' +
          '<span>Ontvet het doek vóór het lijmen voor een maximale hechting. Aanbevolen bij lijmen.</span></div>' +
        '<button type="button" class="esails-pill esails-toggle-off" data-toggle="wil_cleaner" id="ejToggleCleaner">Toevoegen</button>' +
      '</div>' +
      '<div class="esails-garen-keuze">' +
        '<div class="esails-garen-info"><strong>303 UV-beschermer toevoegen?</strong>' +
          '<span>Verlengt de levensduur van het doek en stoot vuil en water af.</span></div>' +
        '<button type="button" class="esails-pill esails-toggle-off" data-toggle="wil_uv" id="ejToggleUv">Toevoegen</button>' +
      '</div>' +
    '</div>' +

    /* STAP 6 — Resultaat */
    '<div class="esails-wizard-step" data-step="6">' +
      '<div class="esails-success-banner">' +
        '<h3>✓ Jouw materiaallijst is klaar!</h3>' +
        '<p>Op basis van je keuzes hebben we het pakket op maat berekend. Pas de aantallen vrij aan met de plus- en minknoppen.</p>' +
      '</div>' +
      '<div class="esails-configuration-board">' +
        '<div class="esails-board-header"><span>Onderdeel</span><span style="text-align:right;">Aantal / Prijs</span></div>' +
        '<div id="ejDynamicLines"></div>' +
        '<div class="esails-board-footer">' +
          '<div class="esails-total-price">Totaalprijs pakket: <span id="ejTotalAmount">€ 0,00</span></div>' +
          '<button type="button" class="esails-btn-submit" id="ejBtnAddToCart">' +
            '<span class="btn-text">Voeg complete pakket toe aan winkelwagen</span>' +
            '<div class="esails-loader" style="display:none;"></div>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="esails-wizard-navigation" id="ejNav">' +
      '<button type="button" class="esails-btn esails-btn-secondary" id="ejBtnPrev" disabled>Vorige</button>' +
      '<button type="button" class="esails-btn esails-btn-primary" id="ejBtnNext" disabled>Volgende</button>' +
    '</div>';
  }

  /* ---------- card-helpers (Bootkap-idioom) ---------- */
  function card(group, val, icon, titel, oms) {
    return '<div class="esails-selection-card" data-group="' + group + '" data-value="' + val + '">' +
      '<span class="esails-badge esails-badge-placeholder">x</span>' +
      '<div class="esails-card-icon">' + icon + '</div>' +
      '<h4>' + titel + '</h4><p>' + oms + '</p></div>';
  }
  function cardBadge(group, val, icon, titel, oms, badgeText, badgeType) {
    var badgeCls = (badgeType === 'budget') ? 'esails-badge esails-badge-budget' : 'esails-badge';
    return '<div class="esails-selection-card" data-group="' + group + '" data-value="' + val + '">' +
      '<span class="' + badgeCls + '">' + badgeText + '</span>' +
      '<div class="esails-card-icon">' + icon + '</div>' +
      '<h4>' + titel + '</h4><p>' + oms + '</p></div>';
  }
  function kleurKaarten() {
    var h = '';
    for (var i = 0; i < DOEKEN.length; i++) {
      var d = DOEKEN[i];
      h += '<div class="esails-color-card" data-group="kleur" data-value="' + d.key + '">' +
        '<div class="esails-color-swatch" style="background:' + d.hex + ';"></div>' +
        '<span>' + d.naam + '</span></div>';
    }
    return h;
  }
  function sliderHTML(key, label, unit, min, max, step) {
    return '<div class="esails-slider-wrapper">' +
      '<label>' + label + ': <span id="ejVal_' + key + '">' + state[key] + '</span> ' + unit + '</label>' +
      '<input type="range" id="ejSlider_' + key + '" data-slider="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + state[key] + '">' +
    '</div>';
  }

  /* -------------------- PREVIEW (live cover) -------------------- */
  function coverSVG() {
    var L = state.lengte, B = state.breedte, R = state.radius;
    var max = Math.max(L, B, 1), sc = 150 / max;
    var w = L * sc, h = B * sc, r = Math.min(R * sc, w / 2, h / 2);
    var cx = 110 - w / 2, cy = 110 - h / 2;
    var d = DOEKEN.filter(function (x) { return x.key === state.kleur; })[0] || DOEKEN[0];
    var ease = 'transition:all .4s ease;';
    return '<svg viewBox="0 0 220 220" width="100%" style="max-width:320px;display:block;margin:0 auto;">' +
      '<defs><filter id="ejShadow" x="-25%" y="-25%" width="150%" height="150%">' +
      '<feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#0f1c3f" flood-opacity="0.18"/></filter></defs>' +
      '<ellipse cx="110" cy="' + (cy + h + 15) + '" rx="' + (w / 2 * 0.9) + '" ry="9" fill="#000" opacity="0.06"/>' +
      '<rect x="' + cx + '" y="' + cy + '" width="' + w + '" height="' + h + '" rx="' + r + '" ry="' + r + '" fill="' + d.hex + '" filter="url(#ejShadow)" style="' + ease + '"/>' +
      '<rect x="' + (cx + 6) + '" y="' + (cy + 6) + '" width="' + Math.max(w - 12, 2) + '" height="' + Math.max(h - 12, 2) + '" rx="' + Math.max(r - 5, 0) + '" fill="none" stroke="#fff" stroke-opacity="0.14" stroke-width="1.5" style="' + ease + '"/>' +
      '<line x1="110" y1="' + (cy + 5) + '" x2="110" y2="' + (cy + h - 5) + '" stroke="#fff" stroke-opacity="0.09" stroke-width="1"/>' +
    '</svg>';
  }
  function renderPreview() {
    var canvas = $('ejPreviewCanvas'); if (!canvas) return;
    canvas.innerHTML = coverSVG();
    var r = bereken();
    var stats = $('ejPreviewStats');
    if (stats) stats.innerHTML =
      '<div class="esails-stat"><small>Dek-oppervlak</small><strong>' + r.A_dek.toFixed(2) + ' m²</strong></div>' +
      '<div class="esails-stat"><small>Doek nodig</small><strong>' + r.pvc.toFixed(1) + ' m</strong></div>' +
      '<div class="esails-stat"><small>Omtrek</small><strong>' + (r.omtrek / 100).toFixed(2) + ' m</strong></div>';
  }

  /* -------------------- BUNDLE (materiaallijst) -------------------- */
  function bouwBundle() {
    var r = bereken();
    var doek = CONFIG.doek[state.kleur] || CONFIG.doek.antraciet;
    var b = {};
    b.doek = { id: doek.id, naam: doek.naam, notitie: 'Mat, 270 cm breed · per strekkende meter', prijs: doek.prijs, qty: r.pvc, unit: 'm', step: 0.5 };
    if (state.verwerking === 'lijmen') {
      if (r.lijm_g <= REKEN.pot250_g_max) {
        b.lijm = { id: CONFIG.lijm.pot250.id, naam: CONFIG.lijm.pot250.naam, notitie: 'Voor het waterdicht lijmen van de naden', prijs: CONFIG.lijm.pot250.prijs, qty: 1, unit: 'st', step: 1 };
      } else {
        b.lijm = { id: CONFIG.lijm.bus1l.id, naam: CONFIG.lijm.bus1l.naam, notitie: 'Voor het waterdicht lijmen van de naden', prijs: CONFIG.lijm.bus1l.prijs, qty: Math.ceil(r.lijm_g / 1000), unit: 'st', step: 1 };
      }
    }
    if (state.bevestiging === 'loxx') {
      b.loxx = { id: CONFIG.loxx.id, naam: CONFIG.loxx.naam, notitie: 'Zelfborgende windvaste sluitingen', prijs: CONFIG.loxx.prijs, qty: r.loxx, unit: 'set', step: 1 };
      b.stansblok = { id: CONFIG.stansblok.id, naam: CONFIG.stansblok.naam, notitie: 'Voor het aanbrengen van de sluitingen', prijs: CONFIG.stansblok.prijs, qty: 1, unit: 'st', step: 1 };
    } else if (state.bevestiging === 'shockcord') {
      b.shockcord = { id: CONFIG.shockcord.id, naam: CONFIG.shockcord.naam, notitie: 'Elastisch opspannen langs de onderrand', prijs: CONFIG.shockcord.prijs, qty: r.shock, unit: 'm', step: 1 };
    }
    if (state.wil_cleaner) b.cleaner = { id: CONFIG.cleaner.id, naam: CONFIG.cleaner.naam, notitie: 'Ontvet het doek vóór het lijmen', prijs: CONFIG.cleaner.prijs, qty: 1, unit: 'st', step: 1 };
    if (state.wil_uv) b.uv = { id: CONFIG.uv.id, naam: CONFIG.uv.naam, notitie: 'Verlengt de levensduur, stoot vuil af', prijs: CONFIG.uv.prijs, qty: 1, unit: 'st', step: 1 };
    state.bundle = b;
  }

  function renderLines() {
    bouwBundle();
    var container = $('ejDynamicLines'); if (!container) return;
    var html = '';
    Object.keys(state.bundle).forEach(function (key) {
      var item = state.bundle[key];
      var lineTotal = item.qty * item.prijs;
      html += '<div class="esails-line-item" id="ej-line-' + key + '">' +
        '<div class="esails-line-info"><h5>' + esc(item.naam) + '</h5><p>' + esc(item.notitie) + '</p></div>' +
        '<div class="esails-line-controls">' +
          '<div class="esails-counter">' +
            '<button type="button" data-item-key="' + key + '" data-delta="-1">−</button>' +
            '<input type="text" value="' + formatQty(item) + '" readonly>' +
            '<button type="button" data-item-key="' + key + '" data-delta="1">+</button>' +
          '</div>' +
          '<div class="esails-line-price" id="ej-price-' + key + '">€ ' + money(lineTotal) + '</div>' +
        '</div></div>';
    });
    container.innerHTML = html;
    calcTotal();
  }
  function formatQty(item) {
    if (item.unit === 'm') return item.qty.toFixed(1) + ' m';
    if (item.unit === 'set') return item.qty + ' set';
    return String(item.qty);
  }
  function adjustQty(key, deltaSign) {
    if (!state.bundle[key]) return;
    var item = state.bundle[key];
    var q = item.qty + deltaSign * (item.step || 1);
    q = Math.round(q * 2) / 2;
    if (q < 0) q = 0;
    item.qty = q;
    var line = $('ej-line-' + key);
    if (line) {
      var input = line.querySelector('input');
      if (input) input.value = formatQty(item);
      var priceEl = $('ej-price-' + key);
      if (priceEl) priceEl.innerText = '€ ' + money(q * item.prijs);
    }
    calcTotal();
  }
  function calcTotal() {
    var total = 0;
    Object.keys(state.bundle).forEach(function (key) {
      total += state.bundle[key].qty * state.bundle[key].prijs;
    });
    var el = $('ejTotalAmount');
    if (el) el.innerText = '€ ' + money(total);
  }

  /* -------------------- NAVIGATIE / VALIDATIE -------------------- */
  var STAP_NAMEN = ['Project', 'Afmetingen', 'Kleurstelling', 'Verwerking', 'Bevestiging', 'Klaar'];
  function stapCompleet(stap) {
    if (stap === 1) return !!state.project;
    if (stap === 2) return state.lengte > 0 && state.breedte > 0;
    if (stap === 3) return !!state.kleur;
    if (stap === 4) return !!state.verwerking;
    if (stap === 5) return !!state.bevestiging;
    return true;
  }
  function toonStap(stap) {
    var steps = root.querySelectorAll('.esails-wizard-step');
    for (var i = 0; i < steps.length; i++) {
      steps[i].classList.toggle('active', parseInt(steps[i].getAttribute('data-step'), 10) === stap);
    }
    var pct = (stap / TOTAL_INPUT_STEPS) * 100; if (pct > 100) pct = 100;
    var bar = $('ejProgressBar'); if (bar) bar.style.width = pct + '%';
    var ind = $('ejStepIndicator');
    if (ind) ind.innerText = (stap <= TOTAL_INPUT_STEPS)
      ? ('Stap ' + stap + ' van ' + TOTAL_INPUT_STEPS + ': ' + STAP_NAMEN[stap - 1])
      : 'Jouw materiaallijst';

    var prev = $('ejBtnPrev'), next = $('ejBtnNext');
    prev.disabled = (stap === 1);
    if (stap === RESULT_STEP) {
      next.style.display = 'none';
    } else {
      next.style.display = '';
      next.disabled = !stapCompleet(stap);
      next.innerText = (stap === TOTAL_INPUT_STEPS) ? 'Bekijk pakket →' : 'Volgende';
    }
    var prevBox = $('ejPreview');
    if (prevBox) prevBox.style.display = (stap === RESULT_STEP) ? 'none' : '';
    if (stap === RESULT_STEP) renderLines();
  }
  function ga(naarStap) {
    if (naarStap < 1) naarStap = 1;
    if (naarStap > RESULT_STEP) naarStap = RESULT_STEP;
    state.currentStep = naarStap;
    toonStap(naarStap);
  }

  /* -------------------- EVENTS -------------------- */
  function bindEvents() {
    root.addEventListener('click', function (e) {
      var selCard = e.target.closest('.esails-selection-card, .esails-color-card');
      if (selCard && root.contains(selCard)) {
        var group = selCard.getAttribute('data-group');
        var value = selCard.getAttribute('data-value');
        state[group] = value;
        var siblings = root.querySelectorAll('[data-group="' + group + '"]');
        for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove('selected');
        selCard.classList.add('selected');
        if (group === 'kleur') renderPreview();
        $('ejBtnNext').disabled = !stapCompleet(state.currentStep);
        return;
      }
      var toggle = e.target.closest('[data-toggle]');
      if (toggle) {
        var k = toggle.getAttribute('data-toggle');
        state[k] = !state[k];
        toggle.classList.toggle('active', state[k]);
        toggle.classList.toggle('esails-toggle-off', !state[k]);
        toggle.innerHTML = state[k] ? '<span class="esails-check">✓</span> Toegevoegd' : 'Toevoegen';
        return;
      }
      var counterBtn = e.target.closest('.esails-counter button');
      if (counterBtn) {
        adjustQty(counterBtn.getAttribute('data-item-key'), parseInt(counterBtn.getAttribute('data-delta'), 10));
        return;
      }
      if (e.target.closest('#ejBtnNext')) { if (!$('ejBtnNext').disabled) ga(state.currentStep + 1); return; }
      if (e.target.closest('#ejBtnPrev')) { ga(state.currentStep - 1); return; }
      if (e.target.closest('#ejBtnAddToCart')) { addToCart(); return; }
    });

    root.addEventListener('input', function (e) {
      var slider = e.target.closest('[data-slider]');
      if (slider) {
        var key = slider.getAttribute('data-slider');
        state[key] = parseInt(slider.value, 10) || 0;
        var valEl = $('ejVal_' + key);
        if (valEl) valEl.innerText = state[key];
        renderPreview();
        $('ejBtnNext').disabled = !stapCompleet(state.currentStep);
      }
    });
  }

  /* -------------------- CART (zoals Bootkap) -------------------- */
  function addToCart() {
    var keys = Object.keys(state.bundle).filter(function (k) { return state.bundle[k].qty > 0; });
    if (!keys.length) { alert('Voeg minimaal één product toe.'); return; }
    var placeholder = keys.some(function (k) { return /^ID_/.test(state.bundle[k].id); });
    if (placeholder) {
      alert('Let op: er staan nog placeholder product-ID\'s in de configuratie. Vul de echte Lightspeed-ID\'s in voordat je live gaat.');
      return;
    }
    var btn = $('ejBtnAddToCart');
    var txt = btn.querySelector('.btn-text'), loader = btn.querySelector('.esails-loader');
    btn.disabled = true; if (txt) txt.style.display = 'none'; if (loader) loader.style.display = 'inline-block';

    var iframe = ensureFrame();
    var i = 0;
    function addNext() {
      if (i >= keys.length) { window.location.href = '/cart'; return; }
      var item = state.bundle[keys[i]]; i++;
      postOne(iframe, item.id, Math.ceil(item.qty), addNext);  // Lightspeed verwacht hele aantallen
    }
    addNext();
  }
  function ensureFrame() {
    var iframe = document.getElementById('ejCartFrame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'ejCartFrame'; iframe.name = 'ejCartFrame';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }
    return iframe;
  }
  function postOne(iframe, productId, quantity, onDone) {
    var form = document.createElement('form');
    form.method = 'POST'; form.action = '/cart'; form.target = 'ejCartFrame'; form.style.display = 'none';
    form.appendChild(hidden('product', productId));
    form.appendChild(hidden('quantity', quantity));
    document.body.appendChild(form);
    var done = false;
    function finish() {
      if (done) return; done = true;
      iframe.removeEventListener('load', finish);
      if (form.parentNode) form.parentNode.removeChild(form);
      onDone();
    }
    iframe.addEventListener('load', finish);
    form.submit();
    setTimeout(finish, 1500);
  }
  function hidden(name, value) {
    var input = document.createElement('input');
    input.type = 'hidden'; input.name = name; input.value = value;
    return input;
  }

  /* -------------------- INIT -------------------- */
  function init() {
    root = $('esails-jacuzzi-mount');
    if (!root) return false;
    if (root.getAttribute('data-ej-init') === '1') return true;
    root.setAttribute('data-ej-init', '1');
    injectPreviewCSS();
    resetState();
    root.innerHTML = wizardHTML();
    bindEvents();
    var kleurCard = root.querySelector('[data-group="kleur"][data-value="' + state.kleur + '"]');
    if (kleurCard) kleurCard.classList.add('selected');
    renderPreview();
    toonStap(1);
    return true;
  }

  /* Kleine CSS-aanvulling voor de live preview — sluit aan op de --esails-* tokens.
     De rest van de styling komt uit de gedeelde Bootkap-CSS. */
  function injectPreviewCSS() {
    if (document.getElementById('ejPreviewCSS')) return;
    var css =
      /* De jacuzzi-mount heeft een eigen id en valt dus buiten de Bootkap-selector
         #esails-wizard-mount. Daarom hier dezelfde container-basis + box-sizing reset,
         zodat de tool er identiek uitziet zonder de gedeelde CSS aan te passen. */
      '#esails-jacuzzi-mount,#esails-jacuzzi-mount *{box-sizing:border-box;}' +
      '#esails-jacuzzi-mount{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:block;max-width:900px;margin:40px auto;padding:30px;background:#ffffff;border:1px solid var(--esails-border,#e2e2e2);border-radius:var(--esails-radius,8px);color:var(--esails-dark,#111);box-shadow:0 4px 20px rgba(0,0,0,0.02);}' +
      '.esails-preview{background:var(--esails-light);border:1px solid var(--esails-border);border-radius:var(--esails-radius);padding:32px 24px;margin-bottom:40px;}' +
      '.esails-preview-label{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--esails-muted);font-weight:600;text-align:center;margin-bottom:20px;}' +
      '.esails-preview-canvas{display:flex;justify-content:center;align-items:center;min-height:200px;}' +
      '.esails-preview-stats{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:28px;}' +
      '.esails-stat{flex:1;min-width:120px;max-width:170px;background:#fff;border:1px solid var(--esails-border);border-radius:var(--esails-radius);padding:14px 10px;text-align:center;}' +
      '.esails-stat small{display:block;font-size:12px;color:var(--esails-muted);}' +
      '.esails-stat strong{display:block;font-size:18px;font-weight:600;margin-top:6px;color:var(--esails-dark);}' +
      '.esails-help-note{background:var(--esails-light);border:1px solid var(--esails-border);border-radius:var(--esails-radius);padding:16px 20px;font-size:13.5px;color:var(--esails-muted);line-height:1.6;max-width:600px;margin:8px auto 0;}' +
      '.esails-help-note strong{color:var(--esails-dark);}';
    var style = document.createElement('style');
    style.id = 'ejPreviewCSS'; style.textContent = css;
    document.head.appendChild(style);
  }

  return { init: init };
})();

(function () {
  function start() {
    if (window.esailsJacuzziWizard.init()) return;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
    window.addEventListener('load', start);
  } else {
    start();
  }
})();
