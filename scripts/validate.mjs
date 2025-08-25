import { z } from 'zod';
import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Word count helper
function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// Custom word count validator with tolerance
function wordCount(min, max, tolerance = 0.1) {
  return z.string().refine(
    (val) => {
      const count = countWords(val);
      const minWithTolerance = Math.floor(min * (1 - tolerance));
      const maxWithTolerance = Math.ceil(max * (1 + tolerance));
      return count >= minWithTolerance && count <= maxWithTolerance;
    },
    (val) => {
      const count = countWords(val);
      return {
        message: `Word count ${count} not in range ${Math.floor(min * 0.9)}-${Math.ceil(max * 1.1)} (target: ${min}-${max})`
      };
    }
  );
}

// Define the schema for a single horoscope entry
const HoroscopeEntrySchema = z.object({
  headline: wordCount(6, 10),
  general: wordCount(90, 140),
  love: wordCount(45, 80),
  career: wordCount(45, 80),
  mood: wordCount(20, 40),
  lucky_numbers: z.array(z.number().int().min(1).max(50)).min(2).max(4),
  lucky_color: z.string().min(1),
  author: z.literal('Astrologly'),
  image: z.literal('')
});

// Define the complete schema
const DailyHoroscopeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  tz: z.literal('Asia/Jerusalem'),
  entries: z.object({
    aries: HoroscopeEntrySchema,
    taurus: HoroscopeEntrySchema,
    gemini: HoroscopeEntrySchema,
    cancer: HoroscopeEntrySchema,
    leo: HoroscopeEntrySchema,
    virgo: HoroscopeEntrySchema,
    libra: HoroscopeEntrySchema,
    scorpio: HoroscopeEntrySchema,
    sagittarius: HoroscopeEntrySchema,
    capricorn: HoroscopeEntrySchema,
    aquarius: HoroscopeEntrySchema,
    pisces: HoroscopeEntrySchema
  })
});

async function validateFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  try {
    DailyHoroscopeSchema.parse(data);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      };
    }
    throw error;
  }
}

async function main() {
  const dailyDir = join(__dirname, '..', 'daily');
  const files = await readdir(dailyDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  if (jsonFiles.length === 0) {
    console.log('No JSON files found to validate');
    return;
  }
  
  let hasErrors = false;
  
  for (const file of jsonFiles) {
    const filePath = join(dailyDir, file);
    console.log(`Validating ${file}...`);
    
    try {
      const result = await validateFile(filePath);
      
      if (result.success) {
        console.log(`✓ ${file} is valid`);
      } else {
        console.error(`✗ ${file} has validation errors:`);
        result.errors.forEach(err => {
          console.error(`  - ${err.path}: ${err.message}`);
        });
        hasErrors = true;
      }
    } catch (error) {
      console.error(`✗ ${file} could not be validated:`, error.message);
      hasErrors = true;
    }
  }
  
  if (hasErrors) {
    console.error('\nValidation failed! Please fix the errors above.');
    process.exit(1);
  } else {
    console.log('\n✓ All files validated successfully!');
  }
}

main().catch(error => {
  console.error('Validation script error:', error);
  process.exit(1);
});