// SPDX-License-Identifier: AGPL-3.0-only
// str.format_time(): every expected value below is what TradingView returns for the same call.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { PineTS } from '../../src/PineTS.class';

afterEach(() => vi.restoreAllMocks());

const MINUTE = 60_000;
const T0 = Date.UTC(2024, 0, 1);
const bars = [10, 20, 30].map((close, i) => ({
    openTime: T0 + i * MINUTE,
    closeTime: T0 + (i + 1) * MINUTE,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
}));

async function logs(source: string): Promise<string[]> {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: any[]) => lines.push(a.join(' ').replace(/^\[[^\]]+\]\s/, '')));
    await new PineTS(bars, 'TEST', '1').run(source);
    return [...new Set(lines)];
}

const pine = (s: string) => JSON.stringify(s);

/** Formats each [time, format, timezone] in one script and returns the results in order. */
async function formatAll(calls: [number, string, string][]): Promise<string[]> {
    const body = calls.map(([t, f, z], i) => `    log.info("${i}=" + str.format_time(${t}, ${pine(f)}, ${pine(z)}))`).join('\n');
    const lines = await logs(`//@version=6\nindicator("t")\nif barstate.islast\n${body}`);
    return calls.map((_, i) => lines.find((l) => l.startsWith(i + '='))?.slice(String(i).length + 1) ?? '<missing>');
}

async function runError(call: string, prelude = ''): Promise<string> {
    try {
        await logs(`//@version=6\nindicator("t")\n${prelude}if barstate.islast\n    log.info(${call})`);
        return '<no error>';
    } catch (e: any) {
        return e.message;
    }
}

const FULL = 'G yyyy-MM-dd HH:mm:ss.SSS EEE u D w W F Y|Z X XX XXX|z zzzz|a h K k';

describe('str.format_time', () => {
    it('reads time, format and timezone by position or by name, from literals, series and inputs', async () => {
        const lines = await logs(`//@version=6
indicator("t")
fmtIn = input.string("HH:mm", "fmt")
tzIn = input.string("UTC+2", "tz")
var string sfmt = "HH:mm"
sfmt := bar_index > 0 ? "HH:mm:ss" : "HH:mm"
string naFmt = na
if barstate.islast
    t = 1704153600000
    log.info("allnamed=" + str.format_time(time = t, format = "HH:mm", timezone = "UTC+2"))
    log.info("timeonly=" + str.format_time(time = t))
    log.info("tzfirst=" + str.format_time(t, timezone = "UTC+2", format = "HH:mm"))
    log.info("tzonly=" + str.format_time(t, timezone = "UTC-5"))
    log.info("mixed=" + str.format_time(t, "HH:mm", timezone = "UTC+2"))
    log.info("seriesfmt=" + str.format_time(t, format = sfmt, timezone = "UTC+2"))
    log.info("inputs=" + str.format_time(t, format = fmtIn, timezone = tzIn))
    log.info("namedtime=" + str.format_time(time = t, format = "yyyy"))
    log.info("positional=" + str.format_time(t, "HH:mm", "UTC+2"))
    log.info("default=" + str.format_time(t))
    log.info("symtz=" + str.format_time(t, timezone = syminfo.timezone))
    log.info("nafmt=[" + str.format_time(t, naFmt, "UTC") + "]")
    log.info("nafmtnamed=[" + str.format_time(t, format = naFmt, timezone = "UTC") + "]")
    log.info("natime=" + str.format_time(na, "yyyy-MM-dd HH:mm", "UTC"))
    log.info("empty=[" + str.format_time(t, "", "UTC") + "]")`);
        expect(lines).toEqual([
            'allnamed=02:00',
            'timeonly=2024-01-02T00:00:00+0000',
            'tzfirst=02:00',
            'tzonly=2024-01-01T19:00:00-0500',
            'mixed=02:00',
            'seriesfmt=02:00:00',
            'inputs=02:00',
            'namedtime=2024',
            'positional=02:00',
            'default=2024-01-02T00:00:00+0000',
            'symtz=2024-01-02T00:00:00+0000',
            'nafmt=[]',
            'nafmtnamed=[]',
            'natime=1970-01-01 00:00',
            'empty=[]',
        ]);
    });

    it('formats every pattern letter with Java SimpleDateFormat semantics', async () => {
        // prettier-ignore
        const cases: [number, string, string, string][] = [
        [1704157323004, 'd|ddd|H|HHH|m|mmm|s|sss|h|hhh|k|kkk|K|KKK|M|MM|D|DDDD|w|www|W|WW|F|FF|u|uu|uuu', 'UTC', '2|002|1|001|2|002|3|003|1|001|1|001|1|001|1|01|2|0002|1|001|1|01|1|01|2|02|002'],
        [1704157323004, 'S|SS|SSS|SSSS|SSSSS|a|aa|aaaa|E|EE|EEE|EEEE|MMMMMM|yyyyyy|YYYYY', 'UTC', '4|04|004|0004|00004|AM|AM|AM|Tue|Tue|Tue|Tuesday|January|002024|02024'],
        [1230811200000, 'y|yy|yyy|yyyy|yyyyy|Y|YY|YYY', 'UTC', '2009|09|2009|2009|02009|2009|09|2009'],
        [1704200700000, 'h|hh|K|KK|k|kk|H|a', 'UTC', '1|01|1|01|13|13|13|PM'],
        [1704196800000, 'h|K|k|H|a', 'UTC', '12|0|12|12|PM'],
        [-1, 'yyyy-MM-dd HH:mm:ss.SSS|S|SS', 'UTC', '1969-12-31 23:59:59.999|999|999'],
        [253402300799999, 'yyyy-MM-dd HH:mm:ss.SSS', 'UTC', '9999-12-31 23:59:59.999'],
        [1704153600000, '\'\'|\'\'\'\'|\'a\'\'b\'|HH\'\'mm|\'HH\'', 'UTC', '\'|\'\'|a\'b|00\'00|HH'],
        [1704153600000, 'G|GG|GGG|GGGG|GGGGG', 'UTC', 'AD|AD|AD|AD|AD'],
        [1704153600000, 'X|XX|XXX|Z', 'America/St_Johns', '-03|-0330|-03:30|-0330'],
        [1735473600000, 'yyyy-MM-dd EEE|Y|YY|YYYY|w|ww|W|F|u|D|DDD', 'UTC', '2024-12-29 Sun|2025|25|2025|1|01|5|5|7|364|364'],
        [1672488000000, 'yyyy-MM-dd EEE|Y|YY|YYYY|w|ww|W|F|u|D|DDD', 'UTC', '2022-12-31 Sat|2022|22|2022|53|53|5|5|6|365|365'],
        ];
        expect(await formatAll(cases.map(([t, f, z]) => [t, f, z]))).toEqual(cases.map((c) => c[3]));
    });

    it('matches TradingView across zones, DST transitions, historical offsets and the Julian calendar', async () => {
        // prettier-ignore
        const cases: [number, string, string, string][] = [
        [769678756450, FULL, 'Africa/Casablanca', 'AD 1994-05-23 07:39:16.450 Mon 1 143 22 4 4 1994|+0000 Z Z Z|WET Western European Time|AM 7 7 7'],
        [556717913360, FULL, 'America/New_York', 'AD 1987-08-23 07:51:53.360 Sun 7 235 35 5 4 1987|-0400 -04 -0400 -04:00|EDT Eastern Daylight Time|AM 7 7 7'],
        [574448907211, FULL, 'America/Sao_Paulo', 'AD 1988-03-15 14:08:27.211 Tue 2 75 12 3 3 1988|-0300 -03 -0300 -03:00|BRT Brasilia Standard Time|PM 2 2 14'],
        [1536690646774, FULL, 'America/St_Johns', 'AD 2018-09-11 16:00:46.774 Tue 2 254 37 3 2 2018|-0230 -02 -0230 -02:30|NDT Newfoundland Daylight Time|PM 4 4 16'],
        [889906301769, FULL, 'Asia/Kathmandu', 'AD 1998-03-15 01:56:41.769 Sun 7 74 12 3 3 1998|+0545 +05 +0545 +05:45|NPT Nepal Time|AM 1 1 1'],
        [199774582443, FULL, 'Asia/Kolkata', 'AD 1976-05-01 10:26:22.443 Sat 6 122 18 1 1 1976|+0530 +05 +0530 +05:30|IST India Standard Time|AM 10 10 10'],
        [543833988567, FULL, 'Asia/Tehran', 'AD 1987-03-27 12:29:48.567 Fri 5 86 13 4 4 1987|+0330 +03 +0330 +03:30|IRST Iran Standard Time|PM 12 0 12'],
        [1898301079467, FULL, 'Australia/Lord_Howe', 'AD 2030-02-26 12:51:19.467 Tue 2 57 9 5 4 2030|+1100 +11 +1100 +11:00|LHDT Lord Howe Daylight Time|PM 12 0 12'],
        [817816533370, FULL, 'Etc/GMT+5', 'AD 1995-12-01 06:15:33.370 Fri 5 335 48 1 1 1995|-0500 -05 -0500 -05:00|GMT-05:00 GMT-05:00|AM 6 6 6'],
        [1156132992507, FULL, 'Europe/Berlin', 'AD 2006-08-21 06:03:12.507 Mon 1 233 34 4 3 2006|+0200 +02 +0200 +02:00|CEST Central European Summer Time|AM 6 6 6'],
        [875036146591, FULL, 'Europe/Dublin', 'AD 1997-09-23 18:35:46.591 Tue 2 266 39 4 4 1997|+0100 +01 +0100 +01:00|IST Irish Standard Time|PM 6 6 18'],
        [894729225551, FULL, 'Pacific/Chatham', 'AD 1998-05-10 04:38:45.551 Sun 7 130 20 3 2 1998|+1245 +12 +1245 +12:45|CHAST Chatham Standard Time|AM 4 4 4'],
        [-807341085985, FULL, 'America/Nuuk', 'AD 1944-06-01 15:35:14.015 Thu 4 153 23 1 1 1944|-0300 -03 -0300 -03:00|WGT West Greenland Standard Time|PM 3 3 15'],
        [-3252301181059, FULL, 'America/Rosario', 'AD 1866-12-09 12:00:18.941 Sun 7 343 50 3 2 1866|-0300 -03 -0300 -03:00|ART Argentina Standard Time|PM 12 0 12'],
        [-138530530832, FULL, 'Europe/Vaduz', 'AD 1965-08-11 16:17:49.168 Wed 3 223 33 2 2 1965|+0100 +01 +0100 +01:00|CET Central European Standard Time|PM 4 4 16'],
        [-380169192117, FULL, 'Asia/Dubai', 'AD 1957-12-15 01:26:47.883 Sun 7 349 51 3 3 1957|+0400 +04 +0400 +04:00|GST Gulf Standard Time|AM 1 1 1'],
        [-793941542709, FULL, 'Asia/Hong_Kong', 'AD 1944-11-04 05:40:57.291 Sat 6 309 45 1 1 1944|+0900 +09 +0900 +09:00|HKT Hong Kong Standard Time|AM 5 5 5'],
        [-554715295498, FULL, 'Asia/Tbilisi', 'AD 1952-06-03 19:25:04.502 Tue 2 155 23 1 1 1952|+0300 +03 +0300 +03:00|GET Georgia Standard Time|PM 7 7 19'],
        [-2724031704001, FULL, 'Africa/Accra', 'AD 1883-09-05 20:31:35.999 Wed 3 248 36 2 1 1883|+0000 Z Z Z|GMT Greenwich Mean Time|PM 8 8 20'],
        [-19924888607, FULL, 'America/Costa_Rica', 'AD 1969-05-15 03:18:31.393 Thu 4 135 20 3 3 1969|-0600 -06 -0600 -06:00|CST Central Standard Time|AM 3 3 3'],
        [1396141199000, FULL, 'Europe/Luxembourg', 'AD 2014-03-30 01:59:59.000 Sun 7 89 14 6 5 2014|+0100 +01 +0100 +01:00|CET Central European Standard Time|AM 1 1 1'],
        [1396141200000, FULL, 'Europe/Luxembourg', 'AD 2014-03-30 03:00:00.000 Sun 7 89 14 6 5 2014|+0200 +02 +0200 +02:00|CEST Central European Summer Time|AM 3 3 3'],
        [1521928799000, FULL, 'Asia/Beirut', 'AD 2018-03-24 23:59:59.000 Sat 6 83 12 4 4 2018|+0200 +02 +0200 +02:00|EET Eastern European Standard Time|PM 11 11 23'],
        [1521928800000, FULL, 'Asia/Beirut', 'AD 2018-03-25 01:00:00.000 Sun 7 84 13 5 4 2018|+0300 +03 +0300 +03:00|EEST Eastern European Summer Time|AM 1 1 1'],
        [636515999000, FULL, 'America/Argentina/San_Juan', 'AD 1990-03-03 23:59:59.000 Sat 6 62 9 1 1 1990|-0200 -02 -0200 -02:00|ARST Argentina Summer Time|PM 11 11 23'],
        [636516000000, FULL, 'America/Argentina/San_Juan', 'AD 1990-03-03 23:00:00.000 Sat 6 62 9 1 1 1990|-0300 -03 -0300 -03:00|ART Argentina Standard Time|PM 11 11 23'],
        [941331599000, FULL, 'Europe/Madrid', 'AD 1999-10-31 02:59:59.000 Sun 7 304 45 6 5 1999|+0200 +02 +0200 +02:00|CEST Central European Summer Time|AM 2 2 2'],
        [941331600000, FULL, 'Europe/Madrid', 'AD 1999-10-31 02:00:00.000 Sun 7 304 45 6 5 1999|+0100 +01 +0100 +01:00|CET Central European Standard Time|AM 2 2 2'],
        [450668466595, FULL, 'UTC-18', 'AD 1984-04-12 07:41:06.595 Thu 4 103 15 2 2 1984|-1800 -18 -1800 -18:00|GMT-18:00 GMT-18:00|AM 7 7 7'],
        [38960493914, FULL, 'Z', 'AD 1971-03-27 22:21:33.914 Sat 6 86 13 4 4 1971|+0000 Z Z Z|UTC Coordinated Universal Time|PM 10 10 22'],
        [-745001868389, FULL, 'GMT-09:30', 'AD 1946-05-23 21:32:11.611 Thu 4 143 21 4 4 1946|-0930 -09 -0930 -09:30|GMT-09:30 GMT-09:30|PM 9 9 21'],
        [1806359987514, FULL, 'UT+5', 'AD 2027-03-30 03:39:47.514 Tue 2 89 14 5 5 2027|+0500 +05 +0500 +05:00|GMT+05:00 GMT+05:00|AM 3 3 3'],
        [136266402523, FULL, 'GMT0', 'AD 1974-04-27 03:46:42.523 Sat 6 117 17 4 4 1974|+0000 Z Z Z|GMT Greenwich Mean Time|AM 3 3 3'],
        [293974875295, FULL, 'UTC+18:00:00', 'AD 1979-04-27 05:41:15.295 Fri 5 117 17 4 4 1979|+1800 +18 +1800 +18:00|GMT+18:00 GMT+18:00|AM 5 5 5'],
        [33554288253, FULL, 'GMT-09:30', 'AD 1971-01-23 23:08:08.253 Sat 6 23 4 4 4 1971|-0930 -09 -0930 -09:30|GMT-09:30 GMT-09:30|PM 11 11 23'],
        [-796270104307, FULL, 'GMT+0530', 'AD 1944-10-08 03:21:35.693 Sun 7 282 42 2 2 1944|+0530 +05 +0530 +05:30|GMT+05:30 GMT+05:30|AM 3 3 3'],
        [-11153311785376, FULL, 'Etc/Universal', 'AD 1616-07-25 17:50:14.624 Mon 1 207 31 5 4 1616|+0000 Z Z Z|UTC Coordinated Universal Time|PM 5 5 17'],
        [-9868909868668, FULL, 'UTC+3', 'AD 1657-04-07 15:08:51.332 Sat 6 97 14 1 1 1657|+0300 +03 +0300 +03:00|GMT+03:00 GMT+03:00|PM 3 3 15'],
        [-63563868268296, FULL, 'Etc/UTC', 'BC 0046-10-01 01:55:31.704 Thu 4 274 40 1 1 -45|+0000 Z Z Z|UTC Coordinated Universal Time|AM 1 1 1'],
        [-46331142855152, FULL, 'Asia/Damascus', 'AD 0501-10-27 01:05:44.848 Sat 6 300 43 4 4 501|+0300 +03 +0300 +03:00|EET Eastern European Time|AM 1 1 1'],
        [-8756641480248, FULL, 'Etc/UTC', 'AD 1692-07-05 23:35:19.752 Sat 6 187 27 1 1 1692|+0000 Z Z Z|UTC Coordinated Universal Time|PM 11 11 23'],
        [-36789090581444, FULL, 'UTC', 'AD 0804-03-10 08:10:18.556 Sun 7 70 11 3 2 804|+0000 Z Z Z|GMT Greenwich Mean Time|AM 8 8 8'],
        [694402911007, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '1992-01-03 Fri 1992 92 1 01 1 1 5 3 003'],
        [1668988693296, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '2022-11-20 Sun 2022 22 48 48 4 3 7 324 324'],
        [1216090003134, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '2008-07-15 Tue 2008 08 29 29 3 3 2 197 197'],
        [1561846080075, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '2019-06-29 Sat 2019 19 26 26 5 5 6 180 180'],
        [819979200000, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '1995-12-26 Tue 1995 95 52 52 5 4 2 360 360'],
        [820065600000, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '1995-12-27 Wed 1995 95 52 52 5 4 3 361 361'],
        [820152000000, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '1995-12-28 Thu 1995 95 52 52 5 4 4 362 362'],
        [820238400000, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '1995-12-29 Fri 1995 95 52 52 5 5 5 363 363'],
        [820324800000, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '1995-12-30 Sat 1995 95 52 52 5 5 6 364 364'],
        [820411200000, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '1995-12-31 Sun 1996 96 1 01 6 5 7 365 365'],
        [-1367836974660, FULL, 'Etc/GMT+8', 'AD 1926-08-28 05:17:05.340 Sat 6 240 35 4 4 1926|-0800 -08 -0800 -08:00|GMT-08:00 GMT-08:00|AM 5 5 5'],
        [-1206826392165, FULL, 'America/Rosario', 'AD 1931-10-04 22:26:47.835 Sun 7 277 41 2 1 1931|-0400 -04 -0400 -04:00|ART Argentina Standard Time|PM 10 10 22'],
        [-2273344542678, FULL, 'Jamaica', 'AD 1897-12-16 22:24:17.322 Thu 4 350 51 3 3 1897|-0500 -05 -0500 -05:00|EST Eastern Standard Time|PM 10 10 22'],
        [-1939911359011, FULL, 'EST5EDT', 'AD 1908-07-12 02:44:00.989 Sun 7 194 29 3 2 1908|-0500 -05 -0500 -05:00|EST Eastern Standard Time|AM 2 2 2'],
        [-3599507786477, FULL, 'Europe/Stockholm', 'AD 1855-12-09 01:43:33.523 Sun 7 343 50 3 2 1855|+0100 +01 +0100 +01:00|CET Central European Standard Time|AM 1 1 1'],
        [-3246705319370, FULL, 'Africa/Lusaka', 'AD 1867-02-12 11:24:40.630 Tue 2 43 7 3 2 1867|+0200 +02 +0200 +02:00|CAT Central Africa Time|AM 11 11 11'],
        [-3545806970663, FULL, 'Asia/Dushanbe', 'AD 1857-08-21 18:37:09.337 Fri 5 233 34 4 3 1857|+0500 +05 +0500 +05:00|TJT Tajikistan Time|PM 6 6 18'],
        [-1691599736488, FULL, 'America/Porto_Acre', 'AD 1916-05-25 02:11:03.512 Thu 4 146 22 4 4 1916|-0500 -05 -0500 -05:00|ACT Acre Standard Time|AM 2 2 2'],
        [1836471599000, FULL, 'America/Anchorage', 'AD 2028-03-12 01:59:59.000 Sun 7 72 12 3 2 2028|-0900 -09 -0900 -09:00|AKST Alaska Standard Time|AM 1 1 1'],
        [1836471600000, FULL, 'America/Anchorage', 'AD 2028-03-12 03:00:00.000 Sun 7 72 12 3 2 2028|-0800 -08 -0800 -08:00|AKDT Alaska Daylight Time|AM 3 3 3'],
        [748979999000, FULL, 'Asia/Irkutsk', 'AD 1993-09-26 02:59:59.000 Sun 7 269 40 5 4 1993|+0900 +09 +0900 +09:00|IRKST Irkutsk Summer Time|AM 2 2 2'],
        [748980000000, FULL, 'Asia/Irkutsk', 'AD 1993-09-26 02:00:00.000 Sun 7 269 40 5 4 1993|+0800 +08 +0800 +08:00|IRKT Irkutsk Standard Time|AM 2 2 2'],
        [1490489999000, FULL, 'Europe/Mariehamn', 'AD 2017-03-26 02:59:59.000 Sun 7 85 13 5 4 2017|+0200 +02 +0200 +02:00|EET Eastern European Standard Time|AM 2 2 2'],
        [1490490000000, FULL, 'Europe/Mariehamn', 'AD 2017-03-26 04:00:00.000 Sun 7 85 13 5 4 2017|+0300 +03 +0300 +03:00|EEST Eastern European Summer Time|AM 4 4 4'],
        [1065275999000, FULL, 'Antarctica/South_Pole', 'AD 2003-10-05 01:59:59.000 Sun 7 278 41 2 1 2003|+1200 +12 +1200 +12:00|NZST New Zealand Standard Time|AM 1 1 1'],
        [1065276000000, FULL, 'Antarctica/South_Pole', 'AD 2003-10-05 03:00:00.000 Sun 7 278 41 2 1 2003|+1300 +13 +1300 +13:00|NZDT New Zealand Daylight Time|AM 3 3 3'],
        [-1663340962888, FULL, 'GMT+0530', 'AD 1917-04-17 14:20:37.112 Tue 2 107 16 3 3 1917|+0530 +05 +0530 +05:30|GMT+05:30 GMT+05:30|PM 2 2 14'],
        [-368375641144, FULL, 'Z', 'AD 1958-04-30 09:25:58.856 Wed 3 120 18 5 5 1958|+0000 Z Z Z|UTC Coordinated Universal Time|AM 9 9 9'],
        [-1222814069384, FULL, 'GMT', 'AD 1931-04-03 01:25:30.616 Fri 5 93 14 1 1 1931|+0000 Z Z Z|GMT Greenwich Mean Time|AM 1 1 1'],
        [-1637388410726, FULL, 'UTC+053015', 'AD 1918-02-11 23:23:24.274 Mon 1 42 7 3 2 1918|+0530 +05 +0530 +05:30|GMT+05:30:15 GMT+05:30:15|PM 11 11 23'],
        [-1583444721836, FULL, 'UTC0', 'AD 1919-10-29 02:14:38.164 Wed 3 302 44 5 5 1919|+0000 Z Z Z|GMT Greenwich Mean Time|AM 2 2 2'],
        [1101595114839, FULL, 'UTC', 'AD 2004-11-27 22:38:34.839 Sat 6 332 48 4 4 2004|+0000 Z Z Z|GMT Greenwich Mean Time|PM 10 10 22'],
        [1804607365026, FULL, 'Z', 'AD 2027-03-09 15:49:25.026 Tue 2 68 11 2 2 2027|+0000 Z Z Z|UTC Coordinated Universal Time|PM 3 3 15'],
        [247502178164, FULL, 'UTC+5:30', 'AD 1977-11-04 20:06:18.164 Fri 5 308 45 1 1 1977|+0530 +05 +0530 +05:30|GMT+05:30 GMT+05:30|PM 8 8 20'],
        [-56492408451653, FULL, 'UTC', 'AD 0179-10-30 16:19:08.347 Fri 5 303 44 5 5 179|+0000 Z Z Z|GMT Greenwich Mean Time|PM 4 4 16'],
        [-45858985906317, FULL, 'UTC+3', 'AD 0516-10-12 19:48:13.683 Wed 3 286 42 3 2 516|+0300 +03 +0300 +03:00|GMT+03:00 GMT+03:00|PM 7 7 19'],
        [-11809798267228, FULL, 'Etc/UTC', 'AD 1595-10-06 12:28:52.772 Fri 5 279 40 1 1 1595|+0000 Z Z Z|UTC Coordinated Universal Time|PM 12 0 12'],
        [-8882514282578, FULL, 'Pacific/Easter', 'AD 1688-07-09 20:55:17.422 Fri 5 191 28 2 2 1688|-0600 -06 -0600 -06:00|EAST Easter Island Standard Time|PM 8 8 20'],
        [-26170681842240, FULL, 'UTC', 'AD 1140-08-31 14:09:17.760 Sat 6 244 35 5 5 1140|+0000 Z Z Z|GMT Greenwich Mean Time|PM 2 2 14'],
        [-40798101417027, FULL, 'UTC', 'AD 0677-02-24 18:03:02.973 Tue 2 55 9 4 4 677|+0000 Z Z Z|GMT Greenwich Mean Time|PM 6 6 18'],
        [1668730140187, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '2022-11-18 Fri 2022 22 47 47 3 3 5 322 322'],
        [1566826807722, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '2019-08-26 Mon 2019 19 35 35 5 4 1 238 238'],
        [1557311199732, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '2019-05-08 Wed 2019 19 19 19 2 2 3 128 128'],
        [729544794502, 'yyyy-MM-dd E Y YY w ww W F u D DDD', 'UTC', '1993-02-12 Fri 1993 93 7 07 2 2 5 43 043'],
        [-923529600000, 'Z|z|zzzz', 'Europe/London', '+0100|BST|British Summer Time'],
        [-886032000000, 'Z|z|zzzz', 'Europe/London', '+0100|BST|British Summer Time'],
        [411912000000, 'Z|z|zzzz', 'Africa/Windhoek', '+0200|CAT|Central Africa Time'],
        [644241600000, 'Z|z|zzzz', 'Africa/Windhoek', '+0200|WAT|Western African Time'],
        [-2208988801000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'Africa/Monrovia', '1899-12-31 23:59:59 +0000|GMT|Greenwich Mean Time'],
        [-2208988800000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'Africa/Monrovia', '1899-12-31 23:16:52 -0043|GMT|Greenwich Mean Time'],
        [-2208988801000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'Pacific/Kiritimati', '1900-01-01 13:59:59 +1400|LINT|Line Islands Time'],
        [-2208988800000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'Pacific/Kiritimati', '1899-12-31 13:30:40 -1029|LINT|Line Islands Time'],
        [-851603400000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'Africa/Casablanca', '1943-01-06 12:30:00 +0100|WEST|Western European Summer Time'],
        [-819228600000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'America/Anguilla', '1944-01-16 01:30:00 -0300|ADT|Atlantic Daylight Time'],
        [-877903200000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'America/Argentina/Cordoba', '1942-03-07 23:00:00 -0300|ARST|Argentina Summer Time'],
        [-845980200000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'America/Argentina/Cordoba', '1943-03-12 10:30:00 -0300|ARST|Argentina Summer Time'],
        [-898081200000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'Europe/Prague', '1941-07-17 15:00:00 +0200|CEST|Central European Summer Time'],
        [-728519400000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'Europe/Prague', '1946-12-01 02:30:00 +0100|CET|Central European Standard Time'],
        [-626274174324, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'Africa/Casablanca', '1950-02-26 10:57:05 +0000|WET|Western European Time'],
        [-1641904422611, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'America/Anguilla', '1917-12-21 07:26:17 -0400|AST|Atlantic Standard Time'],
        [-1627905600000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'EST5EDT', '1918-06-01 08:00:00 -0400|EDT|Eastern Daylight Time'],
        [-1633284000000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'EST5EDT', '1918-03-31 01:00:00 -0500|EST|Eastern Standard Time'],
        [-1633280400000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'EST5EDT', '1918-03-31 03:00:00 -0400|EDT|Eastern Daylight Time'],
        [-1615143600000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'EST5EDT', '1918-10-27 01:00:00 -0400|EDT|Eastern Daylight Time'],
        [-1615140000000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'EST5EDT', '1918-10-27 01:00:00 -0500|EST|Eastern Standard Time'],
        [-1583193600000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'EST5EDT', '1919-10-31 19:00:00 -0500|EST|Eastern Standard Time'],
        [-1627905600000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'PST8PDT', '1918-06-01 05:00:00 -0700|PDT|Pacific Daylight Time'],
        [-1633284000000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'PST8PDT', '1918-03-30 22:00:00 -0800|PST|Pacific Standard Time'],
        [-1633280400000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'PST8PDT', '1918-03-30 23:00:00 -0800|PST|Pacific Standard Time'],
        [-1615143600000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'PST8PDT', '1918-10-26 22:00:00 -0700|PDT|Pacific Daylight Time'],
        [-1615140000000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'PST8PDT', '1918-10-26 23:00:00 -0700|PDT|Pacific Daylight Time'],
        [-1583193600000, 'yyyy-MM-dd HH:mm:ss Z|z|zzzz', 'PST8PDT', '1919-10-31 16:00:00 -0800|PST|Pacific Standard Time'],
        [-12219292800000, 'G yyyy-MM-dd HH:mm:ss EEE D w Y u|y|yy', 'UTC', 'AD 1582-10-15 00:00:00 Fri 278 40 1582 5|1582|82'],
        [-12219292800001, 'G yyyy-MM-dd HH:mm:ss EEE D w Y u|y|yy', 'UTC', 'AD 1582-10-04 23:59:59 Thu 277 40 1582 4|1582|82'],
        [-14817470400000, 'G yyyy-MM-dd HH:mm:ss EEE D w Y u|y|yy', 'UTC', 'AD 1500-06-05 12:00:00 Fri 157 23 1500 5|1500|00'],
        [-30610224000000, 'G yyyy-MM-dd HH:mm:ss EEE D w Y u|y|yy', 'UTC', 'AD 0999-12-27 00:00:00 Wed 361 52 999 3|999|99'],
        [-2177452800000, 'G yyyy-MM-dd HH:mm:ss EEE D w Y u|y|yy', 'UTC', 'AD 1901-01-01 00:00:00 Tue 1 1 1901 2|1901|01'],
        [-2195942400000, 'G yyyy-MM-dd HH:mm:ss EEE D w Y u|y|yy', 'UTC', 'AD 1900-06-01 00:00:00 Fri 152 22 1900 5|1900|00'],
        [-65322892800000, 'G yyyy-MM-dd HH:mm:ss EEE D w Y u|y|yy', 'UTC', 'BC 0101-01-04 00:00:00 Mon 4 2 -100 1|101|01'],
        [-2208988801000, 'G yyyy-MM-dd HH:mm:ss EEE D w Y u|y|yy', 'UTC', 'AD 1899-12-31 23:59:59 Sun 365 1 1900 7|1899|99'],
        [-1192665600000, 'HH:mm:ss Z X XX XXX', 'America/La_Paz', '20:27:24 -0332 -03 -0332 -03:32'],
        [-2745446400000, 'HH:mm:ss Z XXX z', 'America/New_York', '19:00:00 -0500 -05:00 EST'],
        ];
        expect(await formatAll(cases.map(([t, f, z]) => [t, f, z]))).toEqual(cases.map((c) => c[3]));
    });

    it('accepts UTC/GMT/UT offsets and IANA zone IDs, with Java zone names', async () => {
        // prettier-ignore
        const cases: [string, string][] = [
        ['UTC', '+0000|GMT|Greenwich Mean Time'],
        ['GMT', '+0000|GMT|Greenwich Mean Time'],
        ['UT', '+0000|GMT|Greenwich Mean Time'],
        ['Z', '+0000|UTC|Coordinated Universal Time'],
        ['UTC+5:30', '+0530|GMT+05:30|GMT+05:30'],
        ['UTC+530', '+0530|GMT+05:30|GMT+05:30'],
        ['UTC+005', '+0005|GMT+00:05|GMT+00:05'],
        ['UTC+0', '+0000|GMT|Greenwich Mean Time'],
        ['UTC-0', '+0000|GMT|Greenwich Mean Time'],
        ['UTC0', '+0000|GMT|Greenwich Mean Time'],
        ['GMT0', '+0000|GMT|Greenwich Mean Time'],
        ['UTC+18', '+1800|GMT+18:00|GMT+18:00'],
        ['UTC-18', '-1800|GMT-18:00|GMT-18:00'],
        ['UTC+05:30:00', '+0530|GMT+05:30|GMT+05:30'],
        ['UTC+053000', '+0530|GMT+05:30|GMT+05:30'],
        ['UT+5', '+0500|GMT+05:00|GMT+05:00'],
        ['GMT+0530', '+0530|GMT+05:30|GMT+05:30'],
        ['UTC+12:45', '+1245|GMT+12:45|GMT+12:45'],
        ['Etc/UTC', '+0000|UTC|Coordinated Universal Time'],
        ['Etc/GMT+5', '-0500|GMT-05:00|GMT-05:00'],
        ['UCT', '+0000|UTC|Coordinated Universal Time'],
        ['US/Eastern', '-0500|EST|Eastern Standard Time'],
        ['Asia/Calcutta', '+0530|IST|India Standard Time'],
        ['GB', '+0000|GMT|Greenwich Mean Time'],
        ['Japan', '+0900|JST|Japan Standard Time'],
        ['CET', '+0100|CET|Central European Time'],
        ['EST5EDT', '-0500|EST|Eastern Standard Time'],
        ['Africa/Windhoek', '+0200|WAT|Western African Time'],
        ['Africa/Casablanca', '+0100|WEST|Western European Summer Time'],
        ];
        expect(await formatAll(cases.map(([z]) => [1704153600000, 'Z|z|zzzz', z]))).toEqual(cases.map((c) => c[1]));
    });

    it('rejects other timezone values with TradingView\'s runtime error', async () => {
        const message = (tz: string) =>
            `Incorrect \`timezone\` value for the str.format_time() function: "${tz}". The value must be a string in either UTC/GMT notation ` +
            '(e.g. "UTC-5", "GMT+0530") or an IANA time zone database name (e.g. "America/New_York").';
        for (const tz of ['utc','Utc','EST','MST','UTC+19','UTC+18:01','UTC+14:60','UTC+5:3','UTC+00530','UTC5','UT0','+05:00','UTC 5','UTC+-5','america/new_york','Asia/Hanoi','ROC','Etc/UTC+5']) {
            expect(await runError(`str.format_time(0, "HH:mm", ${pine(tz)})`)).toBe(message(tz));
        }
        expect(await runError('str.format_time(0, "HH:mm", naTz)', 'string naTz = na\n')).toBe(message(''));
        expect(await runError('str.format_time(0, "HH:mm", timezone = naTz)', 'string naTz = na\n')).toBe(message(''));
    });

    it('rejects unknown pattern letters, XXXX and unterminated quotes, before checking the timezone', async () => {
        const message = (f: string) => `Invalid \`format\` value for the str.format_time() function: \`${f}\`.`;
        for (const f of ['b c e f g i j l n o p q r t v x', 'A B C I J N O P Q R T U V', 'XXXX', "HH 'abc"]) {
            expect(await runError(`str.format_time(0, ${pine(f)}, "UTC")`)).toBe(message(f));
        }
        expect(await runError('str.format_time(0, "XXXX", "bad")')).toBe(message('XXXX'));
    });
});
