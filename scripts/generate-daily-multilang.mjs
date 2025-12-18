#!/usr/bin/env node
/**
 * Multi-Language Daily Horoscope Generator
 * Generates daily horoscopes for all 12 signs in all 6 supported languages
 * Uses OpenAI API with language-specific prompts
 */

import OpenAI from 'openai';
import { readFile, writeFile, readdir } from 'fs/promises';
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

function getIsraelDate(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

async function generateSignHoroscope(sign, signName, targetDate, language, langConfig) {
  console.log(`  Generating ${signName} in ${langConfig.name}...`);

  try {
    // Language-specific style guide - explicitly prohibit markdown
    const styleGuide = `${langConfig.prompt}. Write in a warm, insightful tone. Be specific and actionable.
CRITICAL: Do NOT use any markdown formatting. No headers (###), no bold (**), no italic (*), no bullet points, no labels like "Headline:" or "General:". Just plain flowing text.`;

    // Generate headline (7-9 words)
    const headlinePrompt = `Write a compelling horoscope headline for ${signName} on ${targetDate}.
${langConfig.prompt}
MUST be EXACTLY 7-9 words. Count each word carefully.
Return only the headline text, no quotes, no markdown, no labels. Just the headline sentence.`;

    const headlineCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: headlinePrompt }
      ],
      max_completion_tokens: 50
    });
    const headline = headlineCompletion.choices[0].message.content?.trim() || '';

    // Generate general horoscope (110-130 words)
    const generalPrompt = `Write the main daily horoscope for ${signName} on ${targetDate}.
${langConfig.prompt}

MUST be EXACTLY 110-130 words. Structure:
1. First 80-95 words: Main horoscope covering multiple life areas
2. Last 15-35 words: End with a specific action to take today

IMPORTANT: Write as plain flowing text. NO markdown (no ###, no **, no *), NO labels, NO headings. Just natural paragraphs.
Count every word carefully.`;

    const generalCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: generalPrompt }
      ],
      max_completion_tokens: 200
    });
    const general = generalCompletion.choices[0].message.content.trim();

    // Generate love section (55-70 words)
    const lovePrompt = `Write love and relationship advice for ${signName} on ${targetDate}.
${langConfig.prompt}

MUST be EXACTLY 55-70 words.
Address both singles and couples.
Be specific and actionable.
NO markdown, NO labels, NO headings. Plain text only.`;

    const loveCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: lovePrompt }
      ],
      max_completion_tokens: 120
    });
    const love = loveCompletion.choices[0].message.content.trim();

    // Generate career section (55-70 words)
    const careerPrompt = `Write career and financial advice for ${signName} on ${targetDate}.
${langConfig.prompt}

MUST be EXACTLY 55-70 words.
Include practical, actionable advice.
NO markdown, NO labels, NO headings. Plain text only.`;

    const careerCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: careerPrompt }
      ],
      max_completion_tokens: 120
    });
    const career = careerCompletion.choices[0].message.content.trim();

    // Generate mood section (25-35 words)
    const moodPrompt = `Describe the emotional tone and mood for ${signName} on ${targetDate}.
${langConfig.prompt}

MUST be EXACTLY 25-35 words.
Be descriptive and evocative.
NO markdown, NO labels, NO headings. Plain text only.`;

    const moodCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: moodPrompt }
      ],
      max_completion_tokens: 60
    });
    const mood = moodCompletion.choices[0].message.content.trim();

    // Generate lucky numbers and color (language-independent)
    const dateNum = parseInt(targetDate.replace(/-/g, ''));
    const signNum = sign.charCodeAt(0) + sign.charCodeAt(1);
    const luckyNumbers = [
      ((dateNum + signNum) % 50) + 1,
      ((dateNum * 2 + signNum) % 50) + 1,
      ((dateNum * 3 + signNum) % 50) + 1
    ];

    const colors = {
      en: ['red', 'blue', 'green', 'gold', 'purple', 'orange', 'silver', 'pink'],
      es: ['rojo', 'azul', 'verde', 'dorado', 'púrpura', 'naranja', 'plata', 'rosa'],
      fr: ['rouge', 'bleu', 'vert', 'or', 'violet', 'orange', 'argent', 'rose'],
      pt: ['vermelho', 'azul', 'verde', 'dourado', 'roxo', 'laranja', 'prata', 'rosa'],
      it: ['rosso', 'blu', 'verde', 'oro', 'viola', 'arancione', 'argento', 'rosa'],
      de: ['rot', 'blau', 'grün', 'gold', 'lila', 'orange', 'silber', 'rosa']
    };
    const luckyColor = colors[language][signNum % colors[language].length];

    const horoscope = {
      headline,
      general,
      love,
      career,
      mood,
      lucky_numbers: luckyNumbers,
      lucky_color: luckyColor,
      author: 'Astrologly',
      image: ''
    };

    // Log word counts
    const counts = {
      headline: headline.trim().split(/\s+/).length,
      general: general.trim().split(/\s+/).length,
      love: love.trim().split(/\s+/).length,
      career: career.trim().split(/\s+/).length,
      mood: mood.trim().split(/\s+/).length
    };

    console.log(`    ✓ ${signName} (${langConfig.name}): h=${counts.headline}, g=${counts.general}, l=${counts.love}, c=${counts.career}, m=${counts.mood}`);

    return horoscope;
  } catch (error) {
    console.error(`    ✗ Error generating ${signName} (${langConfig.name}):`, error.message);
    throw error;
  }
}

async function generateAllHoroscopes(targetDate, language) {
  const langConfig = LANGUAGES[language];
  console.log(`\n📅 Generating horoscopes for ${targetDate} in ${langConfig.name}...`);

  const horoscopes = {
    date: targetDate,
    language: language,
    tz: 'Asia/Jerusalem',
    entries: {}
  };

  // Process signs in batches of 3 to avoid rate limits
  for (let i = 0; i < SIGNS.length; i += 3) {
    const batch = SIGNS.slice(i, i + 3);
    const promises = batch.map(async (signData) => {
      const signName = signData.name[language];
      const horoscope = await generateSignHoroscope(
        signData.slug,
        signName,
        targetDate,
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
  const targetFlag = args.find(a => a.startsWith('--target='));
  const languageFlag = args.find(a => a.startsWith('--language='));

  const target = targetFlag ? targetFlag.split('=')[1] : 'tomorrow';
  const specificLanguage = languageFlag ? languageFlag.split('=')[1] : null;

  let targetDate;
  if (target === 'tomorrow') {
    targetDate = getIsraelDate(1);
  } else if (target === 'today') {
    targetDate = getIsraelDate(0);
  } else {
    console.error('❌ Invalid target. Use --target=today or --target=tomorrow');
    process.exit(1);
  }

  const dailyDir = join(__dirname, '..', 'daily');

  // Determine which languages to generate
  const languagesToGenerate = specificLanguage
    ? [specificLanguage]
    : Object.keys(LANGUAGES);

  console.log(`\n🌍 Multi-Language Daily Horoscope Generator`);
  console.log(`📅 Target Date: ${targetDate} (${target})`);
  console.log(`🌐 Languages: ${languagesToGenerate.join(', ')}`);
  console.log(`⏱️  Estimated time: ${languagesToGenerate.length * 2} minutes\n`);

  const startTime = Date.now();

  for (const lang of languagesToGenerate) {
    if (!LANGUAGES[lang]) {
      console.error(`❌ Unsupported language: ${lang}`);
      continue;
    }

    const filename = lang === 'en'
      ? `${targetDate}.json`
      : `${targetDate}-${lang}.json`;
    const targetFile = join(dailyDir, filename);

    // Check if file already exists
    if (existsSync(targetFile)) {
      console.log(`⏭️  ${filename} already exists. Skipping.`);

      // Update current/next if needed
      if (target === 'tomorrow' && lang === 'en') {
        const content = await readFile(targetFile, 'utf-8');
        await writeFile(join(dailyDir, 'next.json'), content);
      }
      continue;
    }

    try {
      const horoscopes = await generateAllHoroscopes(targetDate, lang);
      const jsonContent = JSON.stringify(horoscopes, null, 2);

      // Write dated file
      await writeFile(targetFile, jsonContent);
      console.log(`💾 Created ${filename}`);

      // Update current.json or next.json for English
      if (lang === 'en') {
        if (target === 'tomorrow') {
          await writeFile(join(dailyDir, 'next.json'), jsonContent);
          console.log(`💾 Updated next.json`);
        }
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
