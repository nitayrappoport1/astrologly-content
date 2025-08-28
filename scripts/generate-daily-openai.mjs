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
  try {
    // Generate each section separately for better word count control
    const sections = {};
    
    // Generate headline (7-9 words)
    const headlinePrompt = `Write a compelling horoscope headline for ${signName} on ${targetDate}.
MUST be EXACTLY 7-9 words. Count each word carefully.
Return only the headline text, no quotes or punctuation wrapping.`;
    
    const headlineCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are writing a horoscope headline. ${styleGuide}` },
        { role: 'user', content: headlinePrompt }
      ],
      temperature: 0.8,
      max_tokens: 50
    });
    if (!headlineCompletion.choices[0].message.content) {
      console.error(`Empty headline response for ${signName}`);
      console.error('Response:', JSON.stringify(headlineCompletion, null, 2));
    }
    sections.headline = headlineCompletion.choices[0].message.content?.trim() || '';

    // Generate general horoscope (110-130 words)
    const generalPrompt = `Write the main daily horoscope for ${signName} on ${targetDate}.

MUST be EXACTLY 110-130 words. Structure:
1. First 80-95 words: Main horoscope covering multiple life areas
2. Last 15-35 words: MUST end with "Do this today:" followed by one specific action

Count every word carefully. Write engaging, varied content.${previousContent ? `\n\nAvoid these recent phrases:\n${previousContent.slice(0, 500)}` : ''}`;
    
    const generalCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are a professional astrologer. ${styleGuide}` },
        { role: 'user', content: generalPrompt }
      ],
      temperature: 0.8,
      max_tokens: 200
    });
    sections.general = generalCompletion.choices[0].message.content.trim();

    // Generate love section (55-70 words)
    const lovePrompt = `Write love and relationship advice for ${signName} on ${targetDate}.

MUST be EXACTLY 55-70 words.
Address both singles and couples.
Be specific and actionable.
Count every word carefully.`;
    
    const loveCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are writing relationship advice. ${styleGuide}` },
        { role: 'user', content: lovePrompt }
      ],
      temperature: 0.8,
      max_tokens: 120
    });
    sections.love = loveCompletion.choices[0].message.content.trim();

    // Generate career section (55-70 words)
    const careerPrompt = `Write career and financial advice for ${signName} on ${targetDate}.

MUST be EXACTLY 55-70 words.
Include practical, actionable advice.
Count every word carefully.`;
    
    const careerCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are writing career guidance. ${styleGuide}` },
        { role: 'user', content: careerPrompt }
      ],
      temperature: 0.8,
      max_tokens: 120
    });
    sections.career = careerCompletion.choices[0].message.content.trim();

    // Generate mood section (25-35 words)
    const moodPrompt = `Describe the emotional tone and mood for ${signName} on ${targetDate}.

MUST be EXACTLY 25-35 words.
Be descriptive and evocative.
Count every word carefully.`;
    
    const moodCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are describing today's mood. ${styleGuide}` },
        { role: 'user', content: moodPrompt }
      ],
      temperature: 0.8,
      max_tokens: 60
    });
    sections.mood = moodCompletion.choices[0].message.content.trim();

    // Generate lucky numbers and color
    let luckyData = { numbers: [], color: '' };
    try {
      const luckyPrompt = `For ${signName} on ${targetDate}, provide:
1. Three lucky numbers between 1-50
2. One lucky color

Return as JSON: {"numbers": [n1, n2, n3], "color": "color"}`;
      
      const luckyCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: luckyPrompt }
        ],
        temperature: 0.9,
        max_tokens: 100,
        response_format: { type: 'json_object' }
      });
      
      luckyData = JSON.parse(luckyCompletion.choices[0].message.content);
    } catch (e) {
      // Fallback to deterministic lucky numbers based on sign and date
      const dateNum = parseInt(targetDate.replace(/-/g, ''));
      const signNum = sign.charCodeAt(0) + sign.charCodeAt(1);
      luckyData = {
        numbers: [
          ((dateNum + signNum) % 50) + 1,
          ((dateNum * 2 + signNum) % 50) + 1,
          ((dateNum * 3 + signNum) % 50) + 1
        ],
        color: ['red', 'blue', 'green', 'gold', 'purple', 'orange'][signNum % 6]
      };
      console.warn(`  Using fallback lucky data for ${signName}`);
    }

    // Construct final horoscope
    const horoscope = {
      headline: sections.headline,
      general: sections.general,
      love: sections.love,
      career: sections.career,
      mood: sections.mood,
      lucky_numbers: luckyData.numbers || [7, 21, 35],
      lucky_color: luckyData.color || 'blue',
      author: 'Astrologly',
      image: ''
    };

    // Validate word counts
    const generalWords = horoscope.general.trim().split(/\s+/).length;
    const loveWords = horoscope.love.trim().split(/\s+/).length;
    const careerWords = horoscope.career.trim().split(/\s+/).length;
    const moodWords = horoscope.mood.trim().split(/\s+/).length;
    const headlineWords = horoscope.headline.trim().split(/\s+/).length;

    console.log(`  ${signName}: headline=${headlineWords}, general=${generalWords}, love=${loveWords}, career=${careerWords}, mood=${moodWords}`);

    // Retry sections that are out of bounds
    if (generalWords < 110 || generalWords > 130) {
      console.log(`  Retrying general section for ${signName} (was ${generalWords} words)`);
      const retryPrompt = `Rewrite this to be EXACTLY ${generalWords < 110 ? '115' : '120'} words:\n\n${horoscope.general}\n\nMUST end with "Do this today:" followed by action.`;
      const retry = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: retryPrompt }],
        temperature: 0.7,
        max_tokens: 200
      });
      horoscope.general = retry.choices[0].message.content.trim();
    }

    if (loveWords < 55 || loveWords > 70) {
      console.log(`  Retrying love section for ${signName} (was ${loveWords} words)`);
      const retryPrompt = `Rewrite this to be EXACTLY ${loveWords < 55 ? '60' : '63'} words:\n\n${horoscope.love}`;
      const retry = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: retryPrompt }],
        temperature: 0.7,
        max_tokens: 120
      });
      horoscope.love = retry.choices[0].message.content.trim();
    }

    if (careerWords < 55 || careerWords > 70) {
      console.log(`  Retrying career section for ${signName} (was ${careerWords} words)`);
      const retryPrompt = `Rewrite this to be EXACTLY ${careerWords < 55 ? '60' : '63'} words:\n\n${horoscope.career}`;
      const retry = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: retryPrompt }],
        temperature: 0.7,
        max_tokens: 120
      });
      horoscope.career = retry.choices[0].message.content.trim();
    }

    if (moodWords < 25 || moodWords > 35) {
      console.log(`  Retrying mood section for ${signName} (was ${moodWords} words)`);
      const retryPrompt = `Rewrite this to be EXACTLY ${moodWords < 25 ? '28' : '30'} words:\n\n${horoscope.mood}`;
      const retry = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: retryPrompt }],
        temperature: 0.7,
        max_tokens: 60
      });
      horoscope.mood = retry.choices[0].message.content.trim();
    }

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