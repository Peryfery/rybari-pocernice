const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

// Načtení skrytých přístupových údajů z prostředí GitHub Actions
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function spustitScraper() {
  console.log('Spouštím stahování dat z webu ČRS...');
  
  try {
    // 1. Stažení HTML obsahu stránky
    const { data: html } = await axios.get('https://www.rybsvaz.cz/mo/-/praha-9-horni-pocernice', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
      }
    });

    const $ = cheerio.load(html);
    
    let dataVybor = '';
    let dataKontakty = '';
    let dataBrigady = '';
    let dataPrispevky = '';

    // 2. Prohledání nadpisů na stránce a vytažení textu/HTML, které následuje pod nimi
    $('h1, h2, h3, h4, h5').each((index, element) => {
      const textNadpisu = $(element).text().toLowerCase().trim();
      const obsahPodNadpisem = $(element).next().html(); // Vezme HTML strukturu pod nadpisem

      if (!obsahPodNadpisem) return;

      if (textNadpisu.includes('výbor') || textNadpisu.includes('funkcionář')) {
        dataVybor += obsahPodNadpisem;
      } else if (textNadpisu.includes('kontakt') || textNadpisu.includes('sídlo')) {
        dataKontakty += obsahPodNadpisem;
      } else if (textNadpisu.includes('brigád')) {
        dataBrigady += obsahPodNadpisem;
      } else if (textNadpisu.includes('příspěvk') || textNadpisu.includes('poplatk') || textNadpisu.includes('povolen')) {
        dataPrispevky += obsahPodNadpisem;
      }
    });

    // 3. Příprava balíčků pro uložení do Supabase
    const balickyDat = [
      { klic: 'vybor', obsah: { html: dataVybor || 'Data na ČRS nenalezena.' } },
      { klic: 'kontakty', obsah: { html: dataKontakty || 'Data na ČRS nenalezena.' } },
      { klic: 'brigady', obsah: { html: dataBrigady || 'Data na ČRS nenalezena.' } },
      { klic: 'prispevky', obsah: { html: dataPrispevky || 'Data na ČRS nenalezena.' } }
    ];

    // 4. Uložení nebo aktualizace (Upsert) v databázi
    for (const balicek of balickyDat) {
      const { error } = await supabase
        .from('mo_data')
        .upsert(
          { klic: balicek.klic, obsah: balicek.obsah, aktualizovano_dne: new Date() },
          { onConflict: 'klic' }
        );

      if (error) {
        console.error(`Chyba při ukládání klíče ${balicek.klic}:`, error);
      } else {
        console.log(`Klíč "${balicek.klic}" úspěšně synchronizován.`);
      }
    }

    console.log('Synchronizace úspěšně dokončena!');

  } catch (chyba) {
    console.error('Došlo k fatální chybě během stahování:', chyba);
    process.exit(1);
  }
}

spustitScraper();
