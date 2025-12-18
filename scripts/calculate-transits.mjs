#!/usr/bin/env node
/**
 * Planetary Transits Calculator
 * Calculates daily positions of all major planets in zodiac signs
 * Uses simplified astronomical calculations
 */

import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ZODIAC_SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

// Approximate orbital periods (in Earth days)
const ORBITAL_PERIODS = {
  sun: 365.25,      // Sun moves through zodiac in 1 year
  moon: 27.32,      // Moon's sidereal period
  mercury: 87.97,   // Mercury's synodic period (relative to Earth)
  venus: 224.70,    // Venus's synodic period
  mars: 686.98,     // Mars orbital period
  jupiter: 4332.59, // Jupiter orbital period (~11.86 years)
  saturn: 10759.22, // Saturn orbital period (~29.46 years)
  uranus: 30688.5,  // Uranus orbital period (~84.01 years)
  neptune: 60182,   // Neptune orbital period (~164.79 years)
  pluto: 90560      // Pluto orbital period (~248 years)
};

// Reference positions (approximations for Jan 1, 2025)
const REFERENCE_POSITIONS = {
  sun: { sign: 9, degree: 10 },      // Capricorn
  moon: { sign: 5, degree: 15 },     // Virgo (changes rapidly)
  mercury: { sign: 10, degree: 20 }, // Aquarius
  venus: { sign: 10, degree: 5 },    // Aquarius
  mars: { sign: 8, degree: 25 },     // Sagittarius
  jupiter: { sign: 4, degree: 10 },  // Leo (retrograde considerations)
  saturn: { sign: 10, degree: 15 },  // Aquarius
  uranus: { sign: 1, degree: 20 },   // Taurus
  neptune: { sign: 11, degree: 28 }, // Pisces
  pluto: { sign: 9, degree: 5 }      // Capricorn
};

// Multi-language transit descriptions
const TRANSIT_DESCRIPTIONS = {
  en: "The planetary transits shape the cosmic energies affecting all zodiac signs. Pay attention to aspects between your natal planets and current transits for personalized insights.",
  es: "Los tránsitos planetarios dan forma a las energías cósmicas que afectan a todos los signos del zodíaco. Preste atención a los aspectos entre sus planetas natales y los tránsitos actuales para obtener información personalizada.",
  fr: "Les transits planétaires façonnent les énergies cosmiques affectant tous les signes du zodiaque. Faites attention aux aspects entre vos planètes natales et les transits actuels pour des aperçus personnalisés.",
  pt: "Os trânsitos planetários moldam as energias cósmicas que afetam todos os signos do zodíaco. Preste atenção aos aspectos entre seus planetas natais e os trânsitos atuais para insights personalizados.",
  it: "I transiti planetari modellano le energie cosmiche che influenzano tutti i segni zodiacali. Presta attenzione agli aspetti tra i tuoi pianeti natali e i transiti attuali per approfondimenti personalizzati.",
  de: "Die Planetentransite formen die kosmischen Energien, die alle Sternzeichen beeinflussen. Achten Sie auf Aspekte zwischen Ihren Geburtsplaneten und aktuellen Transiten für personalisierte Einblicke."
};

/**
 * Calculate planet position for a given date
 */
function calculatePlanetPosition(planet, date, referenceDate = new Date('2025-01-01T00:00:00Z')) {
  const daysSinceReference = (date - referenceDate) / (1000 * 60 * 60 * 24);
  const period = ORBITAL_PERIODS[planet];
  const ref = REFERENCE_POSITIONS[planet];

  // Calculate how many degrees the planet has moved
  const degreesPerDay = 360 / period;
  const degreesMoved = (daysSinceReference * degreesPerDay) % 360;

  // Calculate total degree position (0-360)
  let totalDegree = (ref.sign * 30 + ref.degree + degreesMoved) % 360;
  if (totalDegree < 0) totalDegree += 360;

  // Convert to sign index and degree within sign
  const signIndex = Math.floor(totalDegree / 30);
  const degreeInSign = totalDegree % 30;

  // Check for retrograde motion (simplified)
  const isRetrograde = checkRetrograde(planet, date);

  return {
    sign: ZODIAC_SIGNS[signIndex],
    degree: Math.round(degreeInSign * 10) / 10,
    retrograde: isRetrograde
  };
}

/**
 * Simplified retrograde detection
 * In reality, this would use ephemeris data
 */
function checkRetrograde(planet, date) {
  // Outer planets spend significant time retrograde
  // This is a simplified approximation

  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);

  switch (planet) {
    case 'mercury':
      // Mercury retrogrades ~3 times per year, ~3 weeks each
      // Approximate using modulo
      return (dayOfYear % 120) < 21;

    case 'venus':
      // Venus retrogrades ~18 months, ~40 days
      return (dayOfYear % 540) < 40;

    case 'mars':
      // Mars retrogrades ~every 2 years, ~80 days
      return (dayOfYear % 730) < 80;

    case 'jupiter':
      // Jupiter retrogrades ~4 months per year
      return (dayOfYear % 365) > 60 && (dayOfYear % 365) < 180;

    case 'saturn':
      // Saturn retrogrades ~4.5 months per year
      return (dayOfYear % 365) > 80 && (dayOfYear % 365) < 210;

    case 'uranus':
    case 'neptune':
    case 'pluto':
      // Outer planets retrograde ~5 months per year
      return (dayOfYear % 365) > 100 && (dayOfYear % 365) < 250;

    default:
      return false;
  }
}

function getIsraelDate(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

async function calculateTransits(targetDate) {
  console.log(`\n🪐 Calculating planetary transits for ${targetDate}...`);

  const date = new Date(targetDate + 'T12:00:00Z');
  const planets = {};

  for (const planet of Object.keys(ORBITAL_PERIODS)) {
    planets[planet] = calculatePlanetPosition(planet, date);
    console.log(`  ${planet}: ${planets[planet].sign} ${planets[planet].degree}° ${planets[planet].retrograde ? '(R)' : ''}`);
  }

  const transitData = {
    date: targetDate,
    planets: planets,
    descriptions: TRANSIT_DESCRIPTIONS
  };

  return transitData;
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

  const transitsDir = join(__dirname, '..', 'transits');
  const targetFile = join(transitsDir, `${targetDate}.json`);

  // Check if file already exists
  if (existsSync(targetFile)) {
    console.log(`⏭️  ${targetDate}.json already exists. Skipping.`);
    process.exit(0);
  }

  try {
    const transitData = await calculateTransits(targetDate);
    const jsonContent = JSON.stringify(transitData, null, 2);

    await writeFile(targetFile, jsonContent);
    console.log(`💾 Created ${targetDate}.json`);
    console.log(`✅ Transit calculation complete!`);

  } catch (error) {
    console.error(`❌ Failed to calculate transits:`, error.message);
    process.exit(1);
  }
}

main().catch(console.error);
