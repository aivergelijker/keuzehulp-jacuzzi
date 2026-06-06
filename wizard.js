/* ============================================================================
   eSails.nl — Jacuzzi-Afdekzeil Keuzehulp  (wizard.js, v3 — Bootkap-huisstijl)
   ----------------------------------------------------------------------------
   Begeleide configurator met live meebewegende cover-visualisatie.
   Bouwt zichzelf volledig op in een mount-div, identiek aan de Bootkap-tool.

   PLAATSING (zoals Bootkap):
   1. Zet dit bestand als wizard.js in je GitHub-repo.
   2. CMS-pagina bevat ALLEEN:  <div id="ej-mount"></div>
   3. Custom JavaScript-veld:
      <script src="https://cdn.jsdelivr.net/gh/JOUW-USER/JOUW-REPO@main/wizard.js"></script>
   4. Vul de echte Lightspeed product-ID's + eenheidsprijzen in (zie CFG).

   CART: form-POST naar /cart met velden 'product' + 'quantity' via verborgen
   iframe — exact zoals de Bootkap-tool. Veiligheidscheck blokkeert toevoegen
   zolang er nog VARIANT_-placeholders in CONFIG staan.
   ============================================================================ */
(function(){
  "use strict";

  /* ========================= CFG — VUL DIT IN ========================= */
  var CART_ACTION = "/cart";   // Lightspeed C-Series: form-POST naar /cart
  var P = {
    pvc:       { id:"VARIANT_PVC",   naam:"Serge Ferrari 705 PVC",    sub:"Mat, 270 cm breed",     prijs:30.95, eenheid:"m" },
    lijm250:   { id:"VARIANT_L250",  naam:"Saba Contact 70T",         sub:"250 ml + kwast",        prijs:11.75, eenheid:"pot" },
    lijm1l:    { id:"VARIANT_L1L",   naam:"Saba Contact 70T",         sub:"1 liter",               prijs:34.95, eenheid:"bus" },
    loxx:      { id:"VARIANT_LOXX",  naam:"Loxx Snelkoppeling Set",   sub:"Koper-vernikkeld",      prijs:27.90, eenheid:"set" },
    stansblok: { id:"VARIANT_STANS", naam:"eSails Nylon Stansblok",   sub:"Beschermt gereedschap", prijs:26.99, eenheid:"st" },
    shockcord: { id:"VARIANT_SHOCK", naam:"Shockcord 6 mm",           sub:"Zwart elastiek",        prijs:0.83,  eenheid:"m" },
    cleaner:   { id:"VARIANT_CLEAN", naam:"Saba Clean 21",            sub:"Ontvetter, 1 L",        prijs:20.95, eenheid:"bus" },
    uv:        { id:"VARIANT_UV",    naam:"303 Aerospace Protectant", sub:"UV-blocker, 473 ml",    prijs:21.95, eenheid:"fl" }
  };
  var C = { doekbreedte_cm:270, rokhoogte_cm:20, zoom_marge:1.15, naadbreedte_cm:4,
            lijm_g_per_m2:350, pot250_g_max:250, loxx_per_cm:60 };
  var DOEKEN = [
    { key:"antraciet", naam:"Antraciet / Grijs",   hex:"#4a4d4f" },
    { key:"zwart",     naam:"Jet Black (Zwart)",   hex:"#1f2024" },
    { key:"blauw",     naam:"Navy Blue",           hex:"#1b2a4a" },
    { key:"groen",     naam:"Donkergroen",         hex:"#2f4034" },
    { key:"ecru",      naam:"Ecru / Hennep",       hex:"#e4ddc7" }
  ];
  /* ==================================================================== */

  /* ---- huisstijl-tokens (afgeleid van Bootkap-screenshots) ---- */
  var CSS = [
    "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');",
    "#ej-mount{",
    "  --bg:#ffffff; --surface:#ffffff; --panel:#fafafa;",
    "  --ink:#1c1d1f; --ink-soft:#6b6f76; --ink-mute:#9aa0a6;",
    "  --line:#e7e9ec; --line-soft:#f0f1f3;",
    "  --navy:#101830; --navy-d:#0a1020;",            /* donkermarine = primair accent */
    "  --sel:#1c1d1f;",                                /* zwarte selectierand */
    "  --orange:#e07b1a;",                             /* enige kleuraccent (badge) */
    "  --green:#1f5e3a;",                              /* 'toevoegen' bevestiging */
    "  --radius:14px; --radius-lg:18px;",
    "  --shadow:0 1px 2px rgba(20,25,40,.04);",
    "  --shadow-card:0 2px 14px -6px rgba(20,25,40,.12);",
    "  --ease:cubic-bezier(.4,0,.2,1);",
    "  font-family:'Inter',-apple-system,sans-serif; color:var(--ink); background:var(--bg);",
    "  max-width:1180px; margin:0 auto; -webkit-font-smoothing:antialiased; line-height:1.5;",
    "}",
    "#ej-mount *{box-sizing:border-box; margin:0;}",
    "#ej-mount h1,#ej-mount h2,#ej-mount h3{font-family:'Fraunces',serif; font-weight:500; letter-spacing:-.01em;}",

    /* outer card — exact Bootkap: gecentreerde witte kaart met dunne rand */
    ".ej-shell{border:1px solid var(--line); border-radius:22px; padding:clamp(28px,4vw,56px) clamp(24px,4vw,64px); box-shadow:var(--shadow-card); background:var(--surface);}",

    /* header */
    ".ej-head{text-align:center; margin-bottom:44px;}",
    ".ej-head h1{font-size:clamp(1.7rem,3.4vw,2.3rem); line-height:1.1;}",
    ".ej-head p{color:var(--ink-soft); margin-top:14px; font-size:1rem;}",

    /* progress bar (Bootkap-stijl: dunne lijn die vult, label eronder) */
    ".ej-prog{max-width:420px; margin:34px auto 0;}",
    ".ej-prog-track{height:3px; border-radius:3px; background:var(--line); overflow:hidden;}",
    ".ej-prog-fill{height:100%; background:var(--navy); border-radius:3px; transition:width .55s var(--ease);}",
    ".ej-prog-label{margin-top:18px; text-align:center; font-size:.72rem; letter-spacing:.16em; text-transform:uppercase; color:var(--ink-mute); font-weight:600;}",

    /* two-column layout */
    ".ej-grid{display:grid; grid-template-columns:1fr 1.1fr; gap:clamp(36px,5vw,72px); align-items:start; margin-top:48px;}",
    "@media(max-width:820px){.ej-grid{grid-template-columns:1fr; gap:40px;} .ej-stage{order:-1;}}",

    /* live preview stage */
    ".ej-stage{position:sticky; top:24px; background:var(--panel); border:1px solid var(--line); border-radius:var(--radius-lg); padding:36px 28px;}",
    ".ej-stage-label{font-size:.68rem; letter-spacing:.16em; text-transform:uppercase; color:var(--ink-mute); font-weight:600; text-align:center;}",
    ".ej-stage-title{font-family:'Fraunces',serif; font-size:1.1rem; text-align:center; margin-top:6px; margin-bottom:26px; color:var(--ink);}",
    ".ej-viz{display:flex; align-items:center; justify-content:center; min-height:220px; padding:8px;}",
    ".ej-readout{display:flex; gap:10px; margin-top:30px;}",
    ".ej-chip{flex:1; background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:14px 10px; text-align:center;}",
    ".ej-chip small{font-size:.7rem; color:var(--ink-mute); letter-spacing:.02em; display:block;}",
    ".ej-chip b{display:block; font-family:'Fraunces',serif; font-size:1.15rem; margin-top:5px; font-weight:500;}",

    /* panel + steps */
    ".ej-panel{min-height:340px;}",
    ".ej-step{display:none; animation:ejIn .45s var(--ease);}",
    ".ej-step.on{display:block;}",
    "@keyframes ejIn{from{opacity:0; transform:translateY(10px);} to{opacity:1; transform:none;}}",
    ".ej-q{font-size:1.4rem; margin-bottom:10px;}",
    ".ej-hint{color:var(--ink-soft); font-size:.95rem; margin-bottom:32px; line-height:1.55;}",

    /* selection cards — Bootkap: witte kaart, zwarte rand bij selectie */
    ".ej-cards{display:grid; gap:14px;}",
    ".ej-cards.two{grid-template-columns:1fr 1fr;}",
    "@media(max-width:520px){.ej-cards.two{grid-template-columns:1fr;}}",
    ".ej-card{background:var(--surface); border:1.5px solid var(--line); border-radius:var(--radius); padding:22px; cursor:pointer; transition:.2s var(--ease); position:relative; text-align:left;}",
    ".ej-card:hover{border-color:var(--ink-mute);}",
    ".ej-card.sel{border-color:var(--sel); border-width:2px; padding:21.5px; box-shadow:0 0 0 1px var(--sel);}",
    ".ej-card .ej-ic{width:38px; height:38px; margin-bottom:16px; color:var(--navy);}",
    ".ej-card .ej-ic svg{width:100%; height:100%; stroke:currentColor; fill:none; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round;}",
    ".ej-card b{display:block; font-size:1rem; font-weight:600; color:var(--ink);}",
    ".ej-card span{display:block; color:var(--ink-soft); font-size:.86rem; margin-top:6px; line-height:1.5;}",
    ".ej-badge{display:inline-block; font-size:.62rem; letter-spacing:.1em; text-transform:uppercase; font-weight:700; padding:5px 9px; border-radius:6px; margin-bottom:12px;}",
    ".ej-badge.navy{background:var(--navy); color:#fff;}",
    ".ej-badge.orange{background:var(--orange); color:#fff;}",

    /* dimension inputs */
    ".ej-fields{display:grid; grid-template-columns:1fr 1fr; gap:16px;}",
    ".ej-inp{background:var(--surface); border:1.5px solid var(--line); border-radius:var(--radius); padding:16px 18px; transition:.18s;}",
    ".ej-inp:focus-within{border-color:var(--navy);}",
    ".ej-inp label{display:block; font-size:.72rem; letter-spacing:.04em; text-transform:uppercase; color:var(--ink-soft); font-weight:600;}",
    ".ej-inp input{width:100%; border:none; background:none; font-size:1.4rem; font-family:'Fraunces',serif; color:var(--ink); outline:none; margin-top:6px;}",
    ".ej-inp input::-webkit-outer-spin-button,.ej-inp input::-webkit-inner-spin-button{-webkit-appearance:none;}",
    ".ej-radiushelp{grid-column:1/-1; background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:18px 20px; font-size:.86rem; color:var(--ink-soft); line-height:1.6; margin-top:4px;}",
    ".ej-radiushelp b{color:var(--ink);}",

    /* colour swatches — Bootkap kleurstap-stijl: kaart met cirkel + naam */
    ".ej-swatches{display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:14px;}",
    ".ej-sw{background:var(--surface); border:1.5px solid var(--line); border-radius:var(--radius); padding:24px 14px; cursor:pointer; transition:.2s var(--ease); text-align:center;}",
    ".ej-sw:hover{border-color:var(--ink-mute);}",
    ".ej-sw.sel{border-color:var(--sel); border-width:2px; padding:23.5px 13.5px; box-shadow:0 0 0 1px var(--sel);}",
    ".ej-sw .dot{width:52px; height:52px; border-radius:50%; margin:0 auto 14px; border:1px solid rgba(0,0,0,.08); box-shadow:inset 0 -2px 5px rgba(0,0,0,.12);}",
    ".ej-sw small{font-size:.84rem; font-weight:500; color:var(--ink);}",

    /* sub-option highlight box (zoals 'Bijpassend garen' bij Bootkap) */
    ".ej-addon{display:flex; align-items:center; justify-content:space-between; gap:18px; background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:20px 22px; margin-top:28px;}",
    ".ej-addon-txt b{font-size:.95rem; font-weight:600;}",
    ".ej-addon-txt span{display:block; color:var(--ink-soft); font-size:.84rem; margin-top:3px;}",
    ".ej-addon-btn{flex:none; border:none; border-radius:10px; padding:11px 18px; font-family:'Inter'; font-size:.85rem; font-weight:600; cursor:pointer; transition:.2s; background:var(--green); color:#fff; white-space:nowrap;}",
    ".ej-addon-btn.off{background:var(--surface); color:var(--ink-soft); border:1.5px solid var(--line);}",
    ".ej-addon-btn .ck{margin-right:6px;}",

    /* nav */
    ".ej-nav{display:flex; justify-content:space-between; align-items:center; margin-top:44px; padding-top:28px; border-top:1px solid var(--line-soft); gap:14px;}",
    ".ej-btn{border:none; border-radius:12px; padding:15px 30px; font-family:'Inter'; font-size:.95rem; font-weight:600; cursor:pointer; transition:.2s var(--ease);}",
    ".ej-btn.prev{background:var(--surface); border:1.5px solid var(--line); color:var(--ink);}",
    ".ej-btn.prev:hover{border-color:var(--ink-mute);}",
    ".ej-btn.next{background:var(--navy); color:#fff;}",
    ".ej-btn.next:hover{background:var(--navy-d);}",
    ".ej-btn.next:disabled{background:#c7cad0; cursor:not-allowed;}",

    /* BOM result */
    ".ej-bom{border:1px solid var(--line); border-radius:var(--radius-lg); overflow:hidden;}",
    ".ej-bom-row{display:grid; grid-template-columns:auto 1fr auto auto; gap:16px; align-items:center; padding:18px 22px; border-bottom:1px solid var(--line-soft); transition:.2s;}",
    ".ej-bom-row:last-of-type{border-bottom:none;}",
    ".ej-bom-row.off{opacity:.42;}",
    ".ej-toggle{width:44px; height:26px; border-radius:50px; background:var(--line); position:relative; cursor:pointer; transition:.25s; flex:none;}",
    ".ej-toggle.on{background:var(--navy);}",
    ".ej-toggle:after{content:''; position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:50%; background:#fff; transition:.25s var(--ease); box-shadow:0 1px 3px rgba(0,0,0,.2);}",
    ".ej-toggle.on:after{transform:translateX(18px);}",
    ".ej-bom-name b{font-weight:600; font-size:.95rem;}",
    ".ej-bom-name span{display:block; color:var(--ink-soft); font-size:.8rem; margin-top:2px;}",
    ".ej-bom-qty{font-size:.85rem; color:var(--ink-soft); white-space:nowrap;}",
    ".ej-bom-price{font-family:'Fraunces',serif; font-size:1.05rem; white-space:nowrap; font-variant-numeric:tabular-nums;}",
    ".ej-bom-foot{display:flex; justify-content:space-between; align-items:center; padding:22px; background:var(--panel);}",
    ".ej-bom-foot .lbl{font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-soft);}",
    ".ej-bom-foot .tot{font-family:'Fraunces',serif; font-size:1.8rem; font-weight:500;}",
    ".ej-cta{width:100%; background:var(--navy); color:#fff; border:none; border-radius:12px; padding:19px; font-family:'Inter'; font-size:1.05rem; font-weight:700; cursor:pointer; margin-top:22px; transition:.2s var(--ease);}",
    ".ej-cta:hover{background:var(--navy-d);}",
    ".ej-trust{display:flex; gap:22px; flex-wrap:wrap; justify-content:center; margin-top:24px; font-size:.82rem; color:var(--ink-soft);}",
    ".ej-trust span:before{content:'✓'; color:var(--green); font-weight:700; margin-right:6px;}",
    ".ej-fallback{text-align:center; font-size:.8rem; color:var(--ink-mute); margin-top:18px;}",
    ".ej-fallback a{color:var(--navy); text-decoration:none;}",
    ".ej-fallback a:hover{text-decoration:underline;}",
    ".ej-restart{display:block; margin:26px auto 0; background:none; border:none; color:var(--ink-soft); font-size:.85rem; cursor:pointer; text-decoration:underline;}"
  ].join("\n");

  /* ---- state ---- */
  var S = { step:0, type:null, L:200, B:200, R:30, doek:"antraciet",
            verwerking:null, bevestiging:null, onderhoud:[] };
  var STEPS = ["Project","Afmetingen","Kleurstelling","Verwerking","Bevestiging","Klaar"];
  var mount;
  function euro(n){ return "\u20ac\u00a0"+n.toFixed(2).replace(".",","); }
  function ic(p){ return "<svg viewBox='0 0 24 24'><path d='"+p+"'/></svg>"; }
  var ICONS = {
    herbekleden:"M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 17l9 4 9-4",
    nieuw:"M12 3v18M3 12h18",
    lijmen:"M4 7h16v4a6 6 0 01-12 0M9 7V4h6v3",
    stikken:"M4 12h16M7 8l-3 4 3 4M17 8l3 4-3 4",
    loxx:"M12 2a5 5 0 015 5v3H7V7a5 5 0 015-5zM5 10h14v11H5z",
    shockcord:"M4 12c4-6 12-6 16 0M4 12c4 6 12 6 16 0"
  };

  /* ---- rekenmodule ---- */
  function bereken(){
    var L=S.L, B=S.B, R=S.R, PI=Math.PI;
    var A_dek=((L*B)-(4*R*R)+(PI*R*R))/10000;
    var omtrek=2*(L+B)-8*R+2*PI*R;
    var A_rok=(omtrek*C.rokhoogte_cm)/10000;
    var pvc=((A_dek+A_rok)*C.zoom_marge)/(C.doekbreedte_cm/100); pvc=Math.ceil(pvc*2)/2;
    var lijm_g=((omtrek*2*C.naadbreedte_cm)/10000)*C.lijm_g_per_m2;
    var loxx=Math.max(4, 2*Math.ceil(L/C.loxx_per_cm)+2*Math.ceil(B/C.loxx_per_cm)-4);
    var shock=Math.ceil((omtrek/100)*1.1);
    return {A_dek:A_dek, omtrek:omtrek, pvc:pvc, lijm_g:lijm_g, loxx:loxx, shock:shock};
  }
  function bouwBOM(){
    var r=bereken(), it=[];
    function add(p,q,c){ it.push({id:p.id,naam:p.naam,sub:p.sub,eenheid:p.eenheid,prijs:p.prijs,qty:q,checked:c,totaal:p.prijs*q}); }
    add(P.pvc, r.pvc, true);
    if(S.verwerking==="lijmen"){ if(r.lijm_g<=C.pot250_g_max) add(P.lijm250,1,true); else add(P.lijm1l,Math.ceil(r.lijm_g/1000),true); }
    if(S.bevestiging==="loxx"){ add(P.loxx,r.loxx,true); add(P.stansblok,1,true); }
    else if(S.bevestiging==="shockcord"){ add(P.shockcord,r.shock,true); }
    if(S.onderhoud.indexOf("cleaner")>=0) add(P.cleaner,1,false);
    if(S.onderhoud.indexOf("uv")>=0) add(P.uv,1,false);
    return it;
  }

  /* ---- live cover-visualisatie ---- */
  function coverSVG(){
    var L=S.L, B=S.B, R=S.R, max=Math.max(L,B,1), scale=150/max;
    var w=L*scale, h=B*scale, r=Math.min(R*scale, w/2, h/2);
    var cx=110-w/2, cy=110-h/2;
    var d=DOEKEN.filter(function(x){return x.key===S.doek;})[0]||DOEKEN[0];
    var hex=d.hex;
    return "<svg viewBox='0 0 220 220' style='width:100%;max-width:300px;'>"+
      "<defs>"+
        "<linearGradient id='ejTop' x1='0' y1='0' x2='1' y2='1'>"+
          "<stop offset='0' stop-color='"+hex+"'/>"+
          "<stop offset='1' stop-color='"+hex+"' stop-opacity='.85'/>"+
        "</linearGradient>"+
        "<filter id='ejSh' x='-25%' y='-25%' width='150%' height='150%'>"+
          "<feDropShadow dx='0' dy='7' stdDeviation='8' flood-color='#0a1020' flood-opacity='.18'/>"+
        "</filter>"+
      "</defs>"+
      "<ellipse cx='110' cy='"+(cy+h+15)+"' rx='"+(w/2*.9)+"' ry='9' fill='#000' opacity='.06'/>"+
      "<rect x='"+cx+"' y='"+cy+"' width='"+w+"' height='"+h+"' rx='"+r+"' ry='"+r+"' fill='url(#ejTop)' filter='url(#ejSh)' style='transition:all .45s cubic-bezier(.4,0,.2,1);'/>"+
      "<rect x='"+(cx+6)+"' y='"+(cy+6)+"' width='"+Math.max(w-12,2)+"' height='"+Math.max(h-12,2)+"' rx='"+Math.max(r-5,0)+"' fill='none' stroke='#fff' stroke-opacity='.13' stroke-width='1.5' style='transition:all .45s cubic-bezier(.4,0,.2,1);'/>"+
      "<line x1='110' y1='"+(cy+5)+"' x2='110' y2='"+(cy+h-5)+"' stroke='#fff' stroke-opacity='.09' stroke-width='1'/>"+
    "</svg>";
  }
  function renderStage(){
    var r=bereken();
    var body=mount.querySelector("#ej-stage-body");
    if(!body) return;
    body.innerHTML = coverSVG();
    var ro=mount.querySelector("#ej-readout");
    if(ro) ro.innerHTML =
      "<div class='ej-chip'><small>Dek-oppervlak</small><b>"+r.A_dek.toFixed(2)+" m\u00b2</b></div>"+
      "<div class='ej-chip'><small>PVC nodig</small><b>"+r.pvc.toFixed(1)+" m</b></div>"+
      "<div class='ej-chip'><small>Omtrek</small><b>"+(r.omtrek/100).toFixed(2)+" m</b></div>";
  }

  /* ---- card helper: bepaalt zelf de selectie-staat per groep ---- */
  function isSel(group,val){
    if(group==="type") return S.type===val;
    if(group==="verwerking") return S.verwerking===val;
    if(group==="bevestiging") return S.bevestiging===val;
    if(group==="ond") return S.onderhoud.indexOf(val)>=0;
    return false;
  }
  function card(group,val,title,sub,icon,badge){
    var sel = isSel(group,val);
    var b = badge ? "<span class='ej-badge "+badge.cls+"'>"+badge.txt+"</span>" : "";
    return "<div class='ej-card"+(sel?" sel":"")+"' data-group='"+group+"' data-val='"+val+"'>"+
      b+"<div class='ej-ic'>"+ic(icon)+"</div>"+
      "<b>"+title+"</b><span>"+sub+"</span></div>";
  }
  function field(k,label,val){
    return "<div class='ej-inp'><label>"+label+"</label>"+
      "<input type='number' inputmode='numeric' data-dim='"+k+"' value='"+(val||"")+"' placeholder='0'></div>";
  }

  /* ---- render ---- */
  function render(){
    var pct = (S.step/(STEPS.length-1))*100;
    mount.innerHTML =
      "<div class='ej-shell'>"+
        "<div class='ej-head'>"+
          "<h1>Jacuzzi-Afdekzeil Keuzehulp</h1>"+
          "<p>Stel in een paar stappen jouw ideale materiaalpakket samen</p>"+
          "<div class='ej-prog'><div class='ej-prog-track'><div class='ej-prog-fill' style='width:"+pct+"%'></div></div>"+
          "<div class='ej-prog-label'>Stap "+(S.step+1)+" van "+STEPS.length+": "+STEPS[S.step]+"</div></div>"+
        "</div>"+
        "<div class='ej-grid'>"+
          "<div class='ej-stage'>"+
            "<div class='ej-stage-label'>Live preview</div>"+
            "<div class='ej-stage-title' id='ej-stage-title'>Jouw cover</div>"+
            "<div class='ej-viz' id='ej-stage-body'></div>"+
            "<div class='ej-readout' id='ej-readout'></div>"+
          "</div>"+
          "<div class='ej-panel' id='ej-panel'></div>"+
        "</div>"+
      "</div>";

    renderStage();
    var panel=mount.querySelector("#ej-panel");
    var title=mount.querySelector("#ej-stage-title");

    if(S.step===0){
      title.textContent="Jouw project";
      panel.innerHTML=wrap("Wat ga je doen?","Hergebruik je de bestaande schuimkern, of maak je een losse beschermhoes?",
        "<div class='ej-cards two'>"+
          card("type","herbekleden","Herbekleden","Oude cover redden en de schuimkern hergebruiken.",ICONS.herbekleden)+
          card("type","nieuw","Nieuwe beschermhoes","Een losse over-hoes maken ter bescherming.",ICONS.nieuw)+
        "</div>", S.type!=null);
    }
    else if(S.step===1){
      title.textContent="Afmetingen";
      panel.innerHTML=wrap("Maten van je jacuzzi","Voer de maten in centimeters in. De preview links beweegt direct mee.",
        "<div class='ej-fields'>"+
          field("L","Lengte (cm)",S.L)+field("B","Breedte (cm)",S.B)+field("R","Hoekradius (cm)",S.R)+
          "<div class='ej-inp' style='display:flex;align-items:center;justify-content:center;background:var(--panel);border-style:dashed;'>"+
            "<span style='font-size:.82rem;color:var(--ink-soft);text-align:center;'>De radius bepaalt<br>de ronding \u2196</span></div>"+
          "<div class='ej-radiushelp'><b>Radius meten:</b> leg twee rechte latten haaks tegen de zijkanten van de jacuzzi. De afstand van hun virtuele kruispunt tot waar de rand begint te buigen, is je hoekradius.</div>"+
        "</div>", true);
    }
    else if(S.step===2){
      title.textContent="Doekkleur";
      var sw=""; DOEKEN.forEach(function(d){
        sw+="<div class='ej-sw"+(S.doek===d.key?" sel":"")+"' data-doek='"+d.key+"'>"+
          "<div class='dot' style='background:"+d.hex+"'></div><small>"+d.naam+"</small></div>";
      });
      panel.innerHTML=wrap("Kies de gewenste kleur","Serge Ferrari 705 in mat. De preview toont je keuze direct. Alle kleuren zijn even sterk.",
        "<div class='ej-swatches'>"+sw+"</div>", true);
    }
    else if(S.step===3){
      title.textContent="Verwerking";
      panel.innerHTML=wrap("Kies de verwerkingswijze","Koudlassen met Saba 70T is 100% waterdicht en vereist geen naaimachine.",
        "<div class='ej-cards two'>"+
          card("verwerking","lijmen","Koudlassen (Saba 70T)","Waterdicht, geen naaimachine nodig.",ICONS.lijmen,{cls:"navy",txt:"Aanbevolen"})+
          card("verwerking","stikken","Stikken","Met een jeansnaald op een normale naaimachine.",ICONS.stikken)+
        "</div>", S.verwerking!=null);
    }
    else if(S.step===4){
      title.textContent="Windverankering";
      panel.innerHTML=wrap("Hoe veranker je de cover?","Voorkom dat de cover bij wind losraakt.",
        "<div class='ej-cards two'>"+
          card("bevestiging","loxx","Loxx Quick-Release","Snelkoppelingen die nooit uit zichzelf loswaaien.",ICONS.loxx)+
          card("bevestiging","shockcord","Zeilringen + shockcord","Elastisch koord om de hoes strak op te spannen.",ICONS.shockcord)+
        "</div>"+
        "<div class='ej-addon'><div class='ej-addon-txt'><b>Saba Clean 21 toevoegen?</b><span>Ontvet het PVC voor maximale lijmhechting. Aanbevolen bij koudlassen.</span></div>"+
          "<button class='ej-addon-btn"+(S.onderhoud.indexOf("cleaner")>=0?"":" off")+"' data-addon='cleaner'>"+(S.onderhoud.indexOf("cleaner")>=0?"<span class='ck'>\u2713</span>Toegevoegd":"Toevoegen")+"</button></div>"+
        "<div class='ej-addon'><div class='ej-addon-txt'><b>303 Protectant toevoegen?</b><span>UV-blocker die de levensduur verlengt en vuil afstoot.</span></div>"+
          "<button class='ej-addon-btn"+(S.onderhoud.indexOf("uv")>=0?"":" off")+"' data-addon='uv'>"+(S.onderhoud.indexOf("uv")>=0?"<span class='ck'>\u2713</span>Toegevoegd":"Toevoegen")+"</button></div>",
        S.bevestiging!=null);
    }
    else if(S.step===5){ renderResult(panel,title); return; }

    bind();
  }

  function wrap(q,hint,body,canNext){
    var nextLabel = (S.step===4) ? "Bekijk pakket \u2192" : "Volgende \u2192";
    return "<div class='ej-step on'>"+
      "<h2 class='ej-q'>"+q+"</h2><p class='ej-hint'>"+hint+"</p>"+body+
      "<div class='ej-nav'>"+
        (S.step>0 ? "<button class='ej-btn prev' data-prev>Vorige</button>" : "<span></span>")+
        "<button class='ej-btn next' data-next"+(canNext?"":" disabled")+">"+nextLabel+"</button>"+
      "</div></div>";
  }

  /* ---- result / BOM ---- */
  function renderResult(panel,title){
    title.textContent="Compleet pakket";
    var items=bouwBOM(), rows="", tot=0;
    items.forEach(function(it,i){
      if(it.checked) tot+=it.totaal;
      rows+="<div class='ej-bom-row"+(it.checked?"":" off")+"' data-i='"+i+"'>"+
        "<div class='ej-toggle"+(it.checked?" on":"")+"' data-toggle='"+i+"'></div>"+
        "<div class='ej-bom-name'><b>"+it.naam+"</b><span>"+it.sub+"</span></div>"+
        "<div class='ej-bom-qty'>"+it.qty+" "+it.eenheid+"</div>"+
        "<div class='ej-bom-price'>"+euro(it.totaal)+"</div></div>";
    });
    panel.innerHTML="<div class='ej-step on'>"+
      "<h2 class='ej-q'>Jouw materiaallijst</h2>"+
      "<p class='ej-hint'>Op maat berekend voor "+S.L+"\u00d7"+S.B+" cm, hoekradius "+S.R+" cm. Schakel items aan of uit.</p>"+
      "<div class='ej-bom'>"+rows+
        "<div class='ej-bom-foot'><span class='lbl'>Totaal incl. btw</span><span class='tot' id='ej-tot'>"+euro(tot)+"</span></div></div>"+
      "<button class='ej-cta' id='ej-cta'>Voeg complete set toe aan winkelwagen</button>"+
      "<div class='ej-fallback' id='ej-fb'></div>"+
      "<div class='ej-trust'><span>Voor 15:00 besteld, vandaag verzonden</span><span>Gratis verzending vanaf \u20ac75</span><span>9,5/10 op Kiyoh</span><span>Klarna achteraf betalen</span></div>"+
      "<button class='ej-restart' data-restart>Opnieuw beginnen</button>"+
    "</div>";

    panel.querySelectorAll("[data-toggle]").forEach(function(t){
      t.onclick=function(){
        var i=+t.dataset.toggle; items[i].checked=!items[i].checked;
        t.classList.toggle("on"); t.closest(".ej-bom-row").classList.toggle("off");
        var s=0; items.forEach(function(x){ if(x.checked) s+=x.totaal; });
        panel.querySelector("#ej-tot").textContent=euro(s); fb(items,panel);
      };
    });
    panel.querySelector("#ej-cta").onclick=function(){ addToCart(items); };
    panel.querySelector("[data-restart]").onclick=function(){ S.step=0; S.verwerking=null; S.bevestiging=null; S.onderhoud=[]; render(); };
    fb(items,panel);
  }
  function fb(items,panel){
    var links=items.filter(function(i){return i.checked;}).map(function(i){
      var u=CART_ACTION+"?product="+encodeURIComponent(i.id)+"&quantity="+i.qty;
      return "<a href='"+u+"'>"+i.qty+" "+i.eenheid+" "+i.naam+"</a>";
    }).join(" \u00b7 ");
    panel.querySelector("#ej-fb").innerHTML="Werkt de knop niet? Voeg los toe: "+links;
  }

  /* ---- cart: form-POST naar /cart via verborgen iframe (zoals Bootkap) ---- */
  function addToCart(items){
    var sel=items.filter(function(i){return i.checked;});
    if(!sel.length){ alert("Selecteer minimaal \u00e9\u00e9n product."); return; }
    if(sel.some(function(i){return /^VARIANT_/.test(i.id);})){
      alert("Nog niet alle product-ID's zijn ingevuld in de CONFIG. Vul de echte Lightspeed-ID's in voordat je live gaat."); return;
    }
    var frame=document.getElementById("ej-cartframe");
    if(!frame){ frame=document.createElement("iframe"); frame.id="ej-cartframe"; frame.name="ej-cartframe"; frame.style.display="none"; document.body.appendChild(frame); }
    function post(id,qty,target){
      var f=document.createElement("form"); f.method="POST"; f.action=CART_ACTION; f.target=target;
      f.innerHTML="<input name='product' value='"+id+"'><input name='quantity' value='"+qty+"'>";
      document.body.appendChild(f); f.submit(); f.parentNode.removeChild(f);
    }
    var i=0;
    function step(){
      if(i<sel.length-1){ post(sel[i].id, sel[i].qty, "ej-cartframe"); i++; setTimeout(step,500); }
      else { post(sel[i].id, sel[i].qty, "_self"); }  // laatste: zichtbaar naar winkelwagen
    }
    step();
  }

  /* ---- events ---- */
  function bind(){
    mount.querySelectorAll(".ej-card[data-group]").forEach(function(c){
      c.onclick=function(){
        var g=c.dataset.group, v=c.dataset.val;
        if(g==="type") S.type=v;
        else if(g==="verwerking") S.verwerking=v;
        else if(g==="bevestiging") S.bevestiging=v;
        render();
      };
    });
    mount.querySelectorAll(".ej-sw[data-doek]").forEach(function(s){
      s.onclick=function(){ S.doek=s.dataset.doek; render(); };
    });
    mount.querySelectorAll("[data-addon]").forEach(function(b){
      b.onclick=function(){
        var v=b.dataset.addon, idx=S.onderhoud.indexOf(v);
        if(idx>=0) S.onderhoud.splice(idx,1); else S.onderhoud.push(v);
        render();
      };
    });
    mount.querySelectorAll("input[data-dim]").forEach(function(inp){
      inp.oninput=function(){ S[inp.dataset.dim]=+inp.value||0; renderStage(); };
    });
    var nx=mount.querySelector("[data-next]");
    if(nx) nx.onclick=function(){
      if(S.step===1 && (!S.L||!S.B)){ alert("Vul lengte en breedte in."); return; }
      S.step++; render();
    };
    var pv=mount.querySelector("[data-prev]");
    if(pv) pv.onclick=function(){ S.step--; render(); };
  }

  /* ---- init ---- */
  function init(){
    mount=document.getElementById("ej-mount");
    if(!mount || mount.getAttribute("data-ej-init")==="1"){ return; }
    mount.setAttribute("data-ej-init","1");
    var style=document.createElement("style"); style.textContent=CSS; document.head.appendChild(style);
    render();
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded", init);
    window.addEventListener("load", init);   // vangnet als DOMContentLoaded gemist wordt
  } else {
    init();
  }
})();
