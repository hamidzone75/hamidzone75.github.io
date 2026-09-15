/**
 * Quick self-test for Jalali engine
 * Can be imported and called from Settings or console
 */

import {
  toJalali,
  toGregorian,
  isJalaliLeap,
  jalaliMonthLength,
  formatJalali,
  jalaliWeekday,
  addJalaliDays,
  jalaliDiffDays
} from './jalali';

export function runJalaliSelfTest(): { passed: number; failed: number; messages: string[] } {
  const messages: string[] = [];
  let passed = 0;
  let failed = 0;

  const assert = (cond: boolean, msg: string) => {
    if (cond) {
      passed++;
      messages.push(`✓ ${msg}`);
    } else {
      failed++;
      messages.push(`✗ ${msg}`);
    }
  };

  // Known conversion: 1403/01/01 = 2024/03/20
  const g1 = toGregorian(1403, 1, 1);
  assert(g1.gy === 2024 && g1.gm === 3 && g1.gd === 20, '1403/01/01 → 2024/03/20');

  const j1 = toJalali(2024, 3, 20);
  assert(j1.jy === 1403 && j1.jm === 1 && j1.jd === 1, '2024/03/20 → 1403/01/01');

  // Leap year 1403 is leap? (1403 % 33 cycle)
  // 1403 is leap according to common tables
  assert(isJalaliLeap(1403) === true, '1403 is leap year');
  assert(jalaliMonthLength(1403, 12) === 30, 'Esfand 1403 has 30 days');

  // Non-leap
  assert(isJalaliLeap(1402) === false, '1402 is not leap');
  assert(jalaliMonthLength(1402, 12) === 29, 'Esfand 1402 has 29 days');

  // Round-trip
  const g2 = toGregorian(1399, 12, 30);
  const j2 = toJalali(g2.gy, g2.gm, g2.gd);
  assert(j2.jy === 1399 && j2.jm === 12 && j2.jd === 30, 'Round-trip 1399/12/30');

  // Weekday: 1403/01/01 should be Wednesday (چهارشنبه = 4)
  const wd = jalaliWeekday(1403, 1, 1);
  assert(wd === 4, `1403/01/01 weekday is 4 (got ${wd})`);

  // Add days
  const next = addJalaliDays(1403, 1, 1, 10);
  assert(next.jm === 1 && next.jd === 11, 'Add 10 days to 1403/01/01 → 1403/01/11');

  // Diff
  const diff = jalaliDiffDays({ jy: 1403, jm: 1, jd: 1 }, { jy: 1403, jm: 1, jd: 11 });
  assert(diff === 10, 'Diff days = 10');

  // Format
  assert(formatJalali(1403, 7, 5) === '1403/07/05', 'Format works');

  return { passed, failed, messages };
}
