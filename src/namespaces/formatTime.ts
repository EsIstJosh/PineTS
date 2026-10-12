// SPDX-License-Identifier: AGPL-3.0-only

import { PineRuntimeError } from '../errors/PineRuntimeError';
import { DAYLIGHT_EXCEPTIONS, TIME_ZONE_NAMES } from './timeZoneNames';

// str.format_time() follows java.text.SimpleDateFormat in US English: Java pattern letters, a Gregorian
// calendar that is Julian before 1582-10-15, weeks that start on Sunday with week 1 holding January 1st,
// and Java's time zone names.

export const DEFAULT_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ssZ";

const FN = 'str.format_time';
const DAY = 86400000;
const WEEK = 7 * DAY;
const GREGORIAN_CUTOVER_DAY = -141427; // 1582-10-15
const UTC_1900 = -2208988800000; // Java ignores time zone history before 1900
const LATEST_RULES = 2114380800000; // 2037-01-01: a year under each zone's latest rules
const MAX_OFFSET_SECONDS = 18 * 3600;

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PATTERN_LETTERS = 'GyMdkHmsSEDFwWahKzZYuXL';

const GMT_NAMES = ['GMT', 'Greenwich Mean Time'];
const UTC_NAMES = ['UTC', 'Coordinated Universal Time'];
// After GMT/UT and a sign: h, hh, h:mm, hh:mm, hmm, hhmm, hh:mm:ss or hhmmss.
const OFFSET_ID = /^(?:GMT|UT)([+-])(?:(\d{1,2})(?::?(\d{2}))?|(\d{2}):(\d{2}):(\d{2})|(\d{2})(\d{2})(\d{2}))$/;

const pad = (n: number, len: number) => String(n).padStart(len, '0');
const mod = (a: number, b: number) => ((a % b) + b) % b;
const num = (n: number, count: number) => (n < 0 ? '-' + pad(-n, count) : pad(n, count));
const twoDigits = (n: number) => (n < 0 ? '-' : '') + pad(Math.abs(n) % 100, 2);

type Token = string | { letter: string; count: number };

interface Zone {
    id?: string; // region zone, resolved through Intl
    fixedMs?: number; // constant offset
    names: string[]; // standard short, standard long[, daylight short, daylight long]
}

const invalidFormat = (format: string) => new PineRuntimeError(`Invalid \`format\` value for the ${FN}() function: \`${format}\`.`, FN);
const invalidTimezone = (timezone: string) =>
    new PineRuntimeError(
        `Incorrect \`timezone\` value for the ${FN}() function: "${timezone}". The value must be a string in either UTC/GMT notation ` +
            `(e.g. "UTC-5", "GMT+0530") or an IANA time zone database name (e.g. "America/New_York").`,
        FN
    );

// ── Pattern ──────────────────────────────────────────────────────────

const patternCache = new Map<string, Token[]>();

function compilePattern(format: string): Token[] {
    const cached = patternCache.get(format);
    if (cached) return cached;
    const tokens: Token[] = [];
    let literal = '';
    let inQuote = false;
    for (let i = 0; i < format.length; ) {
        const ch = format[i];
        if (ch === "'") {
            if (format[i + 1] === "'") {
                literal += "'";
                i += 2;
            } else {
                inQuote = !inQuote;
                i++;
            }
            continue;
        }
        if (!inQuote && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z'))) {
            let count = 1;
            while (format[i + count] === ch) count++;
            if (!PATTERN_LETTERS.includes(ch) || (ch === 'X' && count > 3)) throw invalidFormat(format);
            if (literal) tokens.push(literal);
            literal = '';
            tokens.push({ letter: ch, count });
            i += count;
            continue;
        }
        literal += ch;
        i++;
    }
    if (inQuote) throw invalidFormat(format);
    if (literal) tokens.push(literal);
    if (patternCache.size >= 256) patternCache.clear();
    patternCache.set(format, tokens);
    return tokens;
}

// ── Time zones ───────────────────────────────────────────────────────

let zoneNames: Map<string, string[]> | null = null;

function regionNames(id: string): string[] | undefined {
    if (!zoneNames) {
        zoneNames = new Map();
        for (const line of TIME_ZONE_NAMES.split('\n')) {
            const eq = line.indexOf('=');
            if (eq < 0) continue;
            const names = line.slice(0, eq).split('|');
            for (const zone of line.slice(eq + 1).split(' ')) zoneNames.set(zone, names);
        }
    }
    return zoneNames.get(id);
}

/** The zone of a timezone argument, or null when str.format_time() rejects it. */
export function resolveTimeZone(timezone: string): Zone | null {
    if (timezone === 'Z') return { fixedMs: 0, names: UTC_NAMES };
    // A UTC prefix means GMT: "UTC" is named Greenwich Mean Time and "UTC0" is the GMT0 zone.
    const id = timezone.startsWith('UTC') ? 'GMT' + timezone.slice(3) : timezone;
    if (id === 'GMT' || id === 'UT') return { fixedMs: 0, names: GMT_NAMES };
    const names = regionNames(id);
    if (names) return { id, names };
    const m = OFFSET_ID.exec(id);
    if (!m) return null;
    const hours = Number(m[2] ?? m[4] ?? m[7]);
    const minutes = Number(m[3] ?? m[5] ?? m[8] ?? 0);
    const seconds = Number(m[6] ?? m[9] ?? 0);
    const total = hours * 3600 + minutes * 60 + seconds;
    if (minutes > 59 || seconds > 59 || total > MAX_OFFSET_SECONDS) return null;
    if (total === 0) return { fixedMs: 0, names: GMT_NAMES };
    const name = `GMT${m[1]}${pad(hours, 2)}:${pad(minutes, 2)}${seconds ? ':' + pad(seconds, 2) : ''}`;
    return { fixedMs: (m[1] === '-' ? -1 : 1) * total * 1000, names: [name, name] };
}

let daylightExceptions: Map<string, number[]> | null = null;

/** Whether the instant falls in one of the zone's [start, end) second ranges (no end: open-ended) where Java and Intl disagree on daylight time. */
function inDaylightException(id: string, t: number): boolean {
    if (!daylightExceptions) {
        daylightExceptions = new Map();
        for (const line of DAYLIGHT_EXCEPTIONS.split('\n')) {
            const eq = line.indexOf('=');
            if (eq < 0) continue;
            const ranges = line
                .slice(eq + 1)
                .split(' ')
                .flatMap((r) => r.split(':').map((s) => (s ? parseInt(s, 36) : Infinity)));
            for (const zone of line.slice(0, eq).split(' ')) daylightExceptions.set(zone, ranges);
        }
    }
    const ranges = daylightExceptions.get(id);
    if (!ranges) return false;
    const s = Math.floor(t / 1000);
    let lo = 0;
    let hi = ranges.length / 2;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (ranges[2 * mid + 1] <= s) lo = mid + 1;
        else hi = mid;
    }
    return lo < ranges.length / 2 && ranges[2 * lo] <= s;
}

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();
const nameFormatters = new Map<string, Intl.DateTimeFormat>();
const weeklyOffsets = new Map<string, Map<number, number>>();
const surroundingMins = new Map<string, Map<number, [number, number]>>();
const lastStandardOffsets = new Map<string, number>();

// Java keeps the pre-2024b definitions of these zones: a fixed standard offset with US federal daylight
// time only (1918-1919 and the 1942-1945 war time) before the zones follow America/* from 1967.
const LEGACY_US_ZONES: Record<string, number> = { EST5EDT: -5, CST6CDT: -6, MST7MDT: -7, PST8PDT: -8 };
const LEGACY_US_END = Date.UTC(1967, 0, 1);
// prettier-ignore
const FEDERAL_DAYLIGHT = [[1918, 3, 31, 1918, 10, 27], [1919, 3, 30, 1919, 10, 26], [1942, 2, 9, 1945, 9, 30]];

function legacyUsDaylight(standardHours: number, t: number): boolean {
    // Daylight time starts at 02:00 standard time and ends at 02:00 daylight time.
    return FEDERAL_DAYLIGHT.some(
        ([y1, m1, d1, y2, m2, d2]) =>
            t >= Date.UTC(y1, m1 - 1, d1, 2) - standardHours * 3600000 && t < Date.UTC(y2, m2 - 1, d2, 2) - (standardHours + 1) * 3600000
    );
}

/** The zone's offset; before 1900, its standard offset under its latest rules. */
function zoneOffsetMs(id: string, t: number): number {
    const legacy = LEGACY_US_ZONES[id];
    if (legacy !== undefined && t >= UTC_1900 && t < LEGACY_US_END) return (legacy + (legacyUsDaylight(legacy, t) ? 1 : 0)) * 3600000;
    if (t >= UTC_1900) return regionOffsetMs(id, t);
    let off = lastStandardOffsets.get(id);
    if (off === undefined) {
        let standard = Infinity;
        let any = Infinity;
        for (let j = 0; j < 53; j++) {
            const at = LATEST_RULES + j * WEEK;
            const o = regionOffsetMs(id, at);
            any = Math.min(any, o);
            if (!isDaylightTime(id, at)) standard = Math.min(standard, o);
        }
        // A zone on daylight time all year (Java's view of Morocco and Namibia) is an hour ahead of its standard offset.
        off = standard !== Infinity ? standard : any - 3600000;
        lastStandardOffsets.set(id, off);
    }
    return off;
}

function regionOffsetMs(id: string, t: number): number {
    const at = Math.max(t, UTC_1900);
    let f = offsetFormatters.get(id);
    if (!f) {
        // prettier-ignore
        f = new Intl.DateTimeFormat('en-US', { timeZone: id, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
        offsetFormatters.set(id, f);
    }
    const p: Record<string, number> = {};
    for (const part of f.formatToParts(at)) if (part.type !== 'literal') p[part.type] = Number(part.value);
    const local = daysFromCivil(p.year, p.month, p.day) * DAY + (p.hour % 24) * 3600000 + p.minute * 60000 + p.second * 1000;
    return local - (at - mod(at, 1000));
}

function weeklyOffsetMs(offsets: Map<number, number>, id: string, week: number): number {
    let off = offsets.get(week);
    if (off === undefined) {
        off = regionOffsetMs(id, week * WEEK);
        offsets.set(week, off);
    }
    return off;
}

/** The lowest offset of the 53 weeks before and of the 53 weeks after the given week. */
function surroundingMinOffsets(id: string, week: number): [number, number] {
    let byWeek = surroundingMins.get(id);
    if (!byWeek) surroundingMins.set(id, (byWeek = new Map()));
    let mins = byWeek.get(week);
    if (!mins) {
        let offsets = weeklyOffsets.get(id);
        if (!offsets) weeklyOffsets.set(id, (offsets = new Map()));
        let before = Infinity;
        let after = Infinity;
        for (let j = 1; j <= 53; j++) {
            before = Math.min(before, weeklyOffsetMs(offsets, id, week - j));
            after = Math.min(after, weeklyOffsetMs(offsets, id, week + j));
        }
        byWeek.set(week, (mins = [before, after]));
    }
    return mins;
}

/** Whether Java counts the instant as daylight time (tzdata's isdst flag), which picks the daylight names. */
export function isDaylightTime(id: string, t: number): boolean {
    if (t < UTC_1900) return false;
    const legacy = LEGACY_US_ZONES[id];
    if (legacy !== undefined && t < LEGACY_US_END) return legacyUsDaylight(legacy, t);
    return estimateDaylight(id, t) !== inDaylightException(id, t);
}

/** Daylight time as Intl shows it; DAYLIGHT_EXCEPTIONS lists where Java differs from exactly this estimate. */
export function estimateDaylight(id: string, t: number): boolean {
    if (t < UTC_1900) return false;
    let f = nameFormatters.get(id);
    if (!f) {
        f = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'long' });
        nameFormatters.set(id, f);
    }
    const name = f.formatToParts(t).find((p) => p.type === 'timeZoneName')?.value ?? '';
    if (/Daylight|Summer/.test(name) || name === 'Irish Standard Time') return true;
    if (!/^GMT([+-]|$)/.test(name)) return false;
    // No metazone name: daylight time is an offset above the lowest one of both the year before and the year after.
    const [before, after] = surroundingMinOffsets(id, Math.floor(t / WEEK));
    const off = regionOffsetMs(id, t);
    return off > before && off > after;
}

// ── Calendar ─────────────────────────────────────────────────────────

function daysFromCivil(y: number, m: number, d: number): number {
    y -= m <= 2 ? 1 : 0;
    const era = Math.floor(y / 400);
    const yoe = y - era * 400;
    const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
    return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
}

function civilFromDays(days: number): [number, number, number] {
    const z = days + 719468;
    const era = Math.floor(z / 146097);
    const doe = z - era * 146097;
    const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    const mp = Math.floor((5 * doy + 2) / 153);
    const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
    const m = mp < 10 ? mp + 3 : mp - 9;
    return [yoe + era * 400 + (m <= 2 ? 1 : 0), m, d];
}

function daysFromJulian(y: number, m: number, d: number): number {
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083 - 2440588;
}

function julianFromDays(days: number): [number, number, number] {
    const c = days + 2440588 + 32082;
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    return [d - 4800 + Math.floor(m / 10), m + 3 - 12 * Math.floor(m / 10), e - Math.floor((153 * m + 2) / 5) + 1];
}

/** Day number of a calendar date: Gregorian from 1582-10-15, Julian before. */
function daysOf(y: number, m: number, d: number): number {
    const days = daysFromCivil(y, m, d);
    return days >= GREGORIAN_CUTOVER_DAY ? days : daysFromJulian(y, m, d);
}

// ── Formatting ───────────────────────────────────────────────────────

/**
 * Format a UNIX millisecond time as str.format_time() does. An invalid format or time zone is a
 * runtime error with TradingView's message (the format is checked first).
 */
export function formatTime(time: number, format: string, timezone: string): string {
    const tokens = compilePattern(format);
    const zone = resolveTimeZone(timezone);
    if (!zone) throw invalidTimezone(timezone);

    const t = Math.floor(time);
    let offsetMs = zone.fixedMs ?? 0;
    let regionId = zone.id;
    if (regionId) {
        try {
            offsetMs = zoneOffsetMs(regionId, t);
        } catch {
            // A zone this JavaScript engine does not know formats as UTC with its standard names.
            regionId = undefined;
        }
    }
    const local = t + offsetMs;
    const day = Math.floor(local / DAY);
    const msOfDay = local - day * DAY;
    const [year, month, dom] = day >= GREGORIAN_CUTOVER_DAY ? civilFromDays(day) : julianFromDays(day);
    const dow = mod(day + 4, 7);
    const hour = Math.floor(msOfDay / 3600000);

    let result = '';
    for (const token of tokens) {
        if (typeof token === 'string') {
            result += token;
            continue;
        }
        const { letter, count } = token;
        switch (letter) {
            case 'G':
                result += year > 0 ? 'AD' : 'BC';
                break;
            case 'y': {
                const eraYear = year > 0 ? year : 1 - year;
                result += count === 2 ? twoDigits(eraYear) : num(eraYear, count);
                break;
            }
            case 'Y':
            case 'w': {
                const jan1 = daysOf(year, 1, 1);
                const nextYear = day + (6 - dow) >= daysOf(year + 1, 1, 1);
                if (letter === 'w') result += num(nextYear ? 1 : Math.floor((day - jan1 + mod(jan1 + 4, 7)) / 7) + 1, count);
                else result += count === 2 ? twoDigits(nextYear ? year + 1 : year) : num(nextYear ? year + 1 : year, count);
                break;
            }
            case 'M':
            case 'L':
                result += count >= 4 ? MONTH_LONG[month - 1] : count === 3 ? MONTH_SHORT[month - 1] : num(month, count);
                break;
            case 'W': {
                const first = day - (dom - 1);
                result += num(Math.floor((dom - 1 + mod(first + 4, 7)) / 7) + 1, count);
                break;
            }
            case 'D':
                result += num(day - daysOf(year, 1, 1) + 1, count);
                break;
            case 'd':
                result += num(dom, count);
                break;
            case 'F':
                result += num(Math.floor((dom - 1) / 7) + 1, count);
                break;
            case 'E':
                result += count >= 4 ? DAY_LONG[dow] : DAY_SHORT[dow];
                break;
            case 'u':
                result += num(dow === 0 ? 7 : dow, count);
                break;
            case 'a':
                result += hour < 12 ? 'AM' : 'PM';
                break;
            case 'H':
                result += num(hour, count);
                break;
            case 'k':
                result += num(hour === 0 ? 24 : hour, count);
                break;
            case 'K':
                result += num(hour % 12, count);
                break;
            case 'h':
                result += num(hour % 12 === 0 ? 12 : hour % 12, count);
                break;
            case 'm':
                result += num(Math.floor(msOfDay / 60000) % 60, count);
                break;
            case 's':
                result += num(Math.floor(msOfDay / 1000) % 60, count);
                break;
            case 'S':
                result += num(msOfDay % 1000, count);
                break;
            case 'z': {
                const daylight = regionId !== undefined && zone.names.length > 2 && isDaylightTime(regionId, t);
                result += zone.names[(daylight ? 2 : 0) + (count >= 4 ? 1 : 0)];
                break;
            }
            case 'Z':
            case 'X': {
                const minutes = Math.trunc(offsetMs / 60000);
                if (letter === 'X' && minutes === 0) {
                    result += 'Z';
                    break;
                }
                const sign = minutes < 0 ? '-' : '+';
                const hh = pad(Math.floor(Math.abs(minutes) / 60), 2);
                const mm = pad(Math.abs(minutes) % 60, 2);
                result += sign + hh + (letter === 'Z' || count === 2 ? mm : count === 3 ? ':' + mm : '');
                break;
            }
        }
    }
    return result;
}
