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

function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

async function loadPreviousDays(count = 3) {
  const dailyDir = join(__dirname, '..', 'daily');
  try {
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
  } catch {
    return [];
  }
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
  
  return Array.from(sentences).slice(0, 20).join('\n');
}

async function generateSignHoroscope(sign, signName, targetDate, styleGuide, previousContent, attempt = 1) {
  const systemPrompt = `You are a professional astrologer writing a daily horoscope for ${signName} on ${targetDate}.

Style Guide Summary:
- Voice: Warm, encouraging, modern, grounded
- No medical/financial advice, no news/celebrity references
- Use second person (you/your)
- Inclusive language for all relationship statuses and career stages

CRITICAL WORD COUNT REQUIREMENTS - COUNT EVERY WORD:
- headline: MUST be 6-10 words (aim for 8 words)
- general: MUST be 90-140 words (aim for 115 words). MUST end with "Do this today:" followed by a specific action.
- love: MUST be 45-80 words (aim for 62 words)
- career: MUST be 45-80 words (aim for 62 words)
- mood: MUST be 20-40 words (aim for 30 words)

${previousContent ? `AVOID these phrases from recent days:\n${previousContent}` : ''}`;

  const userPrompt = `Write today's horoscope for ${signName}.

EXACT REQUIREMENTS:
1. headline: Write EXACTLY 7-9 words that capture the day's energy
2. general: Write EXACTLY 110-125 words. Cover multiple life areas. MUST end with "Do this today:" and one specific action.
3. love: Write EXACTLY 58-65 words about relationships. Address both singles and couples.
4. career: Write EXACTLY 58-65 words about work and finances.
5. mood: Write EXACTLY 26-32 words describing emotional tone.

Return ONLY valid JSON:
{
  "headline": "your 7-9 word headline",
  "general": "your 110-125 word general horoscope ending with Do this today:",
  "love": "your 58-65 word love horoscope",
  "career": "your 58-65 word career horoscope",
  "mood": "your 26-32 word mood description",
  "lucky_numbers": [num1, num2, num3],
  "lucky_color": "color"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    const horoscope = JSON.parse(content);
    
    // Add static fields
    horoscope.author = 'Astrologly';
    horoscope.image = '';
    
    // Ensure lucky numbers are integers
    if (horoscope.lucky_numbers) {
      horoscope.lucky_numbers = horoscope.lucky_numbers.map(n => parseInt(n));
    } else {
      horoscope.lucky_numbers = [
        Math.floor(Math.random() * 49) + 1,
        Math.floor(Math.random() * 49) + 1,
        Math.floor(Math.random() * 49) + 1
      ];
    }
    
    // Validate word counts
    const counts = {
      headline: countWords(horoscope.headline),
      general: countWords(horoscope.general),
      love: countWords(horoscope.love),
      career: countWords(horoscope.career),
      mood: countWords(horoscope.mood)
    };
    
    console.log(`  ${signName} (attempt ${attempt}): headline=${counts.headline}, general=${counts.general}, love=${counts.love}, career=${counts.career}, mood=${counts.mood}`);
    
    // Check if word counts are within acceptable range
    const valid = 
      counts.headline >= 6 && counts.headline <= 10 &&
      counts.general >= 90 && counts.general <= 140 &&
      counts.love >= 45 && counts.love <= 80 &&
      counts.career >= 45 && counts.career <= 80 &&
      counts.mood >= 20 && counts.mood <= 40;
    
    if (!valid && attempt < 3) {
      console.log(`    Retrying ${signName} due to word count issues...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return generateSignHoroscope(sign, signName, targetDate, styleGuide, previousContent, attempt + 1);
    }
    
    return horoscope;
  } catch (error) {
    console.error(`Error generating ${signName}:`, error.message);
    if (attempt < 3) {
      console.log(`    Retrying ${signName}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return generateSignHoroscope(sign, signName, targetDate, styleGuide, previousContent, attempt + 1);
    }
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
  
  // Process signs one by one with retries
  for (const sign of signs) {
    const previousContent = extractPreviousContent(previousDays, sign.slug);
    const horoscope = await generateSignHoroscope(
      sign.slug,
      sign.name,
      targetDate,
      styleGuide,
      previousContent
    );
    horoscopes.entries[sign.slug] = horoscope;
    
    // Small delay between signs
    await new Promise(resolve => setTimeout(resolve, 500));
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
    
    // Update current.json if generating today
    if (target === 'today') {
      await writeFile(join(dailyDir, 'current.json'), jsonContent);
      console.log('Updated current.json');
    }
    
    // Run validation
    console.log('Running validation...');
    try {
      execSync('npm run validate', { cwd: join(__dirname, '..'), stdio: 'inherit' });
      console.log('✅ Validation passed!');
    } catch (validationError) {
      console.error('❌ Validation failed. Please check the generated content.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Generation failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);