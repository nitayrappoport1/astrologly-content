#!/usr/bin/env node
/**
 * Multi-Language Daily Career Horoscope Generator
 * Generates daily career horoscopes for all 12 signs in all 6 supported languages
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
    focusAreas: ['leadership', 'innovation', 'stability', 'growth', 'collaboration', 'strategy']
  },
  es: {
    name: 'Spanish',
    prompt: 'Escribe completamente en español. All content must be in Spanish.',
    focusAreas: ['liderazgo', 'innovación', 'estabilidad', 'crecimiento', 'colaboración', 'estrategia']
  },
  fr: {
    name: 'French',
    prompt: 'Écris complètement en français. All content must be in French.',
    focusAreas: ['leadership', 'innovation', 'stabilité', 'croissance', 'collaboration', 'stratégie']
  },
  pt: {
    name: 'Portuguese',
    prompt: 'Escreva completamente em português. All content must be in Portuguese.',
    focusAreas: ['liderança', 'inovação', 'estabilidade', 'crescimento', 'colaboração', 'estratégia']
  },
  it: {
    name: 'Italian',
    prompt: 'Scrivi completamente in italiano. All content must be in Italian.',
    focusAreas: ['leadership', 'innovazione', 'stabilità', 'crescita', 'collaborazione', 'strategia']
  },
  de: {
    name: 'German',
    prompt: 'Schreibe komplett auf Deutsch. All content must be in German.',
    focusAreas: ['Führung', 'Innovation', 'Stabilität', 'Wachstum', 'Zusammenarbeit', 'Strategie']
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

async function generateSignCareer(sign, signName, targetDate, language, langConfig) {
  console.log(`  Generating ${signName} in ${langConfig.name}...`);

  try {
    const styleGuide = `${langConfig.prompt}. Write in a professional, strategic, insightful tone. Be specific and actionable.`;

    // Generate professional guidance (70-90 words)
    const professionalPrompt = `Write career and work guidance for ${signName} on ${targetDate}.
${langConfig.prompt}

MUST be EXACTLY 70-90 words.
Focus on work tasks, projects, professional opportunities, and workplace dynamics.`;

    const professionalCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: professionalPrompt }
      ],
      max_completion_tokens: 140
    });
    const professional = professionalCompletion.choices[0].message.content.trim();

    // Generate financial guidance (50-70 words)
    const financialPrompt = `Write financial and money guidance for ${signName} on ${targetDate}.
${langConfig.prompt}

MUST be EXACTLY 50-70 words.
Focus on financial decisions, investments, and money management.`;

    const financialCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: financialPrompt }
      ],
      max_completion_tokens: 110
    });
    const financial = financialCompletion.choices[0].message.content.trim();

    // Generate networking guidance (40-50 words)
    const networkingPrompt = `Write networking and collaboration advice for ${signName} on ${targetDate}.
${langConfig.prompt}

MUST be EXACTLY 40-50 words.
Focus on professional connections, teamwork, and relationship building.`;

    const networkingCompletion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: styleGuide },
        { role: 'user', content: networkingPrompt }
      ],
      max_completion_tokens: 80
    });
    const networking = networkingCompletion.choices[0].message.content.trim();

    // Select focus area based on sign
    const signNum = sign.charCodeAt(0) + sign.charCodeAt(1);
    const focusArea = langConfig.focusAreas[signNum % langConfig.focusAreas.length];

    const careerHoroscope = {
      professional,
      financial,
      networking,
      focus_area: focusArea,
      author: 'Astrologly'
    };

    // Log word counts
    const counts = {
      professional: professional.trim().split(/\s+/).length,
      financial: financial.trim().split(/\s+/).length,
      networking: networking.trim().split(/\s+/).length
    };

    console.log(`    ✓ ${signName} (${langConfig.name}): p=${counts.professional}, f=${counts.financial}, n=${counts.networking}`);

    return careerHoroscope;
  } catch (error) {
    console.error(`    ✗ Error generating ${signName} (${langConfig.name}):`, error.message);
    throw error;
  }
}

async function generateAllCareer(targetDate, language) {
  const langConfig = LANGUAGES[language];
  console.log(`\n💼 Generating career horoscopes for ${targetDate} in ${langConfig.name}...`);

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
      const horoscope = await generateSignCareer(
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

  const careerDir = join(__dirname, '..', 'career');

  // Determine which languages to generate
  const languagesToGenerate = specificLanguage
    ? [specificLanguage]
    : Object.keys(LANGUAGES);

  console.log(`\n🌍 Multi-Language Career Horoscope Generator`);
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
    const targetFile = join(careerDir, filename);

    // Check if file already exists
    if (existsSync(targetFile)) {
      console.log(`⏭️  ${filename} already exists. Skipping.`);
      continue;
    }

    try {
      const horoscopes = await generateAllCareer(targetDate, lang);
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
