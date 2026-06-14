const SUPABASE_URL = 'https://jyqqyzpjujgymveolupt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UR-OGUOpeanlhKSMomA7OQ_14A92Mog';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const mesice = ['led', 'úno', 'bře', 'dub', 'kvě', 'čen', 'čec', 'srp', 'zář', 'říj', 'lis', 'pro'];

// Kompletně přepsané, neprůstřelné parsování PostgreSQL tsrange stringu
function parsujTsRangeNaObjekt(rozsahString) {
  if (!rozsahString) return null;
  
  // 1. Odstraníme ohraničující závorky [ ] ( ) a rozdělíme text podle čárky
  const cistyString = rozsahString.replace(/[\[\]()]/g, '');
  const casti = cistyString.split(',');
  
  const startStr = casti[0] ? casti[0].trim() : null;
  const konecStr = casti[1] ? casti[1].trim() : null;

  if (!startStr) return null;

  // 2. Regulární výraz, který bezpečně vytáhne: Rok-Měsíc-Den (mezera nebo T) Hodina:Minuta
  const regex = /(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})/;
  
  const startMatch = startStr.match(regex);
  if (!startMatch) return null;

  const startSlozky = {
    rok: parseInt(startMatch[1], 10),
    mesic: parseInt(startMatch[2], 10),
    den: parseInt(startMatch[3], 10),
    hodina: parseInt(startMatch[4], 10),
    minuta: parseInt(startMatch[5], 10)
  };

  let konecSlozky = null;
  if (konecStr) {
    const konecMatch = konecStr.match(regex);
    if (konecMatch) {
      konecSlozky = {
        rok: parseInt(konecMatch[1], 10),
        mesic: parseInt(konecMatch[2], 10),
        den: parseInt(konecMatch[3], 10),
        hodina: parseInt(konecMatch[4], 10),
        minuta: parseInt(konecMatch[5], 10)
      };
    }
  }

  // 3. Vytvoření JS datumu bez rizika posunu časových pásem
  const sDate = new Date(startSlozky.rok, startSlozky.mesic - 1, startSlozky.den, startSlozky.hodina, startSlozky.minuta);
  const kDate = konecSlozky ? new Date(konecSlozky.rok, konecSlozky.mesic - 1, konecSlozky.den, konecSlozky.hodina, konecSlozky.minuta) : null;

  return {
    surove: { start: startSlozky, konec: konecSlozky },
    jsDate: sDate,
    jsKonecDate: kDate
  };
}

// Načítání úředních hodin (Původní verze pro index.html - NEMĚNIT)
async function nactiUredniHodiny() {
  const container = document.getElementById('uredni-hodiny-list');
  if (!container) return; // Ochrana, pokud element na stránce neexistuje
  
  const dnes = new Date();
  dnes.setHours(0, 0, 0, 0);

  const { data, error } = await supabaseClient
    .from('uredni_hodiny')
    .select('rozsah')
    .order('rozsah', { ascending: true });

  if (error) {
    console.error('Chyba při načítání úředních hodin:', error);
    container.innerHTML = '<p>Nepodařilo se načíst úřední hodiny.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p>Momentálně nejsou naplánované žádné úřední hodiny.</p>';
    return;
  }

  const budouciHodiny = data
    .map(radek => parsujTsRangeNaObjekt(radek.rozsah))
    .filter(item => item !== null && item.jsDate >= dnes)
    .sort((a, b) => a.jsDate - b.jsDate)
    .slice(0, 4);

  if (budouciHodiny.length === 0) {
    container.innerHTML = '<p>Momentálně nejsou naplánované žádné budoucí úřední hodiny.</p>';
    return;
  }

  container.innerHTML = '';
  
  budouciHodiny.forEach(item => {
    const s = item.surove.start;
    const k = item.surove.konec;

    const naformatovaneDatum = `${String(s.den).padStart(2, '0')}. ${String(s.mesic).padStart(2, '0')}.`;
    const startCas = `${String(s.hodina).padStart(2, '0')}:${String(s.minuta).padStart(2, '0')}`;
    
    let finalniCas = startCas;
    if (k) {
      const konecCas = `${String(k.hodina).padStart(2, '0')}:${String(k.minuta).padStart(2, '0')}`;
      finalniCas += ` – ${konecCas}`;
    }

    container.innerHTML += `
      <article class="news-entry" style="margin-bottom: 15px; cursor: default;">
          <div class="news-date">${naformatovaneDatum}</div>
          <div class="news-content" style="display: flex; align-items: center; padding-left: 10px;">
              <p style="margin: 0; font-size: 1.1rem; color: #1a3326; font-weight: 600;">
                  <i class="fa-regular fa-clock" style="color: #2e5a44; margin-right: 8px;"></i> 
                  ${finalniCas}
              </p>
          </div>
      </article>
    `;
  });
}

// Načítání kalendáře akcí
async function nactiKalendar() {
  const container = document.getElementById('kalendar-list');
  if (!container) return; // Ochrana, pokud element na stránce neexistuje

  const { data, error } = await supabaseClient
    .from('kalendar_akci')
    .select('*')
    .gte('datum_konani', new Date().toISOString().split('T')[0])
    .order('datum_konani', { ascending: true });

  if (error) {
    console.error('Chyba při načítání kalendáře:', error);
    container.innerHTML = '<p>Nepodařilo se načíst kalendář.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p>Žádné plánované akce.</p>';
    return;
  }

  container.innerHTML = '';
  data.forEach(akce => {
    const d = new Date(akce.datum_konani);
    const den = d.getDate();
    const mesic = mesice[d.getMonth()];

    container.innerHTML += `
      <div class="cal-item">
          <div class="cal-date"><strong>${den}</strong><span>${mesic}</span></div>
          <div class="cal-info">${akce.nazev} ${akce.cas_konani ? `<br><small><i class="fa-regular fa-clock"></i> ${akce.cas_konani.substring(0,5)}</small>` : ''}</div>
      </div>
    `;
  });
}


/* ==========================================================================
   NOVÁ FUNKCE PRO STRÁNKU KONTAKTY (Zobrazí vše v mřížce bez duplikování času)
   ========================================================================== */
async function nactiVsechnyUredniHodinyKontakty() {
  const container = document.getElementById('uredni-hodiny-kontakty-grid');
  if (!container) return; // Spustí se jen tehdy, pokud jsme na stránce kontaktů

  const dnes = new Date();
  dnes.setHours(0, 0, 0, 0);

  const { data, error } = await supabaseClient
    .from('uredni_hodiny')
    .select('rozsah')
    .order('rozsah', { ascending: true });

  if (error) {
    console.error('Chyba při načítání úředních hodin v kontaktech:', error);
    container.innerHTML = '<p>Nepodařilo se načíst úřední hodiny.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p>Momentálně nejsou naplánované žádné úřední hodiny.</p>';
    return;
  }

  // Naparsujeme a vyfiltrujeme všechny budoucí hodiny (BEZ OMEZENÍ SLICE - vytáhneme úplně všechny)
  const vsechnyBudouciHodiny = data
    .map(radek => parsujTsRangeNaObjekt(radek.rozsah))
    .filter(item => item !== null && item.jsDate >= dnes)
    .sort((a, b) => a.jsDate - b.jsDate);

  if (vsechnyBudouciHodiny.length === 0) {
    container.innerHTML = '<p>Momentálně nejsou naplánované žádné budoucí úřední hodiny.</p>';
    return;
  }

  // 1. Vytáhneme čas z prvního záznamu pro jednotné zobrazení v záhlaví
  const prvniZaznam = vsechnyBudouciHodiny[0].surove;
  const startCas = `${String(prvniZaznam.start.hodina).padStart(2, '0')}:${String(prvniZaznam.start.minuta).padStart(2, '0')}`;
  
  let finalniCas = startCas;
  if (prvniZaznam.konec) {
    const konecCas = `${String(prvniZaznam.konec.hodina).padStart(2, '0')}:${String(prvniZaznam.konec.minuta).padStart(2, '0')}`;
    finalniCas += ` – ${konecCas}`;
  }

  // 2. Vygenerujeme HTML pro jednotlivé dlaždice s daty
  let dlazdiceHtml = '';
  vsechnyBudouciHodiny.forEach((item, index) => {
    const s = item.surove.start;
    const naformatovaneDatum = `${String(s.den).padStart(2, '0')}. ${String(s.mesic).padStart(2, '0')}.`;
    
    // Zvýraznění úplně prvního (nejbližšího) termínu
    const jeNejblizsi = index === 0;
    const extraTrida = jeNejblizsi ? 'date-badge-next-full' : '';
    const stitek = jeNejblizsi ? '<span class="next-label-full">Nejbližší</span>' : '';

    dlazdiceHtml += `
      <div class="date-badge-full ${extraTrida}">
          ${stitek}
          <span class="date-text-full">${naformatovaneDatum}</span>
      </div>
    `;
  });

  // 3. Vykreslení celé komponenty do připraveného divu v kontakt.html
  container.innerHTML = `
    <div class="hours-card-full">
      <div class="hours-header-full">
        <div class="hours-title-full">
          <i class="fa-regular fa-calendar-check hours-icon-full"></i>
          <div>
            <h3>Úřední hodiny 2026</h3>
            <p>Pro výdej povolenek a administrativu</p>
          </div>
        </div>
        <div class="hours-time-badge-full">
          <i class="fa-regular fa-clock"></i> ${finalniCas}
        </div>
      </div>
      <div class="hours-grid-full">
        ${dlazdiceHtml}
      </div>
    </div>
  `;
}

// Inicializace podle toho, na které stránce se uživatel nachází
document.addEventListener('DOMContentLoaded', () => {
  // Spustí se na index.html (pokud tam prvky existují)
  nactiUredniHodiny();
  nactiKalendar();
  
  // Spustí se na kontakt.html
  nactiVsechnyUredniHodinyKontakty();
});