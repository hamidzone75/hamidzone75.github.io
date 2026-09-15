/**
 * DateService – Independent Date Engine for the whole application
 * All date calculations in the app must go through this service.
 * Internal representation prefers Jalali for Iranian users,
 * but conversions to/from Gregorian are always available.
 */

import {
  toJalali,
  toGregorian,
  isJalaliLeap,
  jalaliMonthLength,
  formatJalali,
  parseJalali,
  jalaliWeekday,
  addJalaliDays,
  jalaliDiffDays,
  compareJalali,
  todayJalali,
  jalaliMonthName,
  jalaliWeekdayName,
  JALALI_MONTHS,
  JALALI_WEEKDAYS,
  type JalaliDate,
  type GregorianDate
} from './jalali';

export type CalendarSystem = 'jalali' | 'gregorian';

export interface AppDate {
  /** Preferred display system */
  system: CalendarSystem;
  jy: number;
  jm: number;
  jd: number;
  gy: number;
  gm: number;
  gd: number;
  hour: number;
  minute: number;
  second: number;
}

export class DateService {
  private defaultSystem: CalendarSystem = 'jalali';
  private timezone: string = 'Asia/Tehran';

  constructor(options?: { system?: CalendarSystem; timezone?: string }) {
    if (options?.system) this.defaultSystem = options.system;
    if (options?.timezone) this.timezone = options.timezone;
  }

  setSystem(system: CalendarSystem) {
    this.defaultSystem = system;
  }

  setTimezone(tz: string) {
    this.timezone = tz;
  }

  getSystem() {
    return this.defaultSystem;
  }

  /** Create AppDate from Jalali parts */
  fromJalali(jy: number, jm: number, jd: number, hour = 0, minute = 0, second = 0): AppDate {
    const g = toGregorian(jy, jm, jd);
    return {
      system: 'jalali',
      jy, jm, jd,
      gy: g.gy, gm: g.gm, gd: g.gd,
      hour, minute, second
    };
  }

  /** Create AppDate from Gregorian parts */
  fromGregorian(gy: number, gm: number, gd: number, hour = 0, minute = 0, second = 0): AppDate {
    const j = toJalali(gy, gm, gd);
    return {
      system: 'gregorian',
      jy: j.jy, jm: j.jm, jd: j.jd,
      gy, gm, gd,
      hour, minute, second
    };
  }

  /** Create from native Date (local) */
  fromNativeDate(d: Date): AppDate {
    return this.fromGregorian(
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds()
    );
  }

  /** Today according to system timezone (approximate via local) */
  today(): AppDate {
    const j = todayJalali();
    return this.fromJalali(j.jy, j.jm, j.jd);
  }

  /** Parse string – auto detect format */
  parse(str: string): AppDate | null {
    // Try Jalali first
    const j = parseJalali(str);
    if (j) return this.fromJalali(j.jy, j.jm, j.jd);

    // Try ISO / Gregorian
    const d = new Date(str);
    if (!isNaN(d.getTime())) return this.fromNativeDate(d);

    return null;
  }

  /** Format for display */
  format(date: AppDate, options?: { system?: CalendarSystem; withTime?: boolean; separator?: string }): string {
    const system = options?.system ?? this.defaultSystem;
    const sep = options?.separator ?? '/';

    let datePart: string;
    if (system === 'jalali') {
      datePart = formatJalali(date.jy, date.jm, date.jd, sep);
    } else {
      const pad = (n: number) => n.toString().padStart(2, '0');
      datePart = `${date.gy}${sep}${pad(date.gm)}${sep}${pad(date.gd)}`;
    }

    if (options?.withTime) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${datePart} ${pad(date.hour)}:${pad(date.minute)}`;
    }
    return datePart;
  }

  /** Format with weekday and month name (Persian) */
  formatLong(date: AppDate): string {
    const wd = jalaliWeekday(date.jy, date.jm, date.jd);
    return `${jalaliWeekdayName(wd)} ${date.jd} ${jalaliMonthName(date.jm)} ${date.jy}`;
  }

  /** Add days */
  addDays(date: AppDate, days: number): AppDate {
    const j = addJalaliDays(date.jy, date.jm, date.jd, days);
    return this.fromJalali(j.jy, j.jm, j.jd, date.hour, date.minute, date.second);
  }

  /** Difference in calendar days */
  diffDays(a: AppDate, b: AppDate): number {
    return jalaliDiffDays(
      { jy: a.jy, jm: a.jm, jd: a.jd },
      { jy: b.jy, jm: b.jm, jd: b.jd }
    );
  }

  /** Compare */
  compare(a: AppDate, b: AppDate): number {
    return compareJalali(
      { jy: a.jy, jm: a.jm, jd: a.jd },
      { jy: b.jy, jm: b.jm, jd: b.jd }
    );
  }

  isBefore(a: AppDate, b: AppDate): boolean {
    return this.compare(a, b) < 0;
  }

  isAfter(a: AppDate, b: AppDate): boolean {
    return this.compare(a, b) > 0;
  }

  isSameDay(a: AppDate, b: AppDate): boolean {
    return this.compare(a, b) === 0;
  }

  /** Leap year check */
  isLeapYear(jy: number): boolean {
    return isJalaliLeap(jy);
  }

  /** Days in month */
  monthLength(jy: number, jm: number): number {
    return jalaliMonthLength(jy, jm);
  }

  /** Weekday 0=Sat ... 6=Fri */
  weekday(date: AppDate): number {
    return jalaliWeekday(date.jy, date.jm, date.jd);
  }

  /** Convert to native Date (for limited interop) */
  toNativeDate(date: AppDate): Date {
    return new Date(
      date.gy,
      date.gm - 1,
      date.gd,
      date.hour,
      date.minute,
      date.second
    );
  }

  /** Month names */
  getMonthNames(): readonly string[] {
    return JALALI_MONTHS;
  }

  getWeekdayNames(): readonly string[] {
    return JALALI_WEEKDAYS;
  }

  /** Validate Jalali date */
  isValidJalali(jy: number, jm: number, jd: number): boolean {
    if (jm < 1 || jm > 12) return false;
    if (jd < 1 || jd > jalaliMonthLength(jy, jm)) return false;
    return true;
  }
}

/** Singleton instance used by the whole app */
export const dateService = new DateService({
  system: 'jalali',
  timezone: 'Asia/Tehran'
});

export default dateService;
