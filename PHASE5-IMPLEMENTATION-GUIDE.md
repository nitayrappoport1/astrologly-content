# Phase 5: Content Generation Infrastructure - Implementation Guide

## Overview
This guide details the complete content generation infrastructure needed for all content types across 6 languages.

---

## 📁 Directory Structure Needed

```
astrologly-content/
├── daily/              # ✅ EXISTS - 12 signs × daily
├── weekly/             # 🔨 TO AUTOMATE
├── monthly/            # 🆕 NEW - 12 signs × monthly
├── love/               # 🆕 NEW - 12 signs × daily love
├── career/             # 🆕 NEW - 12 signs × daily career
├── money/              # 🆕 NEW - 12 signs × daily money
├── health/             # 🆕 NEW - 12 signs × daily health
├── moon/               # 🆕 NEW - daily moon phase
├── mercury/            # 🆕 NEW - Mercury retrograde status
├── transits/           # 🆕 NEW - daily planetary positions
└── scripts/
    ├── generate-daily-openai.mjs           # ✅ EXISTS
    ├── generate-daily-multilang.mjs        # 🆕 NEW - Multi-language daily
    ├── generate-monthly-multilang.mjs      # 🆕 NEW - Monthly horoscopes
    ├── generate-love-multilang.mjs         # 🆕 NEW - Daily love
    ├── generate-career-multilang.mjs       # 🆕 NEW - Daily career
    ├── generate-money-multilang.mjs        # 🆕 NEW - Daily money
    ├── generate-health-multilang.mjs       # 🆕 NEW - Daily health
    ├── calculate-moon-phase.mjs            # 🆕 NEW - Moon calculations
    ├── calculate-mercury-retrograde.mjs    # 🆕 NEW - Mercury status
    └── calculate-transits.mjs              # 🆕 NEW - Planetary positions
```

---

## 🌍 Multi-Language Strategy

### Language Configuration
```javascript
const LANGUAGES = {
  en: { name: 'English', timezone: 'America/New_York', prompt: 'Write in English' },
  es: { name: 'Spanish', timezone: 'Europe/Madrid', prompt: 'Escribe completamente en español' },
  fr: { name: 'French', timezone: 'Europe/Paris', prompt: 'Écris complètement en français' },
  pt: { name: 'Portuguese', timezone: 'America/Sao_Paulo', prompt: 'Escreva completamente em português' },
  it: { name: 'Italian', timezone: 'Europe/Rome', prompt: 'Scrivi completamente in italiano' },
  de: { name: 'German', timezone: 'Europe/Berlin', prompt: 'Schreibe komplett auf Deutsch' }
};
```

### File Naming Convention
- **Single language:** `daily/2025-11-23.json` (English - default)
- **Multi-language:**
  - `daily/2025-11-23-en.json`
  - `daily/2025-11-23-es.json`
  - `daily/2025-11-23-fr.json`
  - etc.

---

## 📝 Content Types & Specifications

### 1. **Daily Horoscopes** (Multi-language)
**Status:** ✅ English exists, 🆕 Need other languages

**Data Structure:**
```json
{
  "date": "2025-11-23",
  "language": "en",
  "tz": "Asia/Jerusalem",
  "entries": {
    "aries": {
      "headline": "7-9 words",
      "general": "110-130 words",
      "love": "55-70 words",
      "career": "55-70 words",
      "mood": "25-35 words",
      "lucky_numbers": [7, 14, 21],
      "lucky_color": "blue"
    }
    // ... all 12 signs
  }
}
```

**Generation:**
- 12 signs × 6 languages = 72 API calls per day
- Estimated cost: ~$0.10-0.20 per day (gpt-4o-mini)
- Run time: ~5-8 minutes (with batching)

---

### 2. **Monthly Horoscopes** (Multi-language)
**Status:** 🆕 NEW

**Data Structure:**
```json
{
  "month": "2025-12",
  "language": "en",
  "entries": {
    "aries": {
      "overview": "150-200 words - Month overview",
      "love": "100-120 words - Romantic forecast",
      "career": "100-120 words - Professional outlook",
      "health": "80-100 words - Wellness guidance",
      "key_dates": ["2025-12-05", "2025-12-15", "2025-12-28"],
      "key_themes": ["transformation", "communication", "growth"]
    }
    // ... all 12 signs
  }
}
```

**Generation:**
- Run: 1st of each month
- 12 signs × 6 languages = 72 API calls per month
- Est. cost: ~$0.30-0.50 per month (larger content)

---

### 3. **Love Horoscopes** (Daily, Multi-language)
**Status:** 🆕 NEW

**Data Structure:**
```json
{
  "date": "2025-11-23",
  "language": "en",
  "entries": {
    "aries": {
      "singles": "60-80 words - Advice for singles",
      "couples": "60-80 words - Advice for relationships",
      "mood": "romantic / passionate / reflective / cautious",
      "action": "One specific action to take today"
    }
    // ... all 12 signs
  }
}
```

---

### 4. **Career Horoscopes** (Daily, Multi-language)
**Status:** 🆕 NEW

**Data Structure:**
```json
{
  "date": "2025-11-23",
  "language": "en",
  "entries": {
    "aries": {
      "professional": "70-90 words - Work & career guidance",
      "financial": "50-70 words - Money & investments",
      "networking": "40-50 words - Collaboration & connections",
      "focus_area": "leadership / innovation / stability / growth"
    }
  }
}
```

---

### 5. **Money Horoscopes** (Daily, Multi-language)
**Status:** 🆕 NEW

**Data Structure:**
```json
{
  "date": "2025-11-23",
  "language": "en",
  "entries": {
    "aries": {
      "forecast": "90-110 words - Financial outlook",
      "opportunities": "Specific opportunity to watch for",
      "cautions": "What to avoid financially",
      "lucky_purchase": "Best category for spending today"
    }
  }
}
```

---

### 6. **Health Horoscopes** (Daily, Multi-language)
**Status:** 🆕 NEW

**Data Structure:**
```json
{
  "date": "2025-11-23",
  "language": "en",
  "entries": {
    "aries": {
      "physical": "50-70 words - Physical health",
      "mental": "50-70 words - Mental/emotional wellness",
      "recommended_activity": "yoga / cardio / meditation / rest",
      "diet_focus": "proteins / vegetables / hydration / vitamins"
    }
  }
}
```

---

### 7. **Moon Phase** (Daily, Multi-language)
**Status:** 🆕 NEW - **CALCULATION, NOT AI**

**Data Structure:**
```json
{
  "date": "2025-11-23",
  "phase": "waxing_gibbous",
  "illumination": 0.78,
  "zodiac_sign": "pisces",
  "void_of_course": {
    "start": "2025-11-23T14:30:00Z",
    "end": "2025-11-23T18:15:00Z"
  },
  "descriptions": {
    "en": "Waxing Gibbous moon in Pisces brings...",
    "es": "La Luna Gibosa Creciente en Piscis trae...",
    // ... all languages
  }
}
```

**Library:** Use `astronomy-engine` npm package

---

### 8. **Mercury Retrograde** (Updated daily)
**Status:** 🆕 NEW - **PRE-CALCULATED DATA**

**Data Structure:**
```json
{
  "current_period": {
    "status": "retrograde",  // or "direct" or "pre_shadow" or "post_shadow"
    "started": "2025-11-15",
    "ends": "2025-12-05",
    "sign": "sagittarius"
  },
  "next_period": {
    "starts": "2026-03-10",
    "ends": "2026-04-02",
    "sign": "aries"
  },
  "descriptions": {
    "en": "Mercury is currently retrograde in Sagittarius...",
    // ... all languages
  }
}
```

**Pre-calculated dates for 2025-2030** - No API needed

---

### 9. **Planetary Transits** (Daily)
**Status:** 🆕 NEW - **CALCULATION**

**Data Structure:**
```json
{
  "date": "2025-11-23",
  "planets": {
    "sun": { "sign": "sagittarius", "degree": 1.5, "retrograde": false },
    "moon": { "sign": "pisces", "degree": 12.3, "retrograde": false },
    "mercury": { "sign": "sagittarius", "degree": 5.2, "retrograde": true },
    // ... all planets
  },
  "descriptions": {
    "en": "Sun in Sagittarius brings...",
    // ... all languages
  }
}
```

---

## 🔄 GitHub Actions Workflows

### 1. **Daily Content Generation** (Multi-language)
**File:** `.github/workflows/generate-daily-multilang.yml`

```yaml
name: Generate Daily Horoscopes (All Languages)

on:
  schedule:
    # Run at 00:00 Israel Time (22:00 UTC previous day)
    - cron: '0 22 * * *'
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Generate tomorrow's horoscopes (all languages)
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: node scripts/generate-daily-multilang.mjs --target=tomorrow

      - name: Commit and push
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add daily/*.json
          git commit -m "Generated tomorrow's horoscopes (all languages)" || exit 0
          git push
```

---

### 2. **Monthly Content Generation**
**File:** `.github/workflows/generate-monthly.yml`

```yaml
name: Generate Monthly Horoscopes

on:
  schedule:
    # Run on 1st of month at 00:00
    - cron: '0 0 1 * *'
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      # Similar to daily, but runs monthly script
      - name: Generate monthly horoscopes
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: node scripts/generate-monthly-multilang.mjs
```

---

### 3. **Love/Career/Money/Health Daily**
Create separate workflows for each, all running at 00:00 daily.

---

### 4. **Astronomical Calculations**
**File:** `.github/workflows/calculate-astronomy.yml`

```yaml
name: Calculate Astronomical Data

on:
  schedule:
    - cron: '0 1 * * *'  # Run at 01:00 UTC daily
  workflow_dispatch:

jobs:
  calculate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Calculate moon phase
        run: node scripts/calculate-moon-phase.mjs

      - name: Update Mercury retrograde status
        run: node scripts/calculate-mercury-retrograde.mjs

      - name: Calculate planetary transits
        run: node scripts/calculate-transits.mjs

      - name: Commit and push
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add moon/*.json mercury/*.json transits/*.json
          git commit -m "Updated astronomical data" || exit 0
          git push
```

---

## 💰 Cost Estimates

### OpenAI API Costs (gpt-4o-mini)
- **Input:** $0.150 per 1M tokens
- **Output:** $0.600 per 1M tokens

### Daily Generation Costs:
1. **Daily Horoscopes** (all languages): ~$0.15/day = $4.50/month
2. **Love Horoscopes** (all languages): ~$0.10/day = $3.00/month
3. **Career Horoscopes** (all languages): ~$0.10/day = $3.00/month
4. **Money Horoscopes** (all languages): ~$0.08/day = $2.40/month
5. **Health Horoscopes** (all languages): ~$0.08/day = $2.40/month

### Monthly Generation:
6. **Monthly Horoscopes** (all languages): ~$0.50/month

### **Total Estimated Cost: ~$16-20/month**

---

## 🚀 Implementation Priority

### Phase 5A: Multi-Language Daily (CRITICAL)
1. ✅ Create `generate-daily-multilang.mjs`
2. ✅ Update GitHub Action workflow
3. ✅ Test with all 6 languages
4. ✅ Verify file structure

### Phase 5B: New Content Types
1. Create monthly horoscope generator
2. Create love/career/money/health generators
3. Set up all GitHub Actions

### Phase 5C: Astronomical Calculations
1. Implement moon phase calculator
2. Add Mercury retrograde tracker
3. Create planetary transits calculator

---

## 📊 Success Metrics
- ✅ All content generated successfully
- ✅ Word counts within specified ranges
- ✅ No duplicate content detected
- ✅ All 6 languages producing quality output
- ✅ Generation completes within time limits
- ✅ Costs stay within budget

---

## Next Steps
1. Review this guide
2. Confirm priorities and budget
3. Implement Phase 5A first (critical path)
4. Then Phase 5B and 5C in parallel
