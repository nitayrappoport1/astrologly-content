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

function extractPreviousContent(previousDays) {
  if (!previousDays.length) return '';
  
  const sentences = new Set();
  previousDays.forEach(day => {
    Object.values(day.entries || {}).forEach(entry => {
      ['headline', 'general', 'love', 'career', 'mood'].forEach(field => {
        if (entry[field]) {
          entry[field].split(/[.!?]+/).forEach(s => {
            const cleaned = s.trim();
            if (cleaned.length > 10) sentences.add(cleaned);
          });
        }
      });
    });
  });
  
  return Array.from(sentences).join('\n');
}

async function generateHoroscopes(targetDate) {
  const styleGuide = await readFile(join(__dirname, '..', 'templates', 'STYLE_GUIDE.md'), 'utf-8');
  const previousDays = await loadPreviousDays(3);
  const avoidSentences = extractPreviousContent(previousDays);
  
  const systemPrompt = `You are a professional astrologer writing daily horoscopes for Astrologly.
Follow the style guide exactly. Generate horoscopes for all 12 zodiac signs for ${targetDate}.
Return ONLY valid JSON matching the exact schema provided, no other text.

${styleGuide}

IMPORTANT: Avoid repeating any of these sentences from recent days:
${avoidSentences ? avoidSentences : '(No previous content to avoid)'}`;

  const userPrompt = `Generate complete daily horoscopes for ${targetDate} for all 12 zodiac signs.
Return a JSON object with this exact structure:
{
  "date": "${targetDate}",
  "tz": "Asia/Jerusalem",
  "entries": {
    "aries": { "headline": "", "general": "", "love": "", "career": "", "mood": "", "lucky_numbers": [], "lucky_color": "", "author": "Astrologly", "image": "" },
    "taurus": { ... },
    "gemini": { ... },
    "cancer": { ... },
    "leo": { ... },
    "virgo": { ... },
    "libra": { ... },
    "scorpio": { ... },
    "sagittarius": { ... },
    "capricorn": { ... },
    "aquarius": { ... },
    "pisces": { ... }
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.9,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    const horoscopes = JSON.parse(content);
    
    // Ensure required fields
    horoscopes.date = targetDate;
    horoscopes.tz = 'Asia/Jerusalem';
    
    // Validate all signs present
    const requiredSigns = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 
                          'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    for (const sign of requiredSigns) {
      if (!horoscopes.entries[sign]) {
        throw new Error(`Missing sign: ${sign}`);
      }
      // Ensure static fields
      horoscopes.entries[sign].author = 'Astrologly';
      horoscopes.entries[sign].image = '';
    }
    
    return horoscopes;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
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
    const horoscopes = await generateHoroscopes(targetDate);
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