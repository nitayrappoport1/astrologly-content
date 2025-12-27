/**
 * Send Daily Horoscopes via Resend
 *
 * This script reads today's horoscope content from the daily JSON files
 * and sends personalized emails to each zodiac sign subscriber via Resend API.
 */

import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resend = new Resend(process.env.RESEND_API_KEY);
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'horoscope@astrologly.com';

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
function formatDisplayDate(dateStr, language = 'en') {
  const date = new Date(dateStr + 'T00:00:00');
  const locales = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    pt: 'pt-BR',
    de: 'de-DE',
    it: 'it-IT'
  };
  return date.toLocaleDateString(locales[language] || 'en-US', {
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
 * Get all contacts for a specific zodiac sign
 */
async function getContactsBySign(sign) {
  const contacts = [];
  let cursor = undefined;

  try {
    do {
      const params = { audienceId: AUDIENCE_ID };
      if (cursor) params.cursor = cursor;

      const { data, error } = await resend.contacts.list(params);

      if (error) {
        console.error('Error fetching contacts:', error);
        break;
      }

      if (data?.data) {
        // Filter by sign (stored in first_name field - Resend uses snake_case)
        const signContacts = data.data.filter(
          contact => contact.first_name?.toLowerCase() === sign.toLowerCase() && !contact.unsubscribed
        );
        contacts.push(...signContacts);
      }

      cursor = data?.cursor;
    } while (cursor);

    return contacts;
  } catch (error) {
    console.error(`Error getting contacts for ${sign}:`, error);
    return [];
  }
}

/**
 * Format horoscope content as HTML email
 */
function formatEmailContent(sign, horoscope, date, language = 'en') {
  const symbol = SIGN_SYMBOLS[sign];
  const displayDate = formatDisplayDate(date, language);
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
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${signName} Daily Horoscope</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; padding: 32px; color: white; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">${symbol}</div>
      <h1 style="margin: 0 0 8px 0; font-size: 28px;">${signName} Daily Horoscope</h1>
      <p style="margin: 0; opacity: 0.8;">${displayDate}</p>
    </div>

    <div style="background: white; border-radius: 16px; padding: 32px; margin-top: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; font-style: italic; color: #6366f1; border-left: 4px solid #6366f1; padding-left: 16px; margin: 0 0 24px 0;">
        "${horoscope.headline}"
      </p>

      <p style="font-size: 16px; line-height: 1.7; color: #374151; margin: 0 0 24px 0;">
        ${general}
      </p>

      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">💕 Love & Relationships</h3>
        <p style="margin: 0; color: #4b5563; line-height: 1.6;">${horoscope.love}</p>
      </div>

      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">💼 Career & Finance</h3>
        <p style="margin: 0; color: #4b5563; line-height: 1.6;">${horoscope.career}</p>
      </div>

      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">🌟 Today's Mood</h3>
        <p style="margin: 0; color: #4b5563; line-height: 1.6;">${horoscope.mood}</p>
      </div>

      <div style="background: linear-gradient(135deg, #fdf4ff 0%, #faf5ff 100%); border-radius: 12px; padding: 20px; text-align: center;">
        <h3 style="margin: 0 0 12px 0; color: #7c3aed; font-size: 16px;">✨ Lucky Elements</h3>
        <p style="margin: 0; color: #6b7280;">
          <strong>Numbers:</strong> ${horoscope.lucky_numbers?.join(', ') || 'N/A'}<br>
          <strong>Color:</strong> ${capitalize(horoscope.lucky_color || 'N/A')}
        </p>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="https://astrologly.com/horoscope/today/${sign}"
           style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
          Read Full Horoscope →
        </a>
      </div>
    </div>

    <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">© ${new Date().getFullYear()} Astrologly. All rights reserved.</p>
      <p style="margin: 0;">
        <a href="https://astrologly.com" style="color: #9ca3af;">Website</a> •
        <a href="https://astrologly.com/privacy" style="color: #9ca3af;">Privacy</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send horoscope emails to all subscribers of a specific sign
 */
async function sendHoroscopeEmails(sign, horoscope, date) {
  const contacts = await getContactsBySign(sign);

  if (contacts.length === 0) {
    console.log(`  No subscribers for ${capitalize(sign)}`);
    return { sent: 0, failed: 0 };
  }

  console.log(`  Found ${contacts.length} ${capitalize(sign)} subscribers`);

  const symbol = SIGN_SYMBOLS[sign];
  const signName = capitalize(sign);

  let sent = 0;
  let failed = 0;

  // Send emails individually (Resend batch has limitations)
  for (const contact of contacts) {
    // Resend API uses snake_case: first_name, last_name
    const language = contact.last_name?.toLowerCase() || 'en';
    const subject = `${symbol} Your ${signName} Horoscope for Today`;
    const html = formatEmailContent(sign, horoscope, date, language);

    try {
      const { error } = await resend.emails.send({
        from: `Astrologly <${FROM_EMAIL}>`,
        to: contact.email,
        subject,
        html,
      });

      if (error) {
        console.error(`    ✗ Failed ${contact.email}: ${error.message}`);
        failed++;
      } else {
        sent++;
      }

      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`    ✗ Error ${contact.email}: ${error.message}`);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Main execution
 */
async function main() {
  console.log('===========================================');
  console.log('   Astrologly Daily Horoscope Sender');
  console.log('        (Powered by Resend)');
  console.log('===========================================\n');

  if (!process.env.RESEND_API_KEY || !AUDIENCE_ID) {
    console.error('Error: Missing Resend credentials!');
    console.error('Please set RESEND_API_KEY and RESEND_AUDIENCE_ID environment variables.');
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

  console.log('Sending horoscopes to subscribers...\n');

  let totalSent = 0;
  let totalFailed = 0;

  for (const sign of SIGNS) {
    const horoscope = horoscopeData.entries[sign];

    if (!horoscope) {
      console.log(`  Warning: No horoscope data for ${sign}`);
      totalFailed++;
      continue;
    }

    console.log(`\n${SIGN_SYMBOLS[sign]} ${capitalize(sign)}:`);

    try {
      const { sent, failed } = await sendHoroscopeEmails(sign, horoscope, today);
      totalSent += sent;
      totalFailed += failed;

      if (sent > 0) {
        console.log(`  ✓ Sent: ${sent}${failed > 0 ? `, Failed: ${failed}` : ''}`);
      }

      // Rate limiting - wait 1 second between signs
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`  Error sending ${sign}: ${error.message}`);
      totalFailed++;
    }
  }

  console.log('\n===========================================');
  console.log(`   Complete! Sent: ${totalSent}, Failed: ${totalFailed}`);
  console.log('===========================================');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
