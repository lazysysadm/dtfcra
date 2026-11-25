import type { Territory } from "./territories";

// Pure local holiday computation — no network at runtime.
// Verified against official API fixtures (tests/fixtures/holidays/, 2024–2030).

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Gregorian computus (Meeus/Jones/Butcher).
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

// Extra days per territory, relative to the metropolitan base (API fixtures).
const EXTRA_FIXED: Partial<Record<Territory, Array<[string, string]>>> = {
  guadeloupe: [["05-27", "Abolition de l'esclavage"]],
  guyane: [["06-10", "Abolition de l'esclavage"]],
  martinique: [["05-22", "Abolition de l'esclavage"]],
  "la-reunion": [["12-20", "Abolition de l'esclavage"]],
  mayotte: [["04-27", "Abolition de l'esclavage"]],
  "saint-barthelemy": [["10-09", "Abolition de l'esclavage"]],
  "saint-martin": [["05-28", "Abolition de l'esclavage"]],
  "alsace-moselle": [["12-26", "2ème jour de Noël"]],
};

const cache = new Map<string, Map<string, string>>();

export function getHolidays(year: number, territory: Territory): Map<string, string> {
  const cacheKey = `${year}:${territory}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const easter = easterSunday(year);
  const holidays = new Map<string, string>([
    [toIso(utc(year, 1, 1)), "1er janvier"],
    [toIso(addDays(easter, 1)), "Lundi de Pâques"],
    [toIso(utc(year, 5, 1)), "1er mai"],
    [toIso(utc(year, 5, 8)), "8 mai"],
    [toIso(addDays(easter, 39)), "Ascension"],
    [toIso(addDays(easter, 50)), "Lundi de Pentecôte"],
    [toIso(utc(year, 7, 14)), "14 juillet"],
    [toIso(utc(year, 8, 15)), "15 août"],
    [toIso(utc(year, 11, 1)), "1er novembre"],
    [toIso(utc(year, 11, 11)), "11 novembre"],
    [toIso(utc(year, 12, 25)), "25 décembre"],
  ]);

  if (territory === "alsace-moselle") {
    holidays.set(toIso(addDays(easter, -2)), "Vendredi saint");
  }
  for (const [monthDay, name] of EXTRA_FIXED[territory] ?? []) {
    const [month, day] = monthDay.split("-").map(Number);
    holidays.set(toIso(utc(year, month ?? 1, day ?? 1)), name);
  }

  cache.set(cacheKey, holidays);
  return holidays;
}

export function isWeekend(dateIso: string): boolean {
  const day = new Date(`${dateIso}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

export function isHoliday(dateIso: string, territory: Territory): boolean {
  const year = Number(dateIso.slice(0, 4));
  return getHolidays(year, territory).has(dateIso);
}

export function holidayName(dateIso: string, territory: Territory): string | null {
  const year = Number(dateIso.slice(0, 4));
  return getHolidays(year, territory).get(dateIso) ?? null;
}

export function isWorkingDay(dateIso: string, territory: Territory): boolean {
  return !isWeekend(dateIso) && !isHoliday(dateIso, territory);
}

export function monthDays(year: number, month: number): string[] {
  const days: string[] = [];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= last; day += 1) {
    days.push(toIso(utc(year, month, day)));
  }
  return days;
}

export function workingDaysInMonth(year: number, month: number, territory: Territory): string[] {
  return monthDays(year, month).filter((date) => isWorkingDay(date, territory));
}
