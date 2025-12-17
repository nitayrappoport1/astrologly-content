#!/usr/bin/env node
/**
 * Multi-Language Monthly Horoscope Generator
 * Generates monthly horoscopes for all 12 signs in all 6 supported languages
 * Uses OpenAI API with language-specific prompts
 */

import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Language configuration
const LANGUAGES = {
  en: {
    name: 'English',
    prompt: 'Write completely in English',
    dateFormat: 'en-US'
  },
  es: {
    name: 'Spanish',
    prompt: 'Escribe completamente en español. All content must be in Spanish.',
    dateFormat: 'es-ES'
  },
  fr: {
    name: 'French',
    prompt: 'Écris complètement en français. All content must be in French.',
    dateFormat: 'fr-FR'
  },
  pt: {
    name: 'Portuguese',
    prompt: 'Escreva completamente em português. All content must be in Portuguese.',
    dateFormat: 'pt-BR'
  },
  it: {
    name: 'Italian',
    prompt: 'Scrivi completamente in italiano. All content must be in Italian.',
    dateFormat: 'it-IT'
  },
  de: {
    name: 'German',
    prompt: 'Schreibe komplett auf Deutsch. All content must be in German.',
    dateFormat: 'de-DE'
  }
};

const SIGNS = [
  { slug: 'aries', name: { en: 'Aries', es: 'Aries', fr: 'Bélier', pt: 'Áries', it: 'Ariete', de: 'Widder' } },
  { slug: 'taurus', name: { en: 'Taurus', es: 'Tauro', fr: 'Taureau', pt: 'Touro', it: 'Toro', de: 'Stier' } },
  { slug: 'gemini', name: { en: 'Gemini', es: 'Géminis', fr: 'Gémeaux', pt: 'Gêmeos', it: 'Gemelli', de: 'Zwillinge' } },
  { slug: 'cancer', name: { en: 'Cancer', es: 'Cáncer', fr: 'Cancer', pt: 'Câncer', it: 'Cancro', de: 'Krebs' } },
  { slug: 'leo', name: { en: 'Leo', es: 'Leo', fr: 'Lion', pt: 'Leão', it: 'Leone', de: 'Löwe' } },
  { slug: 'virgo', name: { en: 'Virgo', es: 'Virgo', fr: 'Vierge', pt: 'Virgem', it: 'Vergine', de: 'Jungfrau' } },
  { slug: 'libra', name: { en: 'Libra', es: 'Libra', fr: 'Balance', pt: 'Libra', it: 'Bilancia', de: 'Waage' } },
  { slug: 'scorpio', name: { en: 'Scorpio', es: 'Escorpio', fr: 'Scorpion', pt: 'Escorpião', it: 'Scorpione', de: 'Skorpion' } },
  { slug: 'sagittarius', name: { en: 'Sagittarius', es: 'Sagitario', fr: 'Sagittaire', pt: 'Sagitário', it: 'Sagittario', de: 'Schütze' } },
  { slug: 'capricorn', name: { en: 'Capricorn', es: 'Capricornio', fr: 'Capricorne', pt: 'Capricórnio', it: 'Capricorno', de: 'Steinbock' } },
  { slug: 'aquarius', name: { en: 'Aquarius', es: 'Acuario', fr: 'Verseau', pt: 'Aquário', it: 'Acquario', de: 'Wassermann' } },
  { slug: 'pisces', name: { en: 'Pisces', es: 'Piscis', fr: 'Poissons', pt: 'Peixes', it: 'Pesci', de: 'Fische' } }
];

function getTargetMonth() {
  const date = new Date();
  // Get next month
  date.setMonth(date.getMonth() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function generateSignMonthly(sign, signName, targetMonth, language, langConfig) {
  console.log(`  Generating ${signName} in ${langConfig.name}...`);

  try {
    const styleGuide = `${langConfig.prompt}. Write in a warm, insightful, professional tone. Be specific and actionable. Use plain text only - NO markdown formatting (no **, ##, -, bullets, etc.). Write in flowing paragraphs.`;

    // Generate overview (150-200 words)
    const overviewPrompt = `Write a monthly overview horoscope for ${signName} for ${targetMonth}.
${langConfig.prompt}

MUST be EXACTLY 150-200 words. Cover the main themes and energies for the entire month.
Be comprehensive and insightful.
IMPORTANT: Write in plain text only. NO markdown formatting (no **, ##, -, bullets). Just flowing paragraphs.`;

    const overviewCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: overviewPrompt }
      ],
      max_completion_tokens: 300
    });
    const overview = overviewCompletion.choices[0].message.content.trim();

    // Generate love section (100-120 words)
    const lovePrompt = `Write monthly love and relationship forecast for ${signName} for ${targetMonth}.
${langConfig.prompt}

MUST be EXACTLY 100-120 words.
Cover romantic opportunities, relationship dynamics, and advice for both singles and couples.
IMPORTANT: Write in plain text only. NO markdown formatting (no **, ##, -, bullets). Just flowing paragraphs.`;

    const loveCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: lovePrompt }
      ],
      max_completion_tokens: 180
    });
    const love = loveCompletion.choices[0].message.content.trim();

    // Generate career section (100-120 words)
    const careerPrompt = `Write monthly career and professional forecast for ${signName} for ${targetMonth}.
${langConfig.prompt}

MUST be EXACTLY 100-120 words.
Include insights on work opportunities, professional growth, and career decisions.
IMPORTANT: Write in plain text only. NO markdown formatting (no **, ##, -, bullets). Just flowing paragraphs.`;

    const careerCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: careerPrompt }
      ],
      max_completion_tokens: 180
    });
    const career = careerCompletion.choices[0].message.content.trim();

    // Generate health section (80-100 words)
    const healthPrompt = `Write monthly health and wellness forecast for ${signName} for ${targetMonth}.
${langConfig.prompt}

MUST be EXACTLY 80-100 words.
Cover physical health, mental wellness, and self-care recommendations.
IMPORTANT: Write in plain text only. NO markdown formatting (no **, ##, -, bullets). Just flowing paragraphs.`;

    const healthCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: healthPrompt }
      ],
      max_completion_tokens: 150
    });
    const health = healthCompletion.choices[0].message.content.trim();

    // Generate key dates (3 important dates)
    const [year, month] = targetMonth.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    const keyDates = [
      `${targetMonth}-${String(Math.floor(daysInMonth * 0.2)).padStart(2, '0')}`,
      `${targetMonth}-${String(Math.floor(daysInMonth * 0.5)).padStart(2, '0')}`,
      `${targetMonth}-${String(Math.floor(daysInMonth * 0.85)).padStart(2, '0')}`
    ];

    // Generate key themes
    const themes = {
      en: ['transformation', 'communication', 'growth'],
      es: ['transformación', 'comunicación', 'crecimiento'],
      fr: ['transformation', 'communication', 'croissance'],
      pt: ['transformação', 'comunicação', 'crescimento'],
      it: ['trasformazione', 'comunicazione', 'crescita'],
      de: ['Transformation', 'Kommunikation', 'Wachstum']
    };

    const monthlyHoroscope = {
      overview,
      love,
      career,
      health,
      key_dates: keyDates,
      key_themes: themes[language],
      author: 'Astrologly'
    };

    // Log word counts
    const counts = {
      overview: overview.trim().split(/\s+/).length,
      love: love.trim().split(/\s+/).length,
      career: career.trim().split(/\s+/).length,
      health: health.trim().split(/\s+/).length
    };

    console.log(`    ✓ ${signName} (${langConfig.name}): o=${counts.overview}, l=${counts.love}, c=${counts.career}, h=${counts.health}`);

    return monthlyHoroscope;
  } catch (error) {
    console.error(`    ✗ Error generating ${signName} (${langConfig.name}):`, error.message);
    throw error;
  }
}

async function generateAllMonthly(targetMonth, language) {
  const langConfig = LANGUAGES[language];
  console.log(`\n📅 Generating monthly horoscopes for ${targetMonth} in ${langConfig.name}...`);

  const horoscopes = {
    month: targetMonth,
    language: language,
    entries: {}
  };

  // Process signs in batches of 3 to avoid rate limits
  for (let i = 0; i < SIGNS.length; i += 3) {
    const batch = SIGNS.slice(i, i + 3);
    const promises = batch.map(async (signData) => {
      const signName = signData.name[language];
      const horoscope = await generateSignMonthly(
        signData.slug,
        signName,
        targetMonth,
        language,
        langConfig
      );
      return { slug: signData.slug, horoscope };
    });

    const results = await Promise.all(promises);
    results.forEach(({ slug, horoscope }) => {
      horoscopes.entries[slug] = horoscope;
    });

    // Small delay between batches to avoid rate limits
    if (i + 3 < SIGNS.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`✅ Completed ${langConfig.name}`);
  return horoscopes;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const monthFlag = args.find(a => a.startsWith('--month='));
  const languageFlag = args.find(a => a.startsWith('--language='));

  const targetMonth = monthFlag ? monthFlag.split('=')[1] : getTargetMonth();
  const specificLanguage = languageFlag ? languageFlag.split('=')[1] : null;

  const monthlyDir = join(__dirname, '..', 'monthly');

  // Determine which languages to generate
  const languagesToGenerate = specificLanguage
    ? [specificLanguage]
    : Object.keys(LANGUAGES);

  console.log(`\n🌍 Multi-Language Monthly Horoscope Generator`);
  console.log(`📅 Target Month: ${targetMonth}`);
  console.log(`🌐 Languages: ${languagesToGenerate.join(', ')}`);
  console.log(`⏱️  Estimated time: ${languagesToGenerate.length * 3} minutes\n`);

  const startTime = Date.now();

  for (const lang of languagesToGenerate) {
    if (!LANGUAGES[lang]) {
      console.error(`❌ Unsupported language: ${lang}`);
      continue;
    }

    const filename = lang === 'en'
      ? `${targetMonth}.json`
      : `${targetMonth}-${lang}.json`;
    const targetFile = join(monthlyDir, filename);

    // Check if file already exists
    if (existsSync(targetFile)) {
      console.log(`⏭️  ${filename} already exists. Skipping.`);
      continue;
    }

    try {
      const horoscopes = await generateAllMonthly(targetMonth, lang);
      const jsonContent = JSON.stringify(horoscopes, null, 2);

      // Write dated file
      await writeFile(targetFile, jsonContent);
      console.log(`💾 Created ${filename}`);

      // Small delay between languages
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Failed to generate ${lang}:`, error.message);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Generation complete in ${elapsed} minutes!`);
}

main().catch(console.error);
