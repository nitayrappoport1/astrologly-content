#!/usr/bin/env node
/**
 * Multi-Language Daily Love Horoscope Generator
 * Generates daily love horoscopes for all 12 signs in all 6 supported languages
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
    moods: ['romantic', 'passionate', 'reflective', 'cautious', 'playful', 'serious']
  },
  es: {
    name: 'Spanish',
    prompt: 'Escribe completamente en español. All content must be in Spanish.',
    moods: ['romántico', 'apasionado', 'reflexivo', 'cauteloso', 'juguetón', 'serio']
  },
  fr: {
    name: 'French',
    prompt: 'Écris complètement en français. All content must be in French.',
    moods: ['romantique', 'passionné', 'réfléchi', 'prudent', 'enjoué', 'sérieux']
  },
  pt: {
    name: 'Portuguese',
    prompt: 'Escreva completamente em português. All content must be in Portuguese.',
    moods: ['romântico', 'apaixonado', 'reflexivo', 'cauteloso', 'brincalhão', 'sério']
  },
  it: {
    name: 'Italian',
    prompt: 'Scrivi completamente in italiano. All content must be in Italian.',
    moods: ['romantico', 'appassionato', 'riflessivo', 'cauto', 'giocoso', 'serio']
  },
  de: {
    name: 'German',
    prompt: 'Schreibe komplett auf Deutsch. All content must be in German.',
    moods: ['romantisch', 'leidenschaftlich', 'nachdenklich', 'vorsichtig', 'verspielt', 'ernst']
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

async function generateSignLove(sign, signName, targetDate, language, langConfig) {
  console.log(`  Generating ${signName} in ${langConfig.name}...`);

  try {
    const styleGuide = `${langConfig.prompt}. Write in a warm, romantic, insightful tone. Be specific and actionable.`;

    // Generate singles advice (60-80 words)
    const singlesPrompt = `Write love advice for single ${signName} individuals on ${targetDate}.
${langConfig.prompt}

MUST be EXACTLY 60-80 words.
Focus on dating opportunities, meeting new people, and romantic prospects.`;

    const singlesCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: singlesPrompt }
      ],
      max_completion_tokens: 130
    });
    const singles = singlesCompletion.choices[0].message.content.trim();

    // Generate couples advice (60-80 words)
    const couplesPrompt = `Write relationship advice for ${signName} in a relationship on ${targetDate}.
${langConfig.prompt}

MUST be EXACTLY 60-80 words.
Focus on strengthening bonds, communication, and romantic gestures.`;

    const couplesCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: couplesPrompt }
      ],
      max_completion_tokens: 130
    });
    const couples = couplesCompletion.choices[0].message.content.trim();

    // Generate specific action
    const actionPrompt = `Write one specific romantic action ${signName} should take today (${targetDate}).
${langConfig.prompt}

MUST be a single, actionable sentence (15-25 words).`;

    const actionCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: actionPrompt }
      ],
      max_completion_tokens: 50
    });
    const action = actionCompletion.choices[0].message.content.trim();

    // Select mood based on sign
    const signNum = sign.charCodeAt(0) + sign.charCodeAt(1);
    const mood = langConfig.moods[signNum % langConfig.moods.length];

    const loveHoroscope = {
      singles,
      couples,
      mood,
      action,
      author: 'Astrologly'
    };

    // Log word counts
    const counts = {
      singles: singles.trim().split(/\s+/).length,
      couples: couples.trim().split(/\s+/).length,
      action: action.trim().split(/\s+/).length
    };

    console.log(`    ✓ ${signName} (${langConfig.name}): s=${counts.singles}, c=${counts.couples}, a=${counts.action}`);

    return loveHoroscope;
  } catch (error) {
    console.error(`    ✗ Error generating ${signName} (${langConfig.name}):`, error.message);
    throw error;
  }
}

async function generateAllLove(targetDate, language) {
  const langConfig = LANGUAGES[language];
  console.log(`\n💕 Generating love horoscopes for ${targetDate} in ${langConfig.name}...`);

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
      const horoscope = await generateSignLove(
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

  const loveDir = join(__dirname, '..', 'love');

  // Determine which languages to generate
  const languagesToGenerate = specificLanguage
    ? [specificLanguage]
    : Object.keys(LANGUAGES);

  console.log(`\n🌍 Multi-Language Love Horoscope Generator`);
  console.log(`📅 Target Date: ${targetDate} (${target})`);
  console.log(`🌐 Languages: ${languagesToGenerate.join(', ')}`);
  console.log(`⏱️  Estimated time: ${languagesToGenerate.length * 1.5} minutes\n`);

  const startTime = Date.now();

  for (const lang of languagesToGenerate) {
    if (!LANGUAGES[lang]) {
      console.error(`❌ Unsupported language: ${lang}`);
      continue;
    }

    const filename = lang === 'en'
      ? `${targetDate}.json`
      : `${targetDate}-${lang}.json`;
    const targetFile = join(loveDir, filename);

    // Check if file already exists
    if (existsSync(targetFile)) {
      console.log(`⏭️  ${filename} already exists. Skipping.`);
      continue;
    }

    try {
      const horoscopes = await generateAllLove(targetDate, lang);
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
