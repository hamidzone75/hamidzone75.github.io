/**
 * Persian language utilities for typography, punctuation, numbering, and voice commands
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ENGLISH_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function toPersianDigits(input: string | number): string {
  const str = String(input);
  return str.replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w]);
}

export function toEnglishDigits(input: string): string {
  let res = input;
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(PERSIAN_DIGITS[i], ENGLISH_DIGITS[i]);
  }
  return res;
}

export function formatPersianDate(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return toPersianDigits(formatted);
}

/**
 * Normalizes Persian typography:
 * - Half-spaces (نیم‌فاصله) for prefixes (می‌، نمی‌) and suffixes (‌ها،‌ترین،...)
 * - Arabic to Persian letter unification (ي -> ی, ك -> ک)
 * - Punctuation spacing (. ، ! ؟ : ;)
 */
export function cleanPersianTypography(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Unify Arabic Yeh and Kaf
  cleaned = cleaned.replace(/ي/g, 'ی');
  cleaned = cleaned.replace(/ك/g, 'ک');
  cleaned = cleaned.replace(/ة/g, 'ه');
  cleaned = cleaned.replace(/ؤ/g, 'و');

  // Fix Prefix Half-Spaces (می / نمی)
  cleaned = cleaned.replace(/\b(می|نمی)\s+/g, '$1\u200C');

  // Fix Suffix Half-Spaces (ها / های / هایی / تر / ترین / ام / ات / ایم / اید / اند / هایم / هایت / هایمان / هایتان / هایشان)
  cleaned = cleaned.replace(/\s+(ها|های|هایی|تر|ترین|ام|ات|ایم|اید|اند|هایم|هایت|هایمان|هایتان|هایشان)\b/g, '\u200C$1');

  // Fix prefix "بی"
  cleaned = cleaned.replace(/\b(بی)\s+/g, '$1\u200C');

  // Fix common words like "به عنوان", "می شود", "رفته است"
  cleaned = cleaned.replace(/\s+شده\s+است\b/g, ' شده است');
  cleaned = cleaned.replace(/\s+رفته\s+است\b/g, ' رفته است');

  // Replace English commas/question marks with Persian
  cleaned = cleaned.replace(/,/g, '،');
  cleaned = cleaned.replace(/\?/g, '؟');
  cleaned = cleaned.replace(/;/g, '؛');

  // Fix Punctuation Spacing:
  // Remove space BEFORE punctuation
  cleaned = cleaned.replace(/\s+([.،!؟:؛»)])/g, '$1');

  // Ensure space AFTER punctuation if followed by text
  cleaned = cleaned.replace(/([.،!؟:؛»)])(?=[^\s\d.،!؟:؛»)])/g, '$1 ');

  // Remove space AFTER open brackets/quotes
  cleaned = cleaned.replace(/([«(])\s+/g, '$1');

  // Multiple consecutive spaces to single space
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

  // Multiple consecutive newlines to max 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

export interface VoiceCommand {
  keywords: string[];
  replacement: string;
  description: string;
  isAction?: boolean;
}

export const PERSIAN_VOICE_COMMANDS: VoiceCommand[] = [
  {
    keywords: ['نقطه', 'علامت نقطه'],
    replacement: '. ',
    description: 'درج نقطه در انتهای جمله',
  },
  {
    keywords: ['ویرگول', 'کاما'],
    replacement: '، ',
    description: 'درج ویرگول فارسی',
  },
  {
    keywords: ['علامت سوال', 'علامت پرسش'],
    replacement: '؟ ',
    description: 'درج علامت سوال فارسی',
  },
  {
    keywords: ['علامت تعجب'],
    replacement: '! ',
    description: 'درج علامت تعجب',
  },
  {
    keywords: ['برو خط بعد', 'خط بعد', 'خط جدید', 'سر سطر', 'سرخط'],
    replacement: '\n',
    description: 'رفتن به سطر جدید',
    isAction: true,
  },
  {
    keywords: ['دو نقطه'],
    replacement: ': ',
    description: 'درج دو نقطه',
  },
  {
    keywords: ['نقطه ویرگول'],
    replacement: '؛ ',
    description: 'درج نقطه ویرگول',
  },
  {
    keywords: ['پرانتز باز'],
    replacement: ' (',
    description: 'باز کردن پرانتز',
  },
  {
    keywords: ['پرانتز بسته'],
    replacement: ') ',
    description: 'بستن پرانتز',
  },
  {
    keywords: ['گیومه باز', 'نقل قول باز'],
    replacement: ' «',
    description: 'باز کردن گیومه فارسی',
  },
  {
    keywords: ['گیومه بسته', 'نقل قول بسته'],
    replacement: '» ',
    description: 'بستن گیومه فارسی',
  },
  {
    keywords: ['خط تیره', 'فاصله تیره', 'دش'],
    replacement: ' - ',
    description: 'درج خط تیره',
  },
];

/**
 * Applies Persian voice commands if enabled
 */
export function applyPersianVoiceCommands(rawText: string): string {
  let processed = rawText;

  for (const cmd of PERSIAN_VOICE_COMMANDS) {
    for (const kw of cmd.keywords) {
      // Look for the keyword surrounded by word boundaries or at the end
      const regex = new RegExp(`(^|\\s)${kw}(\\s|$)`, 'gi');
      processed = processed.replace(regex, (match, prefix, suffix) => {
        return `${prefix}${cmd.replacement}${suffix ? '' : ' '}`;
      });
    }
  }

  return cleanPersianTypography(processed);
}

export function countPersianWords(text: string): { words: number; chars: number; minutes: number } {
  if (!text || !text.trim()) {
    return { words: 0, chars: 0, minutes: 0 };
  }
  const clean = text.trim();
  const words = clean.split(/\s+/).filter(Boolean).length;
  const chars = clean.length;
  // Average speaking/reading rate in Persian is ~130 words per minute
  const minutes = Math.max(1, Math.ceil(words / 130));
  return { words, chars, minutes };
}
