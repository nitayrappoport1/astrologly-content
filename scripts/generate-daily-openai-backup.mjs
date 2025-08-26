import OpenAI from 'openai';
import { readFile, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getIsraelDate(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

async function loadPreviousDays(count = 3) {
  const dailyDir = join(__dirname, '..', 'daily');
  const files = await readdir(dailyDir);
  const jsonFiles = files
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .reverse()
    .slice(0, count);
  
  const previous = [];
  for (const file of jsonFiles) {
    try {
      const content = await readFile(join(dailyDir, file), 'utf-8');
      previous.push(JSON.parse(content));
    } catch (e) {
      console.warn(`Could not load ${file}:`, e.message);
    }
  }
  return previous;
}

function extractPreviousContent(previousDays, sign) {
  if (!previousDays.length) return '';
  
  const sentences = new Set();
  previousDays.forEach(day => {
    const entry = day.entries?.[sign];
    if (entry) {
      ['headline', 'general', 'love', 'career', 'mood'].forEach(field => {
        if (entry[field]) {
          entry[field].split(/[.!?]+/).forEach(s => {
            const cleaned = s.trim();
            if (cleaned.length > 10) sentences.add(cleaned);
          });
        }
      });
    }
  });
  
  return Array.from(sentences).slice(0, 20).join('\n'); // Limit to avoid token overflow
}

async function generateSignHoroscope(sign, signName, targetDate, styleGuide, previousContent) {
  const systemPrompt = `You are a professional astrologer writing a daily horoscope for ${signName} on ${targetDate}.

${styleGuide}

CRITICAL: You MUST meet these EXACT word counts (count every single word):
- headline: EXACTLY 7-9 words
- general: EXACTLY 110-130 words. MUST end with "Do this today:" followed by one specific action.
- love: EXACTLY 55-70 words
- career: EXACTLY 55-70 words  
- mood: EXACTLY 25-35 words

Write engaging, specific content. Make it feel personal to ${signName}.

${previousContent ? `AVOID repeating these phrases from recent days:\n${previousContent}` : ''}`;

  const userPrompt = `Write a complete horoscope for ${signName} for ${targetDate}.

Return ONLY this JSON structure with NO other text:
{
  "headline": "7-9 word compelling headline here",
  "general": "110-130 words of main horoscope. Must be exactly in this range. Include varied sentence structures. Cover multiple life areas. End with 'Do this today:' and one specific action.",
  "love": "55-70 words about love and relationships. Be specific and actionable. Address both singles and couples.",
  "career": "55-70 words about career and finances. Include practical advice.",
  "mood": "25-35 words describing the emotional tone of the day.",
  "lucky_numbers": [3 random numbers between 1-50],
  "lucky_color": "one color word"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',  // Using gpt-4o-mini for cost effectiveness
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    const horoscope = JSON.parse(content);
    
    // Add static fields
    horoscope.author = 'Astrologly';
    horoscope.image = '';
    
    // Validate word counts
    const generalWords = horoscope.general.trim().split(/\s+/).length;
    const loveWords = horoscope.love.trim().split(/\s+/).length;
    const careerWords = horoscope.career.trim().split(/\s+/).length;
    const moodWords = horoscope.mood.trim().split(/\s+/).length;
    
    console.log(`  ${signName}: general=${generalWords}, love=${loveWords}, career=${careerWords}, mood=${moodWords}`);
    
    return horoscope;
  } catch (error) {
    console.error(`Error generating ${signName}:`, error.message);
    throw error;
  }
}

async function generateAllHoroscopes(targetDate) {
  const styleGuide = await readFile(join(__dirname, '..', 'templates', 'STYLE_GUIDE.md'), 'utf-8');
  const previousDays = await loadPreviousDays(3);
  
  const signs = [
    { slug: 'aries', name: 'Aries' },
    { slug: 'taurus', name: 'Taurus' },
    { slug: 'gemini', name: 'Gemini' },
    { slug: 'cancer', name: 'Cancer' },
    { slug: 'leo', name: 'Leo' },
    { slug: 'virgo', name: 'Virgo' },
    { slug: 'libra', name: 'Libra' },
    { slug: 'scorpio', name: 'Scorpio' },
    { slug: 'sagittarius', name: 'Sagittarius' },
    { slug: 'capricorn', name: 'Capricorn' },
    { slug: 'aquarius', name: 'Aquarius' },
    { slug: 'pisces', name: 'Pisces' }
  ];
  
  const horoscopes = {
    date: targetDate,
    tz: 'Asia/Jerusalem',
    entries: {}
  };
  
  console.log('Generating horoscopes for each sign...');
  
  // Process signs in batches of 3 to avoid rate limits
  for (let i = 0; i < signs.length; i += 3) {
    const batch = signs.slice(i, i + 3);
    const promises = batch.map(async (sign) => {
      const previousContent = extractPreviousContent(previousDays, sign.slug);
      const horoscope = await generateSignHoroscope(
        sign.slug,
        sign.name,
        targetDate,
        styleGuide,
        previousContent
      );
      return { slug: sign.slug, horoscope };
    });
    
    const results = await Promise.all(promises);
    results.forEach(({ slug, horoscope }) => {
      horoscopes.entries[slug] = horoscope;
    });
    
    // Small delay between batches to avoid rate limits
    if (i + 3 < signs.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return horoscopes;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const targetFlag = args.find(a => a.startsWith('--target='));
  const target = targetFlag ? targetFlag.split('=')[1] : 'tomorrow';
  
  let targetDate;
  if (target === 'tomorrow') {
    targetDate = getIsraelDate(1);
  } else if (target === 'today') {
    targetDate = getIsraelDate(0);
  } else {
    console.error('Invalid target. Use --target=today or --target=tomorrow');
    process.exit(1);
  }

  const dailyDir = join(__dirname, '..', 'daily');
  const targetFile = join(dailyDir, `${targetDate}.json`);
  
  // Check if file already exists
  if (existsSync(targetFile)) {
    console.log(`File ${targetDate}.json already exists. Skipping generation to maintain idempotency.`);
    if (target === 'tomorrow') {
      // Still update next.json if it's tomorrow
      const content = await readFile(targetFile, 'utf-8');
      await writeFile(join(dailyDir, 'next.json'), content);
      console.log('Updated next.json with existing tomorrow content');
    }
    return;
  }

  console.log(`Generating horoscopes for ${targetDate} (${target})...`);
  
  try {
    const horoscopes = await generateAllHoroscopes(targetDate);
    const jsonContent = JSON.stringify(horoscopes, null, 2);
    
    // Write dated file
    await writeFile(targetFile, jsonContent);
    console.log(`Created ${targetFile}`);
    
    // Update next.json if generating tomorrow
    if (target === 'tomorrow') {
      await writeFile(join(dailyDir, 'next.json'), jsonContent);
      console.log('Updated next.json');
    }
    
    // Run validation
    console.log('Running validation...');
    try {
      execSync('npm run validate', { cwd: join(__dirname, '..'), stdio: 'inherit' });
      console.log('Validation passed!');
    } catch (validationError) {
      console.error('Validation failed. Please check the generated content.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Generation failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);