/**
 * Send Daily Horoscopes to Beehiiv Segments
 *
 * This script reads today's horoscope content from the daily JSON files
 * and sends personalized emails to each zodiac sign segment via Beehiiv API.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;

const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

// Sign symbols for email headers
const SIGN_SYMBOLS = {
  aries: '♈',
  taurus: '♉',
  gemini: '♊',
  cancer: '♋',
  leo: '♌',
  virgo: '♍',
  libra: '♎',
  scorpio: '♏',
  sagittarius: '♐',
  capricorn: '♑',
  aquarius: '♒',
  pisces: '♓'
};

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Format date for display
 */
function formatDisplayDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Read horoscope content from local JSON file
 */
function getHoroscopeContent(date) {
  const filePath = path.join(__dirname, '..', 'daily', `${date}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Horoscope file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Get segment ID by name from Beehiiv
 */
async function getSegmentId(segmentName) {
  const response = await fetch(
    `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/segments`,
    {
      headers: {
        'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to fetch segments:', error);
    return null;
  }

  const data = await response.json();
  const segment = data.data?.find(s => s.name.toLowerCase() === segmentName.toLowerCase());
  return segment?.id;
}

/**
 * Format horoscope content as HTML email
 */
function formatEmailContent(sign, horoscope, date) {
  const symbol = SIGN_SYMBOLS[sign];
  const displayDate = formatDisplayDate(date);
  const signName = capitalize(sign);

  // Clean up markdown from general section
  const general = horoscope.general
    .replace(/###?\s*/g, '')
    .replace(/\*\*[^*]+\*\*:?\s*/g, '')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, ' ');

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Georgia, serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #6b46c1; font-size: 28px; margin-bottom: 5px; }
    h2 { color: #553c9a; font-size: 20px; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .date { color: #718096; font-size: 14px; margin-bottom: 20px; }
    .headline { font-style: italic; color: #553c9a; font-size: 18px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .lucky-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin: 25px 0; }
    .lucky-box h3 { margin-top: 0; color: white; }
    .cta-button { display: inline-block; background: #6b46c1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <h1>${symbol} ${signName} Daily Horoscope</h1>
  <p class="date">${displayDate}</p>

  <p class="headline">"${horoscope.headline}"</p>

  <div class="section">
    <p>${general}</p>
  </div>

  <h2>Love & Relationships</h2>
  <div class="section">
    <p>${horoscope.love}</p>
  </div>

  <h2>Career & Finance</h2>
  <div class="section">
    <p>${horoscope.career}</p>
  </div>

  <h2>Today's Mood</h2>
  <div class="section">
    <p>${horoscope.mood}</p>
  </div>

  <div class="lucky-box">
    <h3>Today's Lucky Elements</h3>
    <p><strong>Lucky Numbers:</strong> ${horoscope.lucky_numbers.join(', ')}</p>
    <p><strong>Lucky Color:</strong> ${capitalize(horoscope.lucky_color)}</p>
  </div>

  <p style="text-align: center;">
    <a href="https://astrologly.com/horoscope/today/${sign}" class="cta-button">
      Read Full Horoscope on Astrologly
    </a>
  </p>

  <div class="footer">
    <p>Sent with cosmic love by <a href="https://astrologly.com">Astrologly</a></p>
    <p>You're receiving this because you subscribed to ${signName} horoscopes.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send horoscope email to a specific segment
 */
async function sendHoroscopeEmail(sign, horoscope, date) {
  const segmentName = `${capitalize(sign)} Subscribers`;
  const segmentId = await getSegmentId(segmentName);

  if (!segmentId) {
    console.log(`  Segment not found: "${segmentName}", skipping...`);
    return false;
  }

  const signName = capitalize(sign);
  const symbol = SIGN_SYMBOLS[sign];
  const emailContent = formatEmailContent(sign, horoscope, date);

  // Create and send post
  const response = await fetch(
    `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/posts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `${symbol} Your ${signName} Horoscope for Today`,
        subtitle: horoscope.headline,
        content: emailContent,
        segment_ids: [segmentId],
        status: 'confirmed', // Sends immediately
        send_to_email: true,
        send_to_web: false
      })
    }
  );

  if (response.ok) {
    console.log(`  ${symbol} Sent to ${signName} Subscribers`);
    return true;
  } else {
    const error = await response.json();
    console.error(`  Failed to send to ${signName}:`, error);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('===========================================');
  console.log('   Astrologly Daily Horoscope Sender');
  console.log('===========================================\n');

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
    console.error('Error: Missing Beehiiv credentials!');
    console.error('Please set BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID environment variables.');
    process.exit(1);
  }

  const today = getTodayDate();
  console.log(`Date: ${formatDisplayDate(today)}`);
  console.log(`File: daily/${today}.json\n`);

  // Load today's horoscopes
  let horoscopeData;
  try {
    horoscopeData = getHoroscopeContent(today);
    console.log(`Loaded horoscope data for ${today}\n`);
  } catch (error) {
    console.error(`Error loading horoscope data: ${error.message}`);
    process.exit(1);
  }

  console.log('Sending horoscopes to segments...\n');

  let successCount = 0;
  let failCount = 0;

  for (const sign of SIGNS) {
    const horoscope = horoscopeData.entries[sign];

    if (!horoscope) {
      console.log(`  Warning: No horoscope data for ${sign}`);
      failCount++;
      continue;
    }

    try {
      const success = await sendHoroscopeEmail(sign, horoscope, today);
      if (success) successCount++;
      else failCount++;

      // Rate limiting - wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`  Error sending ${sign}: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n===========================================');
  console.log(`   Complete! Sent: ${successCount}, Failed: ${failCount}`);
  console.log('===========================================');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
