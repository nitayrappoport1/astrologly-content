#!/usr/bin/env node
/**
 * Mercury Retrograde Calculator
 * Uses pre-calculated Mercury retrograde dates for 2025-2030
 * Determines current status and provides multi-language descriptions
 */

import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pre-calculated Mercury retrograde periods 2025-2030
// Source: NASA/JPL astronomical data
const MERCURY_RETROGRADES = [
  // 2025
  { starts: '2025-03-15', ends: '2025-04-07', sign: 'aries' },
  { starts: '2025-07-18', ends: '2025-08-11', sign: 'leo' },
  { starts: '2025-11-09', ends: '2025-11-29', sign: 'sagittarius' },

  // 2026
  { starts: '2026-02-26', ends: '2026-03-20', sign: 'pisces' },
  { starts: '2026-06-29', ends: '2026-07-23', sign: 'cancer' },
  { starts: '2026-10-24', ends: '2026-11-13', sign: 'scorpio' },

  // 2027
  { starts: '2027-02-09', ends: '2027-03-03', sign: 'aquarius' },
  { starts: '2027-06-10', ends: '2027-07-04', sign: 'gemini' },
  { starts: '2027-10-07', ends: '2027-10-28', sign: 'libra' },

  // 2028
  { starts: '2028-01-24', ends: '2028-02-14', sign: 'capricorn' },
  { starts: '2028-05-21', ends: '2028-06-14', sign: 'taurus' },
  { starts: '2028-09-19', ends: '2028-10-11', sign: 'virgo' },

  // 2029
  { starts: '2029-01-07', ends: '2029-01-27', sign: 'sagittarius' },
  { starts: '2029-05-02', ends: '2029-05-26', sign: 'aries' },
  { starts: '2029-09-02', ends: '2029-09-25', sign: 'leo' },
  { starts: '2029-12-22', ends: '2030-01-11', sign: 'sagittarius' },

  // 2030
  { starts: '2030-04-13', ends: '2030-05-07', sign: 'taurus' },
  { starts: '2030-08-15', ends: '2030-09-07', sign: 'virgo' },
  { starts: '2030-12-06', ends: '2030-12-26', sign: 'sagittarius' },
];

// Multi-language descriptions
const STATUS_DESCRIPTIONS = {
  retrograde: {
    en: "Mercury is currently retrograde, a time when communication, technology, and travel may face disruptions. Review, revise, and be patient with delays. Avoid signing major contracts if possible.",
    es: "Mercurio está actualmente retrógrado, un momento en que la comunicación, la tecnología y los viajes pueden enfrentar interrupciones. Revise, corrija y sea paciente con los retrasos. Evite firmar contratos importantes si es posible.",
    fr: "Mercure est actuellement rétrograde, une période où la communication, la technologie et les voyages peuvent faire face à des perturbations. Révisez, corrigez et soyez patient avec les retards. Évitez de signer des contrats majeurs si possible.",
    pt: "Mercúrio está atualmente retrógrado, um momento em que comunicação, tecnologia e viagens podem enfrentar interrupções. Revise, corrija e seja paciente com atrasos. Evite assinar contratos importantes se possível.",
    it: "Mercurio è attualmente retrogrado, un momento in cui comunicazione, tecnologia e viaggi possono affrontare interruzioni. Rivedi, correggi e sii paziente con i ritardi. Evita di firmare contratti importanti se possibile.",
    de: "Merkur ist derzeit rückläufig, eine Zeit, in der Kommunikation, Technologie und Reisen Störungen unterliegen können. Überprüfen, überarbeiten und seien Sie geduldig mit Verzögerungen. Vermeiden Sie wenn möglich wichtige Vertragsunterzeichnungen."
  },
  direct: {
    en: "Mercury is direct and moving forward smoothly. This is a favorable time for communication, contracts, technology purchases, and travel plans. Express yourself clearly and make important decisions with confidence.",
    es: "Mercurio está directo y avanzando sin problemas. Este es un momento favorable para la comunicación, contratos, compras de tecnología y planes de viaje. Exprésese claramente y tome decisiones importantes con confianza.",
    fr: "Mercure est direct et avance en douceur. C'est une période favorable pour la communication, les contrats, les achats technologiques et les projets de voyage. Exprimez-vous clairement et prenez des décisions importantes avec confiance.",
    pt: "Mercúrio está direto e avançando suavemente. Este é um momento favorável para comunicação, contratos, compras de tecnologia e planos de viagem. Expresse-se claramente e tome decisões importantes com confiança.",
    it: "Mercurio è diretto e si muove in avanti senza problemi. Questo è un momento favorevole per la comunicazione, i contratti, gli acquisti tecnologici e i piani di viaggio. Esprimetevi chiaramente e prendete decisioni importanti con fiducia.",
    de: "Merkur ist direktläufig und bewegt sich reibungslos vorwärts. Dies ist eine günstige Zeit für Kommunikation, Verträge, Technologiekäufe und Reisepläne. Drücken Sie sich klar aus und treffen Sie wichtige Entscheidungen mit Zuversicht."
  },
  pre_shadow: {
    en: "Mercury is in pre-retrograde shadow. You may begin to feel the retrograde effects. Back up important data, double-check communications, and prepare for potential delays in the coming weeks.",
    es: "Mercurio está en sombra pre-retrógrada. Puede comenzar a sentir los efectos retrógrados. Haga copias de seguridad de datos importantes, verifique las comunicaciones dos veces y prepárese para posibles retrasos en las próximas semanas.",
    fr: "Mercure est dans l'ombre pré-rétrograde. Vous pouvez commencer à ressentir les effets rétrogrades. Sauvegardez les données importantes, vérifiez deux fois les communications et préparez-vous à d'éventuels retards dans les semaines à venir.",
    pt: "Mercúrio está na sombra pré-retrógrada. Você pode começar a sentir os efeitos retrógrados. Faça backup de dados importantes, verifique as comunicações duas vezes e prepare-se para possíveis atrasos nas próximas semanas.",
    it: "Mercurio è nell'ombra pre-retrograda. Potresti iniziare a sentire gli effetti retrogradi. Esegui il backup dei dati importanti, ricontrolla le comunicazioni e preparati a possibili ritardi nelle prossime settimane.",
    de: "Merkur ist im Vor-Rückläufigkeits-Schatten. Sie können beginnen, die rückläufigen Effekte zu spüren. Sichern Sie wichtige Daten, überprüfen Sie Kommunikationen doppelt und bereiten Sie sich auf mögliche Verzögerungen in den kommenden Wochen vor."
  },
  post_shadow: {
    en: "Mercury is in post-retrograde shadow. The retrograde effects are gradually clearing, but remain cautious with communication and contracts. Review lessons learned during the retrograde period.",
    es: "Mercurio está en sombra post-retrógrada. Los efectos retrógrados se están aclarando gradualmente, pero manténgase cauteloso con la comunicación y los contratos. Revise las lecciones aprendidas durante el período retrógrado.",
    fr: "Mercure est dans l'ombre post-rétrograde. Les effets rétrogrades se dissipent progressivement, mais restez prudent avec la communication et les contrats. Passez en revue les leçons apprises pendant la période rétrograde.",
    pt: "Mercúrio está na sombra pós-retrógrada. Os efeitos retrógrados estão gradualmente se dissipando, mas permaneça cauteloso com comunicação e contratos. Revise as lições aprendidas durante o período retrógrado.",
    it: "Mercurio è nell'ombra post-retrograda. Gli effetti retrogradi stanno gradualmente scomparendo, ma rimani cauto con la comunicazione e i contratti. Rivedi le lezioni apprese durante il periodo retrogrado.",
    de: "Merkur ist im Nach-Rückläufigkeits-Schatten. Die rückläufigen Effekte klären sich allmählich, bleiben Sie jedoch vorsichtig mit Kommunikation und Verträgen. Überprüfen Sie die während der Rückläufigkeitsperiode gelernten Lektionen."
  }
};

function parseDate(dateStr) {
  return new Date(dateStr + 'T12:00:00Z');
}

function getStatus(targetDate) {
  const target = parseDate(targetDate);

  for (const period of MERCURY_RETROGRADES) {
    const start = parseDate(period.starts);
    const end = parseDate(period.ends);

    // Shadow periods: 2 weeks before and after
    const preStart = new Date(start);
    preStart.setDate(preStart.getDate() - 14);

    const postEnd = new Date(end);
    postEnd.setDate(postEnd.getDate() + 14);

    // Check if in retrograde
    if (target >= start && target <= end) {
      return {
        status: 'retrograde',
        currentPeriod: {
          started: period.starts,
          ends: period.ends,
          sign: period.sign
        },
        nextPeriod: getNextPeriod(period)
      };
    }

    // Check if in pre-shadow
    if (target >= preStart && target < start) {
      return {
        status: 'pre_shadow',
        currentPeriod: {
          started: preStart.toISOString().split('T')[0],
          ends: period.starts,
          sign: period.sign
        },
        nextPeriod: {
          starts: period.starts,
          ends: period.ends,
          sign: period.sign
        }
      };
    }

    // Check if in post-shadow
    if (target > end && target <= postEnd) {
      return {
        status: 'post_shadow',
        currentPeriod: {
          started: period.ends,
          ends: postEnd.toISOString().split('T')[0],
          sign: period.sign
        },
        nextPeriod: getNextPeriod(period)
      };
    }
  }

  // Mercury is direct
  const nextRetro = MERCURY_RETROGRADES.find(p => parseDate(p.starts) > target);
  return {
    status: 'direct',
    currentPeriod: null,
    nextPeriod: nextRetro ? {
      starts: nextRetro.starts,
      ends: nextRetro.ends,
      sign: nextRetro.sign
    } : null
  };
}

function getNextPeriod(currentPeriod) {
  const currentIndex = MERCURY_RETROGRADES.indexOf(currentPeriod);
  const nextPeriod = MERCURY_RETROGRADES[currentIndex + 1];

  return nextPeriod ? {
    starts: nextPeriod.starts,
    ends: nextPeriod.ends,
    sign: nextPeriod.sign
  } : null;
}

function getIsraelDate(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

async function calculateMercuryStatus(targetDate) {
  console.log(`\n☿️  Calculating Mercury retrograde status for ${targetDate}...`);

  const statusInfo = getStatus(targetDate);

  const mercuryData = {
    date: targetDate,
    ...statusInfo,
    descriptions: STATUS_DESCRIPTIONS[statusInfo.status]
  };

  console.log(`  Status: ${statusInfo.status}`);
  if (statusInfo.currentPeriod) {
    console.log(`  Current period: ${statusInfo.currentPeriod.started} to ${statusInfo.currentPeriod.ends}`);
  }
  if (statusInfo.nextPeriod) {
    console.log(`  Next retrograde: ${statusInfo.nextPeriod.starts} to ${statusInfo.nextPeriod.ends}`);
  }

  return mercuryData;
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

  const mercuryDir = join(__dirname, '..', 'mercury');
  const targetFile = join(mercuryDir, `${targetDate}.json`);

  // Check if file already exists
  if (existsSync(targetFile)) {
    console.log(`⏭️  ${targetDate}.json already exists. Skipping.`);
    process.exit(0);
  }

  try {
    const mercuryData = await calculateMercuryStatus(targetDate);
    const jsonContent = JSON.stringify(mercuryData, null, 2);

    await writeFile(targetFile, jsonContent);
    console.log(`💾 Created ${targetDate}.json`);
    console.log(`✅ Mercury calculation complete!`);

  } catch (error) {
    console.error(`❌ Failed to calculate Mercury status:`, error.message);
    process.exit(1);
  }
}

main().catch(console.error);
