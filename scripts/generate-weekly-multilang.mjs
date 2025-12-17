#!/usr/bin/env node
/**
 * Multi-Language Weekly Horoscope Generator
 * Generates weekly horoscopes for all 12 signs in all 6 supported languages
 * Uses OpenAI API with language-specific prompts
 */

import OpenAI from 'openai';
import { writeFile, mkdir } from 'fs/promises';
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

// Get ISO week number
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Get the target week (current or next)
function getTargetWeek(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + (offset * 7));
  return getISOWeek(date);
}

// Get week date range for display
function getWeekDateRange(weekStr) {
  const [year, week] = weekStr.split('-W');
  const jan4 = new Date(parseInt(year), 0, 4);
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - jan4.getDay() + 1 + (parseInt(week) - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return {
    start: weekStart.toISOString().split('T')[0],
    end: weekEnd.toISOString().split('T')[0]
  };
}

async function generateSignWeekly(sign, signName, targetWeek, language, langConfig) {
  console.log(`  Generating ${signName} in ${langConfig.name}...`);

  const weekRange = getWeekDateRange(targetWeek);

  try {
    const styleGuide = `${langConfig.prompt}. Write in a warm, insightful, professional tone. Be specific and actionable. Use plain text only - NO markdown formatting (no **, ##, -, bullets, etc.). Write in flowing paragraphs.`;

    // Generate overview (120-150 words)
    const overviewPrompt = `Write a weekly overview horoscope for ${signName} for the week of ${weekRange.start} to ${weekRange.end}.
${langConfig.prompt}

MUST be EXACTLY 120-150 words. Cover the main themes and energies for the entire week.
Be comprehensive, insightful, and provide specific guidance for the week ahead.
IMPORTANT: Write in plain text only. NO markdown formatting (no **, ##, -, bullets). Just flowing paragraphs.`;

    const overviewCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: overviewPrompt }
      ],
      max_completion_tokens: 250
    });
    const overview = overviewCompletion.choices[0].message.content.trim();

    // Generate love section (80-100 words)
    const lovePrompt = `Write weekly love and relationship forecast for ${signName} for the week of ${weekRange.start} to ${weekRange.end}.
${langConfig.prompt}

MUST be EXACTLY 80-100 words.
Cover romantic opportunities, relationship dynamics, and advice for both singles and couples.
IMPORTANT: Write in plain text only. NO markdown formatting (no **, ##, -, bullets). Just flowing paragraphs.`;

    const loveCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: lovePrompt }
      ],
      max_completion_tokens: 150
    });
    const love = loveCompletion.choices[0].message.content.trim();

    // Generate career section (80-100 words)
    const careerPrompt = `Write weekly career and professional forecast for ${signName} for the week of ${weekRange.start} to ${weekRange.end}.
${langConfig.prompt}

MUST be EXACTLY 80-100 words.
Include insights on work opportunities, professional growth, and career decisions for the week.
IMPORTANT: Write in plain text only. NO markdown formatting (no **, ##, -, bullets). Just flowing paragraphs.`;

    const careerCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: careerPrompt }
      ],
      max_completion_tokens: 150
    });
    const career = careerCompletion.choices[0].message.content.trim();

    // Generate health section (60-80 words)
    const healthPrompt = `Write weekly health and wellness forecast for ${signName} for the week of ${weekRange.start} to ${weekRange.end}.
${langConfig.prompt}

MUST be EXACTLY 60-80 words.
Cover physical health, mental wellness, and self-care recommendations for the week.
IMPORTANT: Write in plain text only. NO markdown formatting (no **, ##, -, bullets). Just flowing paragraphs.`;

    const healthCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: healthPrompt }
      ],
      max_completion_tokens: 120
    });
    const health = healthCompletion.choices[0].message.content.trim();

    // Generate key dates (3 important dates in the week)
    const keyDates = [
      weekRange.start,
      new Date(new Date(weekRange.start).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      weekRange.end
    ];

    // Generate key themes
    const themes = {
      en: ['growth', 'balance', 'opportunity'],
      es: ['crecimiento', 'equilibrio', 'oportunidad'],
      fr: ['croissance', 'équilibre', 'opportunité'],
      pt: ['crescimento', 'equilíbrio', 'oportunidade'],
      it: ['crescita', 'equilibrio', 'opportunità'],
      de: ['Wachstum', 'Gleichgewicht', 'Gelegenheit']
    };

    const weeklyHoroscope = {
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

    return weeklyHoroscope;
  } catch (error) {
    console.error(`    ✗ Error generating ${signName} (${langConfig.name}):`, error.message);
    throw error;
  }
}

async function generateAllWeekly(targetWeek, language) {
  const langConfig = LANGUAGES[language];
  console.log(`\n📅 Generating weekly horoscopes for ${targetWeek} in ${langConfig.name}...`);

  const horoscopes = {
    week: targetWeek,
    language: language,
    entries: {}
  };

  // Process signs in batches of 3 to avoid rate limits
  for (let i = 0; i < SIGNS.length; i += 3) {
    const batch = SIGNS.slice(i, i + 3);
    const promises = batch.map(async (signData) => {
      const signName = signData.name[language];
      const horoscope = await generateSignWeekly(
        signData.slug,
        signName,
        targetWeek,
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
  const weekFlag = args.find(a => a.startsWith('--week='));
  const languageFlag = args.find(a => a.startsWith('--language='));
  const nextWeek = args.includes('--next');

  const targetWeek = weekFlag ? weekFlag.split('=')[1] : getTargetWeek(nextWeek ? 1 : 0);
  const specificLanguage = languageFlag ? languageFlag.split('=')[1] : null;

  const weeklyDir = join(__dirname, '..', 'weekly');

  // Create weekly directory if it doesn't exist
  if (!existsSync(weeklyDir)) {
    await mkdir(weeklyDir, { recursive: true });
    console.log('📁 Created weekly directory');
  }

  // Determine which languages to generate
  const languagesToGenerate = specificLanguage
    ? [specificLanguage]
    : Object.keys(LANGUAGES);

  console.log(`\n🌍 Multi-Language Weekly Horoscope Generator`);
  console.log(`📅 Target Week: ${targetWeek}`);
  console.log(`🌐 Languages: ${languagesToGenerate.join(', ')}`);
  console.log(`⏱️  Estimated time: ${languagesToGenerate.length * 2} minutes\n`);

  const startTime = Date.now();

  for (const lang of languagesToGenerate) {
    if (!LANGUAGES[lang]) {
      console.error(`❌ Unsupported language: ${lang}`);
      continue;
    }

    const filename = lang === 'en'
      ? `${targetWeek}.json`
      : `${targetWeek}-${lang}.json`;
    const targetFile = join(weeklyDir, filename);

    // Check if file already exists
    if (existsSync(targetFile)) {
      console.log(`⏭️  ${filename} already exists. Skipping.`);
      continue;
    }

    try {
      const horoscopes = await generateAllWeekly(targetWeek, lang);
      const jsonContent = JSON.stringify(horoscopes, null, 2);

      // Write dated file
      await writeFile(targetFile, jsonContent);
      console.log(`💾 Created ${filename}`);

      // Create current.json for English (main file)
      if (lang === 'en') {
        const currentFile = join(weeklyDir, 'current.json');
        await writeFile(currentFile, jsonContent);
        console.log(`💾 Updated current.json`);
      }

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
