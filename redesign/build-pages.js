/* ============================================================
   Page generator for Minibus Taxi Service
   Produces one self-contained .html per location + service, reusing the
   exact <style>, SVG sprite, header and footer from index.html so every
   page shares identical styling. Re-run any time: `node build-pages.js`.
   ============================================================ */
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const src = fs.readFileSync(path.join(DIR, "index.html"), "utf8");

/* ---- Extract shared chunks from index.html (single source of truth) ---- */
function between(str, startRe, endRe) {
  const s = str.search(startRe);
  if (s < 0) throw new Error("start not found: " + startRe);
  const from = str.slice(s);
  const e = from.search(endRe);
  if (e < 0) throw new Error("end not found: " + endRe);
  return from.slice(0, e + from.match(endRe)[0].length);
}

const STYLE  = between(src, /<style>/, /<\/style>/);           // full <style>…</style>
const SPRITE = between(src, /<svg width="0" height="0"/, /<\/svg>/); // SVG symbol defs
const HEADER = between(src, /<header class="hdr"/, /<\/header>/);
const FOOTER = between(src, /<footer class="ftr"/, /<\/footer>/);
const CALLBAR = between(src, /<div class="callbar"/, /<\/div>\s*<script>/).replace(/<script>[\s\S]*$/, "");

/* The header/footer link with in-page anchors on index; rewrite to real pages. */
function localizeNav(html) {
  return html
    .replace(/href="#fares"/g, 'href="index.html#fares"')
    .replace(/href="#fleet"/g, 'href="index.html#fleet"')
    .replace(/href="#services"/g, 'href="index.html#services"')
    .replace(/href="#coverage"/g, 'href="index.html#coverage"')
    .replace(/href="#book"/g, 'href="index.html#book"')
    .replace(/href="#top"/g, 'href="index.html"');
}
const HEAD_HTML = localizeNav(HEADER);
const FOOT_HTML = localizeNav(FOOTER);
const BAR_HTML  = localizeNav(CALLBAR);

/* ---- Data ---- */
const AIRPORTS = ["Heathrow","Gatwick","Luton","Stansted","London City","Birmingham","Southampton","Bristol"];

/* Per-vehicle door-open hero, Cotswold hotel forecourt. car = "e" | "s" | "v" */
const HERO_IMG = {
  e: { src:"hero-e-class.jpg", alt:"Black Mercedes E-Class saloon parked outside a Cotswold country house hotel with a rear door open, revealing a cream leather interior." },
  s: { src:"hero-s-class.jpg", alt:"Black Mercedes S-Class limousine parked outside a Cotswold country house hotel with a rear door open, revealing a cream leather interior." },
  v: { src:"hero-v-class.jpg", alt:"Black Mercedes V-Class minibus parked outside a Cotswold country house hotel with its side door open, revealing a cream quilted leather interior." },
};
function heroMedia(car) {
  const h = HERO_IMG[car] || HERO_IMG.v;
  return `<div class="page-hero__media">
    <img src="assets/${h.src}" width="1600" height="900" fetchpriority="high" decoding="async" alt="${h.alt}">
  </div>
  <div class="page-hero__scrim"></div>`;
}

// [E-Class, S-Class, V-Class(8)] one-way £, per airport in AIRPORTS order
const FARES = {
  oxford:            { name:"Oxford",              rows:[[115,150,150],[170,230,230],[145,180,180],[190,265,265],[195,260,260],[150,190,190],[175,230,230],[185,220,220]] },
  "chipping-norton": { name:"Chipping Norton",     rows:[[175,220,220],[225,270,270],[190,250,250],[240,290,290],[250,300,300],[185,245,245],[180,240,240],[200,270,270]] },
  witney:            { name:"Witney",              rows:[[135,180,180],[190,235,235],[170,210,210],[215,260,260],[205,250,250],[170,235,235],[180,245,245],[190,250,250]] },
  charlbury:         { name:"Charlbury",           rows:[[150,200,200],[195,255,255],[160,210,210],[200,255,255],[220,255,255],[150,200,200],[145,170,170],[185,250,250]] },
  woodstock:         { name:"Woodstock",           rows:[[165,195,210],[235,250,270],[160,220,220],[230,285,285],[235,285,285],[155,200,200],[170,220,220],[210,260,260]] },
  abingdon:          { name:"Abingdon",            rows:[[120,160,160],[185,225,225],[165,225,225],[210,255,255],[210,250,250],[170,220,220],[180,235,235],[200,240,240]] },
  didcot:            { name:"Didcot",              rows:[[130,175,175],[185,240,240],[150,195,195],[200,250,250],[210,270,270],[180,240,240],[160,210,210],[195,250,250]] },
  burford:           { name:"Burford",             rows:[[165,195,260],[195,235,300],[175,215,270],[270,295,295],[275,300,300],[170,230,250],[175,200,220],[180,225,260]] },
  stow:              { name:"Stow-on-the-Wold",    rows:[[260,280,335],[300,300,350],[230,250,320],[300,320,370],[300,310,350],[170,200,235],[210,260,280],[230,300,325]] },
};

// Slug -> filename mapping for the locations
const LOC_SLUGS = {
  oxford:"oxford", "chipping-norton":"chipping-norton", witney:"witney", charlbury:"charlbury",
  woodstock:"woodstock", abingdon:"abingdon", didcot:"didcot", burford:"burford", stow:"stow-on-the-wold",
};

const gbp = n => "£" + n.toLocaleString("en-GB");
const minOf = r => Math.min(r[0], r[1], r[2]);

/* ---- Page shell ---- */
function shell({ title, desc, body }) {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500;6..96,600;6..96,700&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
${STYLE}
<style>
/* Sub-page specifics */
.page-hero{position:relative; padding-block:clamp(7rem,14vw,9rem) clamp(3rem,6vw,4.5rem); background:var(--ink); color:#fff; overflow:hidden; isolation:isolate}
.page-hero__media{position:absolute; inset:0; z-index:-2}
.page-hero__media img{width:100%; height:100%; object-fit:cover; object-position:center 55%}
.page-hero__scrim{position:absolute; inset:0; z-index:-1;
  background:linear-gradient(96deg, rgba(12,10,9,.92) 0%, rgba(12,10,9,.74) 42%, rgba(12,10,9,.32) 70%, rgba(12,10,9,.5) 100%),
    linear-gradient(180deg, rgba(12,10,9,.5) 0%, transparent 30%, transparent 65%, rgba(12,10,9,.7) 100%)}
.page-hero h1{font-size:clamp(2.2rem,5vw,3.6rem); max-width:20ch; text-shadow:0 2px 24px rgba(12,10,9,.5)}
.page-hero h1 em{font-style:italic; color:var(--gold-soft)}
.page-hero .lead{margin-top:var(--space-3); max-width:56ch; color:rgba(255,255,255,.85); font-weight:300; font-size:1.1rem; line-height:1.7}
.page-hero .actions{display:flex; flex-wrap:wrap; gap:var(--space-2); margin-top:var(--space-4)}
.crumb{display:flex; gap:.5rem; align-items:center; font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--stone-400); margin-bottom:var(--space-3)}
.crumb a{color:var(--gold-bright)}
.prose{max-width:68ch}
.prose p{margin-top:var(--space-2); color:var(--ink-600); line-height:1.8}
.two-col{display:grid; grid-template-columns:1.3fr .7fr; gap:clamp(2rem,5vw,4rem); align-items:start}
@media (max-width:900px){.two-col{grid-template-columns:1fr}}
.aside-card{padding:var(--space-3); background:var(--ink); color:#fff; border-radius:var(--radius-lg)}
.aside-card h3{font-size:1.2rem; margin-bottom:var(--space-2)}
.aside-card .row{display:flex; align-items:center; gap:.75rem; padding:.55rem 0; font-size:.95rem; color:var(--stone-300)}
.aside-card .row .ico{width:18px; height:18px; color:var(--gold-bright); flex:none}
.aside-card .row a{color:#fff}
.related{display:flex; flex-wrap:wrap; gap:.6rem; margin-top:var(--space-3)}
/* Fleet page rows */
.fleet-row{display:grid; grid-template-columns:1.1fr .9fr; gap:clamp(1.5rem,4vw,3.5rem); align-items:center; padding-block:clamp(2rem,4vw,3rem)}
.fleet-row + .fleet-row{border-top:1px solid var(--border)}
.fleet-row--rev .fleet-row__media{order:2}
.fleet-row__media{aspect-ratio:16/9; background:#fff; border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden}
.fleet-row__media video{width:100%; height:100%; object-fit:contain}
.fleet-row__name{font-size:clamp(1.8rem,3.4vw,2.6rem); color:var(--ink); margin-top:.3rem}
.fleet-row__desc{margin-top:var(--space-2); color:var(--ink-600); font-size:1.05rem; line-height:1.75; max-width:46ch}
.fleet-row__foot{display:flex; align-items:baseline; justify-content:space-between; gap:var(--space-2); max-width:26rem; margin-top:var(--space-3); padding-top:var(--space-2); border-top:1px solid var(--border)}
@media (max-width:820px){
  .fleet-row{grid-template-columns:1fr; gap:var(--space-3)}
  .fleet-row--rev .fleet-row__media{order:0}
}
.related a{padding:.5rem 1rem; border:1px solid var(--border); border-radius:999px; font-size:.86rem; color:var(--ink-700); transition:border-color var(--dur) var(--ease), color var(--dur) var(--ease)}
.related a:hover{border-color:var(--ink); color:var(--gold)}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to main content</a>
${SPRITE}
${HEAD_HTML}
<main id="main">
${body}
</main>
${FOOT_HTML}
${BAR_HTML}
<script>
(function(){
  // Sticky header + mobile menu + dropdowns (shared minimal behaviour)
  var hdr=document.getElementById("hdr");
  addEventListener("scroll",function(){hdr.classList.toggle("is-stuck",scrollY>40)},{passive:true});
  hdr.classList.toggle("is-stuck",scrollY>40);
  var items=[].slice.call(document.querySelectorAll(".nav-item.has-menu"));
  function setOpen(it,on){it.classList.toggle("is-open",on);
    it.querySelector(".nav-trigger").setAttribute("aria-expanded",on?"true":"false");
    var m=it.querySelector(".nav-menu");
    if(on){m.style.opacity="1";m.style.visibility="visible";m.style.pointerEvents="auto";
      m.style.transform=m.classList.contains("nav-menu--wide")?"translateX(0) translateY(0)":"translateX(-50%) translateY(0)";}
    else{m.style.opacity="";m.style.visibility="";m.style.pointerEvents="";m.style.transform="";}}
  function closeAll(){items.forEach(function(o){setOpen(o,false)})}
  var hoverable=matchMedia("(hover:hover) and (min-width:861px)").matches;
  items.forEach(function(it){var t=it.querySelector(".nav-trigger");
    if(hoverable){it.addEventListener("mouseenter",function(){closeAll();setOpen(it,true)});
      it.addEventListener("mouseleave",function(){setOpen(it,false)});
      t.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();closeAll();setOpen(it,true)});}
    else{t.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();
      var o=it.classList.contains("is-open");closeAll();if(!o)setOpen(it,true)});}
    it.addEventListener("keydown",function(e){if(e.key==="Escape"){setOpen(it,false);t.focus()}});});
  document.addEventListener("click",function(e){if(!e.target.closest(".nav-item.has-menu"))closeAll()});
  var burger=document.querySelector(".burger"),nav=document.querySelector(".nav");
  if(burger)burger.addEventListener("click",function(){
    var open=burger.getAttribute("aria-expanded")==="true";
    burger.setAttribute("aria-expanded",String(!open));
    nav.style.display=open?"":"flex";
    if(!open){nav.style.cssText="display:flex;position:absolute;inset-inline:0;top:100%;flex-direction:column;align-items:flex-start;gap:0;padding:.5rem clamp(1.25rem,4vw,2.5rem) 1.25rem;background:rgba(12,10,9,.96);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.1)";}});
  var yr=document.getElementById("yr");if(yr)yr.textContent=new Date().getFullYear();
})();
</script>
</body>
</html>`;
}

/* ---- Fare table markup ---- */
function fareTable(loc) {
  const d = FARES[loc];
  let rows = "";
  d.rows.forEach((r, i) => {
    const mn = minOf(r);
    const cell = v => `<td${v === mn ? ' class="best"' : ""}>${gbp(v)}</td>`;
    rows += `<tr><th scope="row">${AIRPORTS[i]}</th>${cell(r[0])}${cell(r[1])}${cell(r[2])}</tr>`;
  });
  return `<div class="table-scroll">
  <table class="fare">
    <caption>${d.name} airport transfer fares<span>One-way, per vehicle — not per passenger.</span></caption>
    <thead><tr>
      <th scope="col">Airport</th>
      <th scope="col">E-Class · 1–3</th>
      <th scope="col">S-Class · 1–3</th>
      <th scope="col">V-Class · up to 8</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

/* Related-location chips (all other towns) */
function relatedLocations(exclude) {
  return Object.keys(FARES).filter(k => k !== exclude).map(k =>
    `<a href="${LOC_SLUGS[k]}.html">${FARES[k].name}</a>`).join("\n      ");
}

const contactAside = `<aside class="aside-card">
  <h3>Book this transfer</h3>
  <div class="row"><svg class="ico" aria-hidden="true"><use href="#i-phone"/></svg><a href="tel:+447772750008">07772 750008</a></div>
  <div class="row"><svg class="ico" aria-hidden="true"><use href="#i-chat"/></svg><a href="https://wa.me/447772750008">WhatsApp us</a></div>
  <div class="row"><svg class="ico" aria-hidden="true"><use href="#i-mail"/></svg><a href="mailto:book@minibustaxiservice.uk">book@minibustaxiservice.uk</a></div>
  <div class="row"><svg class="ico" aria-hidden="true"><use href="#i-clock"/></svg>Available 24 hours a day</div>
  <div class="row"><svg class="ico" aria-hidden="true"><use href="#i-shield"/></svg>DBS-checked local drivers</div>
  <div class="row"><svg class="ico" aria-hidden="true"><use href="#i-tag"/></svg>Fixed price, quoted upfront</div>
  <a class="btn btn--gold" style="width:100%;margin-top:1rem" href="index.html#book">Request a fixed quote<svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></a>
</aside>`;

/* ---- Location page ---- */
function locationPage(loc) {
  const d = FARES[loc];
  const cheapest = gbp(Math.min(...d.rows.map(minOf)));
  const toHeathrow = gbp(minOf(d.rows[0]));
  const body = `
<section class="page-hero">
  ${heroMedia("e")}
  <div class="wrap">
    <p class="crumb"><a href="index.html">Home</a> / <span>${d.name}</span></p>
    <h1>${d.name} airport transfers, <em>from ${toHeathrow} to Heathrow.</em></h1>
    <p class="lead">Fixed-price executive transfers from ${d.name} to every major South-East and Midlands airport. Mercedes E-Class, S-Class and 8-seat V-Class, driven by DBS-checked local chauffeurs — 24 hours a day.</p>
    <div class="actions">
      <a class="btn btn--gold" href="index.html#book">Request a fixed quote<svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></a>
      <a class="btn btn--ghost" href="tel:+447772750008"><svg class="ico" aria-hidden="true"><use href="#i-phone"/></svg>07772 750008</a>
    </div>
  </div>
</section>

<section class="section fares" style="background:var(--stone-100)">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Transparent pricing</p>
      <h2 class="section-title">Fares from ${d.name}</h2>
      <p class="section-sub">Every price is confirmed in writing before you travel — no meters, no surge.</p></div>
    ${fareTable(loc)}
    <div class="fare-foot">
      <span><svg class="ico" aria-hidden="true"><use href="#i-tag"/></svg>Airport <strong>returns</strong> add £15–£30 for car park and waiting time.</span>
      <span><svg class="ico" aria-hidden="true"><use href="#i-alert"/></svg>Outlying villages near ${d.name} may vary slightly — confirmed on quote.</span>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap two-col">
    <div class="prose">
      <p class="eyebrow">${d.name} &middot; The Cotswolds</p>
      <h2 class="section-title">Executive travel from ${d.name}</h2>
      <p>Our ${d.name} airport transfer service runs on a fixed-price basis, so you know exactly what you'll pay before the journey begins. Whether it's an early-morning departure or a late-night return, we track your flight and adjust the pickup so you're never left waiting.</p>
      <p>Choose the Mercedes E-Class for one to three passengers, the S-Class when the occasion calls for the flagship, or the 8-seat V-Class for groups and families travelling with luggage — one vehicle instead of two taxis. Every car carries onboard WiFi, climate control and card payment as standard.</p>
      <p>From ${d.name}, the lowest available fare starts at ${cheapest}. Call, WhatsApp or request a quote online and we'll reply with a confirmed, all-in price — usually within the hour.</p>
      <h3 style="font-family:'Bodoni Moda',serif;font-size:1.5rem;margin-top:2rem">Nearby collection points</h3>
      <div class="related">
      ${relatedLocations(loc)}
      </div>
    </div>
    ${contactAside}
  </div>
</section>`;
  return {
    file: LOC_SLUGS[loc] + ".html",
    html: shell({
      title: `${d.name} Airport Transfer | Minibus Taxi Service`,
      desc: `Fixed-price ${d.name} airport transfers to Heathrow, Gatwick, Birmingham and beyond. Mercedes E-Class, S-Class and 8-seat V-Class. From ${cheapest}. Call 07772 750008.`,
      body,
    }),
  };
}

/* ---- Service page ---- */
function servicePage({ file, title, eyebrow, heading, lead, icon, paras, showFaresNote, car }) {
  const body = `
<section class="page-hero">
  ${heroMedia(car || "v")}
  <div class="wrap">
    <p class="crumb"><a href="index.html">Home</a> / <span>${eyebrow}</span></p>
    <h1>${heading}</h1>
    <p class="lead">${lead}</p>
    <div class="actions">
      <a class="btn btn--gold" href="index.html#book">Request a fixed quote<svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></a>
      <a class="btn btn--ghost" href="tel:+447772750008"><svg class="ico" aria-hidden="true"><use href="#i-phone"/></svg>07772 750008</a>
    </div>
  </div>
</section>

<section class="section" style="background:var(--stone-100)">
  <div class="wrap two-col">
    <div class="prose">
      <div class="svc__ico" style="margin-bottom:1.25rem"><svg class="ico" aria-hidden="true"><use href="#${icon}"/></svg></div>
      <h2 class="section-title">${eyebrow}</h2>
      ${paras.map(p => `<p>${p}</p>`).join("\n      ")}
      ${showFaresNote ? `<p><strong>Fixed £350</strong> to London Heathrow, or a confirmed fixed price to any other airport on request.</p>` : ""}
      <h3 style="font-family:'Bodoni Moda',serif;font-size:1.5rem;margin-top:2rem">Airport transfers from</h3>
      <div class="related">
      ${relatedLocations(null)}
      </div>
    </div>
    ${contactAside}
  </div>
</section>`;
  return {
    file,
    html: shell({
      title,
      desc: lead.replace(/<[^>]+>/g, "").slice(0, 155),
      body,
    }),
  };
}

/* ---- Fleet page ---- */
function fleetPage() {
  const cars = [
    { id:"e", tier:"Executive", name:"Mercedes E-Class", seats:"1–3 passengers", from:"£115",
      desc:"Our most-booked saloon. Ample legroom and a quiet, composed ride for solo travellers, couples and small families.",
      specs:[["i-users","1–3 passengers"],["i-wifi","Onboard WiFi"],["i-snow","Climate control"],["i-card","Card payments"],["i-star","Leather interior"],["i-shield","DBS-checked driver"]] },
    { id:"s", tier:"First class", name:"Mercedes S-Class", seats:"1–3 passengers", from:"£150",
      desc:"Air suspension, reclining rear seats and Burmester sound. Reserved for occasions that warrant the flagship.",
      specs:[["i-users","1–3 passengers"],["i-star","Airmatic ride"],["i-users","Reclining rear seats"],["i-wifi","Onboard WiFi"],["i-snow","64-colour ambience"],["i-card","Card payments"]] },
    { id:"v", tier:"Group travel", name:"Mercedes V-Class", seats:"Up to 8 passengers", from:"£150",
      desc:"The mainstay of the fleet. Eight full seats with luggage space behind — one vehicle instead of two taxis.",
      specs:[["i-users","Up to 8 seats"],["i-wifi","Onboard WiFi"],["i-snow","Climate control"],["i-card","Card payments"],["i-star","Quilted leather"],["i-shield","DBS-checked driver"]] },
  ];

  const rows = cars.map((c, i) => `
  <article class="fleet-row${i % 2 ? " fleet-row--rev" : ""}">
    <div class="fleet-row__media">
      <video playsinline muted loop autoplay preload="metadata" poster="assets/fleet-${c.id}-still.jpg" aria-hidden="true" tabindex="-1">
        <source src="assets/fleet-${c.id}.mp4" type="video/mp4">
      </video>
    </div>
    <div class="fleet-row__body">
      <p class="card__tier" style="color:var(--gold)">${c.tier}</p>
      <h2 class="fleet-row__name">${c.name}</h2>
      <p class="fleet-row__desc">${c.desc}</p>
      <ul class="fleet-spec">
        ${c.specs.map(s => `<li><svg class="ico" aria-hidden="true"><use href="#${s[0]}"/></svg>${s[1]}</li>`).join("\n        ")}
      </ul>
      <div class="fleet-row__foot">
        <span class="card__from">From, to Heathrow</span>
        <span class="card__price" style="color:var(--ink)">${c.from} <small>one-way</small></span>
      </div>
      <a class="btn btn--gold" href="index.html#book" style="margin-top:1.25rem">Book the ${c.name.replace("Mercedes ", "")}<svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></a>
    </div>
  </article>`).join("\n");

  const body = `
<section class="page-hero">
  ${heroMedia("v")}
  <div class="wrap">
    <p class="crumb"><a href="index.html">Home</a> / <span>Vehicle Fleet</span></p>
    <h1>Three Mercedes, <em>one standard.</em></h1>
    <p class="lead">Every vehicle in our fleet is a black Mercedes, driven by a DBS-checked local chauffeur, carrying onboard WiFi, climate control and card payment as standard. Choose the class to suit your party.</p>
    <div class="actions">
      <a class="btn btn--gold" href="index.html#book">Request a fixed quote<svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></a>
      <a class="btn btn--ghost" href="tel:+447772750008"><svg class="ico" aria-hidden="true"><use href="#i-phone"/></svg>07772 750008</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head section-head--center"><p class="eyebrow eyebrow--center">The fleet</p>
      <h2 class="section-title">Our vehicles</h2>
      <p class="section-sub">Executive cars for one to three passengers, and an 8-seat Mercedes minibus for groups and luggage.</p></div>
    ${rows}
  </div>
</section>

<section class="section" style="background:var(--ink); color:#fff">
  <div class="wrap" style="text-align:center">
    <h2 class="section-title" style="color:#fff">Not sure which vehicle?</h2>
    <p class="section-sub" style="color:var(--stone-400); margin-inline:auto">Tell us your party size, luggage and destination — we'll recommend the right car and quote a fixed price.</p>
    <a class="btn btn--gold" href="index.html#book" style="margin-top:2rem">Request a fixed quote<svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></a>
  </div>
</section>`;

  return {
    file: "fleet.html",
    html: shell({
      title: "Our Fleet — Mercedes E-Class, S-Class & V-Class | Minibus Taxi Service",
      desc: "Our executive fleet: Mercedes E-Class and S-Class saloons for 1–3 passengers, and an 8-seat V-Class minibus for groups. WiFi, climate control and card payment as standard. From £115.",
      body,
    }),
  };
}

/* ---- Build ---- */
const pages = [];

// Fleet page
pages.push(fleetPage());

// 9 location pages
Object.keys(FARES).forEach(loc => pages.push(locationPage(loc)));

// 5 service pages
pages.push(servicePage({
  file: "airport-transfers.html", eyebrow: "Airport Transfers",
  title: "Airport Transfers — Pick-up & Drop-off | Minibus Taxi Service",
  heading: "Airport transfers, <em>priced before you travel.</em>",
  icon: "i-plane",
  lead: "Pick-up, drop-off or both, to every major airport in the South-East and Midlands. Early starts are our normal hours — we run around your flight, not the other way round.",
  paras: [
    "Every airport transfer is quoted on a fixed-price basis and confirmed in writing before you travel. We monitor your flight so that delays and early arrivals are handled without extra stress or hidden charges.",
    "We serve Heathrow, Gatwick, Luton, Stansted, London City, Birmingham, Southampton and Bristol from across the Cotswolds and Oxfordshire. Choose the Mercedes E-Class, S-Class or 8-seat V-Class to suit your party and luggage.",
    "Airport returns include a modest £15–£30 allowance for car park and waiting time. Everything else is fixed at the point of booking.",
  ],
}));
pages.push(servicePage({
  file: "wedding-transport.html", eyebrow: "Cotswolds Wedding Transport", car: "s",
  title: "Cotswolds Wedding Transport | Minibus Taxi Service",
  heading: "Wedding transport across <em>the Cotswolds.</em>",
  icon: "i-rings",
  lead: "Elegant Mercedes transport for Cotswold weddings — guest shuttles, and smooth end-of-night runs back to accommodation.",
  paras: [
    "A single 8-seat Mercedes V-Class moves your wedding party or guests between venue and accommodation in one graceful trip, with WiFi, climate control and ambient lighting throughout.",
    "We plan timings around your ceremony and reception, coordinate multiple pickups, and keep late-night returns running smoothly so nobody is left waiting at the end of the evening.",
    "Tell us your venue, guest numbers and schedule, and we'll return a fixed, all-inclusive quote for the day.",
  ],
}));
pages.push(servicePage({
  file: "full-day-hire.html", eyebrow: "Full-Day Hire",
  title: "Full-Day Chauffeur Hire | Minibus Taxi Service",
  heading: "A car and chauffeur <em>for the whole day.</em>",
  icon: "i-cal",
  lead: "A Mercedes and professional driver at your disposal for the day — corporate visits, race meetings, distillery and vineyard tours, or meetings across several towns.",
  paras: [
    "Full-day hire gives you an executive Mercedes and a local chauffeur for as long as you need, with the freedom to add stops and adjust the itinerary as the day unfolds.",
    "It's ideal for business days spanning multiple locations, Cotswold sightseeing, golf and race days, or unhurried vineyard and distillery tours where a designated driver matters.",
    "Rates are agreed up front based on your hours and route — request a quote with your plans and we'll confirm a fixed day rate.",
  ],
}));
pages.push(servicePage({
  file: "estelle-manor.html", eyebrow: "Estelle Manor", car: "s",
  title: "Estelle Manor to Heathrow Transfer | Minibus Taxi Service",
  heading: "Estelle Manor to Heathrow, <em>fixed £350.</em>",
  icon: "i-pin",
  lead: "Executive transfers to and from Estelle Manor — a fixed £350 to London Heathrow, or a confirmed fixed price to any other airport.",
  showFaresNote: true,
  paras: [
    "We provide discreet, punctual Mercedes transfers to and from Estelle Manor for guests arriving or departing by air.",
    "Travel in the E-Class or S-Class for individuals and couples, or the 8-seat V-Class for groups with luggage. Every journey is fixed-price and available around the clock.",
  ],
}));
pages.push(servicePage({
  file: "soho-farmhouse.html", eyebrow: "Soho Farmhouse", car: "s",
  title: "Soho Farmhouse to Heathrow Transfer | Minibus Taxi Service",
  heading: "Soho Farmhouse to Heathrow, <em>fixed £350.</em>",
  icon: "i-pin",
  lead: "Executive transfers to and from Soho Farmhouse — a fixed £350 to London Heathrow, or a confirmed fixed price to any other airport.",
  showFaresNote: true,
  paras: [
    "We run reliable, comfortable Mercedes transfers to and from Soho Farmhouse for members and guests connecting through the airport.",
    "Choose the E-Class or S-Class saloon, or the 8-seat V-Class for groups travelling together with luggage. Fixed price, quoted upfront, 24 hours a day.",
  ],
}));

/* ---- Write ---- */
let written = [];
pages.forEach(p => {
  fs.writeFileSync(path.join(DIR, p.file), p.html, "utf8");
  written.push(p.file);
});
console.log("Wrote " + written.length + " pages:\n  " + written.join("\n  "));
