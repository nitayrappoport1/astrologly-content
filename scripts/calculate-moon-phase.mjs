#!/usr/bin/env node
/**
 * Moon Phase Calculator
 * Calculates daily moon phase data using astronomical calculations
 * No AI required - pure astronomy
 */

import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Moon phase descriptions in all languages
const PHASE_DESCRIPTIONS = {
  new_moon: {
    en: "The New Moon brings fresh beginnings and new intentions. This is a powerful time to set goals and plant seeds for future growth.",
    es: "La Luna Nueva trae nuevos comienzos e intenciones frescas. Es un momento poderoso para establecer metas y plantar semillas para el crecimiento futuro.",
    fr: "La Nouvelle Lune apporte de nouveaux départs et de nouvelles intentions. C'est un moment puissant pour fixer des objectifs et planter des graines pour la croissance future.",
    pt: "A Lua Nova traz novos começos e novas intenções. Este é um momento poderoso para estabelecer metas e plantar sementes para o crescimento futuro.",
    it: "La Luna Nuova porta nuovi inizi e nuove intenzioni. Questo è un momento potente per stabilire obiettivi e piantare semi per la crescita futura.",
    de: "Der Neumond bringt neue Anfänge und frische Absichten. Dies ist eine kraftvolle Zeit, um Ziele zu setzen und Samen für zukünftiges Wachstum zu pflanzen."
  },
  waxing_crescent: {
    en: "The Waxing Crescent Moon encourages action on your intentions. Take small steps toward your goals with growing confidence.",
    es: "La Luna Creciente Creciente fomenta la acción sobre sus intenciones. Dé pequeños pasos hacia sus metas con creciente confianza.",
    fr: "Le Croissant de Lune Croissant encourage l'action sur vos intentions. Faites de petits pas vers vos objectifs avec une confiance croissante.",
    pt: "A Lua Crescente Crescente encoraja a ação sobre suas intenções. Dê pequenos passos em direção aos seus objetivos com crescente confiança.",
    it: "La Luna Crescente Crescente incoraggia l'azione sulle tue intenzioni. Fai piccoli passi verso i tuoi obiettivi con crescente fiducia.",
    de: "Der zunehmende Sichelmond ermutigt zum Handeln bei Ihren Absichten. Machen Sie kleine Schritte zu Ihren Zielen mit wachsendem Vertrauen."
  },
  first_quarter: {
    en: "The First Quarter Moon calls for decisive action. Overcome obstacles and push through challenges with determination.",
    es: "La Luna del Primer Cuarto llama a la acción decisiva. Supere obstáculos y supere desafíos con determinación.",
    fr: "Le Premier Quartier de Lune appelle à l'action décisive. Surmontez les obstacles et poussez à travers les défis avec détermination.",
    pt: "A Lua do Primeiro Quarto pede ação decisiva. Supere obstáculos e supere desafios com determinação.",
    it: "Il Primo Quarto di Luna richiede un'azione decisiva. Supera gli ostacoli e affronta le sfide con determinazione.",
    de: "Das Erste Viertel des Mondes fordert entschlossenes Handeln. Überwinden Sie Hindernisse und meistern Sie Herausforderungen mit Entschlossenheit."
  },
  waxing_gibbous: {
    en: "The Waxing Gibbous Moon is a time for refinement and adjustment. Fine-tune your plans as manifestation approaches.",
    es: "La Luna Gibosa Creciente es un momento de refinamiento y ajuste. Afine sus planes a medida que se acerca la manifestación.",
    fr: "La Lune Gibbeuse Croissante est un temps de raffinement et d'ajustement. Affinez vos plans à mesure que la manifestation approche.",
    pt: "A Lua Gibosa Crescente é um momento de refinamento e ajuste. Ajuste seus planos à medida que a manifestação se aproxima.",
    it: "La Luna Gibbosa Crescente è un tempo di raffinamento e aggiustamento. Affina i tuoi piani mentre la manifestazione si avvicina.",
    de: "Der zunehmende Gibbous-Mond ist eine Zeit der Verfeinerung und Anpassung. Verfeinern Sie Ihre Pläne, während sich die Manifestation nähert."
  },
  full_moon: {
    en: "The Full Moon illuminates everything, bringing clarity and culmination. This is a time of completion, celebration, and release.",
    es: "La Luna Llena ilumina todo, trayendo claridad y culminación. Este es un momento de finalización, celebración y liberación.",
    fr: "La Pleine Lune illumine tout, apportant clarté et culmination. C'est un temps d'achèvement, de célébration et de libération.",
    pt: "A Lua Cheia ilumina tudo, trazendo clareza e culminação. Este é um momento de conclusão, celebração e liberação.",
    it: "La Luna Piena illumina tutto, portando chiarezza e culminazione. Questo è un tempo di completamento, celebrazione e rilascio.",
    de: "Der Vollmond beleuchtet alles und bringt Klarheit und Höhepunkt. Dies ist eine Zeit des Abschlusses, der Feier und der Befreiung."
  },
  waning_gibbous: {
    en: "The Waning Gibbous Moon encourages gratitude and sharing. Share your wisdom and give back to your community.",
    es: "La Luna Gibosa Menguante fomenta la gratitud y el compartir. Comparta su sabiduría y devuelva a su comunidad.",
    fr: "La Lune Gibbeuse Décroissante encourage la gratitude et le partage. Partagez votre sagesse et redonnez à votre communauté.",
    pt: "A Lua Gibosa Minguante encoraja a gratidão e o compartilhamento. Compartilhe sua sabedoria e retribua à sua comunidade.",
    it: "La Luna Gibbosa Calante incoraggia la gratitudine e la condivisione. Condividi la tua saggezza e restituisci alla tua comunità.",
    de: "Der abnehmende Gibbous-Mond ermutigt zu Dankbarkeit und Teilen. Teilen Sie Ihre Weisheit und geben Sie Ihrer Gemeinschaft zurück."
  },
  last_quarter: {
    en: "The Last Quarter Moon is a time for release and forgiveness. Let go of what no longer serves you.",
    es: "La Luna del Último Cuarto es un momento de liberación y perdón. Suelte lo que ya no le sirve.",
    fr: "Le Dernier Quartier de Lune est un temps de libération et de pardon. Lâchez ce qui ne vous sert plus.",
    pt: "A Lua do Último Quarto é um momento de liberação e perdão. Deixe ir o que não mais lhe serve.",
    it: "L'Ultimo Quarto di Luna è un tempo di rilascio e perdono. Lascia andare ciò che non ti serve più.",
    de: "Das Letzte Viertel des Mondes ist eine Zeit der Befreiung und Vergebung. Lassen Sie los, was Ihnen nicht mehr dient."
  },
  waning_crescent: {
    en: "The Waning Crescent Moon invites rest and introspection. Prepare for the next cycle with quiet contemplation.",
    es: "La Luna Menguante Menguante invita al descanso y la introspección. Prepárese para el próximo ciclo con contemplación tranquila.",
    fr: "Le Croissant de Lune Décroissant invite au repos et à l'introspection. Préparez-vous pour le prochain cycle avec une contemplation tranquille.",
    pt: "A Lua Minguante Minguante convida ao descanso e à introspecção. Prepare-se para o próximo ciclo com contemplação tranquila.",
    it: "La Luna Calante Calante invita al riposo e all'introspezione. Preparati per il prossimo ciclo con contemplazione tranquilla.",
    de: "Der abnehmende Sichelmond lädt zur Ruhe und Selbstreflexion ein. Bereiten Sie sich auf den nächsten Zyklus mit stiller Kontemplation vor."
  }
};

/**
 * Calculate moon phase based on date
 * Using astronomical formula
 */
function calculateMoonPhase(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Calculate Julian Date
  let jd = 367 * year - Math.floor((7 * (year + Math.floor((month + 9) / 12))) / 4);
  jd += Math.floor((275 * month) / 9) + day + 1721013.5;

  // Days since known new moon (Jan 6, 2000)
  const daysSinceNew = jd - 2451549.5;

  // Moon's synodic period
  const synodicMonth = 29.53058867;

  // Calculate phase
  const moonPhase = (daysSinceNew % synodicMonth) / synodicMonth;

  // Calculate illumination (0 to 1)
  const illumination = (1 - Math.cos(moonPhase * 2 * Math.PI)) / 2;

  // Determine phase name
  let phaseName;
  if (moonPhase < 0.033 || moonPhase > 0.967) {
    phaseName = 'new_moon';
  } else if (moonPhase < 0.216) {
    phaseName = 'waxing_crescent';
  } else if (moonPhase < 0.283) {
    phaseName = 'first_quarter';
  } else if (moonPhase < 0.467) {
    phaseName = 'waxing_gibbous';
  } else if (moonPhase < 0.533) {
    phaseName = 'full_moon';
  } else if (moonPhase < 0.717) {
    phaseName = 'waning_gibbous';
  } else if (moonPhase < 0.783) {
    phaseName = 'last_quarter';
  } else {
    phaseName = 'waning_crescent';
  }

  return {
    phase: phaseName,
    illumination: Math.round(illumination * 100) / 100
  };
}

/**
 * Simplified zodiac sign calculation for moon
 * Based on tropical zodiac and approximate positions
 */
function getMoonSign(date) {
  const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
                 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

  // Approximate: Moon moves through all signs in ~27.3 days
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const moonCycle = 27.32166;
  const signIndex = Math.floor((dayOfYear / moonCycle * 12) % 12);

  return signs[signIndex];
}

function getIsraelDate(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

async function calculateMoonData(targetDate) {
  console.log(`\n🌙 Calculating moon phase for ${targetDate}...`);

  const date = new Date(targetDate + 'T12:00:00Z');
  const { phase, illumination } = calculateMoonPhase(date);
  const zodiacSign = getMoonSign(date);

  const moonData = {
    date: targetDate,
    phase: phase,
    illumination: illumination,
    zodiac_sign: zodiacSign,
    descriptions: PHASE_DESCRIPTIONS[phase]
  };

  console.log(`  Phase: ${phase}`);
  console.log(`  Illumination: ${(illumination * 100).toFixed(1)}%`);
  console.log(`  Moon in: ${zodiacSign}`);

  return moonData;
}

async function main() {
  const args = process.argv.slice(2);
  const targetFlag = args.find(a => a.startsWith('--target='));

  const target = targetFlag ? targetFlag.split('=')[1] : 'tomorrow';

  let targetDate;
  if (target === 'tomorrow') {
    targetDate = getIsraelDate(1);
  } else if (target === 'today') {
    targetDate = getIsraelDate(0);
  } else {
    console.error('❌ Invalid target. Use --target=today or --target=tomorrow');
    process.exit(1);
  }

  const moonDir = join(__dirname, '..', 'moon');
  const targetFile = join(moonDir, `${targetDate}.json`);

  // Check if file already exists
  if (existsSync(targetFile)) {
    console.log(`⏭️  ${targetDate}.json already exists. Skipping.`);
    process.exit(0);
  }

  try {
    const moonData = await calculateMoonData(targetDate);
    const jsonContent = JSON.stringify(moonData, null, 2);

    await writeFile(targetFile, jsonContent);
    console.log(`💾 Created ${targetDate}.json`);
    console.log(`✅ Moon calculation complete!`);

  } catch (error) {
    console.error(`❌ Failed to calculate moon phase:`, error.message);
    process.exit(1);
  }
}

main().catch(console.error);
