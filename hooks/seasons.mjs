// Which seasonal outfit Clawd wears on a given day. Pure date logic, so plain node can test it.
// Dates are the person's local calendar days. A holiday outfit starts a few days before and ends on the day.

const DAY_MS = 24 * 60 * 60 * 1000
const dayNumber = (year, month, day) => Math.floor(Date.UTC(year, month, day) / DAY_MS)

// The nth Monday (1 = first) of a month. month is 0 for January.
function nthMonday(year, month, n) {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const firstMonday = 1 + ((8 - firstWeekday) % 7)
  return firstMonday + (n - 1) * 7
}

// The nth Sunday (1 = first) of a month. month is 0 for January.
function nthSunday(year, month, n) {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return 1 + ((7 - firstWeekday) % 7) + (n - 1) * 7
}

// The nth Thursday (1 = first) of a month. month is 0 for January.
function nthThursday(year, month, n) {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return 1 + ((11 - firstWeekday) % 7) + (n - 1) * 7
}

// Victoria Day: the Monday before May 25
function victoriaDay(year) {
  const weekday = new Date(Date.UTC(year, 4, 24)).getUTCDay()
  return 24 - ((weekday + 6) % 7)
}

// Easter Sunday for a year (the usual Gregorian calculation): returns { month, day }, month 0-based
function easter(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

// Chinese New Year (lunar, so a lookup): month is 0-based
const LUNAR_NEW_YEAR = { 2026: [1, 17], 2027: [1, 6], 2028: [0, 26], 2029: [1, 13], 2030: [1, 3], 2031: [0, 23], 2032: [1, 11], 2033: [0, 31], 2034: [1, 19], 2035: [1, 8], 2036: [0, 28], 2037: [1, 15], 2038: [1, 4], 2039: [0, 24], 2040: [1, 12] }

// Every outfit with the days it is worn, most specific first (summer is last: the holidays inside it win).
// Each rule gives [first day, last day] as day numbers for a year.
// Big events with a fixed list of dates, by year: [first month, first day, last month, last day] (months 0-based)
const OLYMPICS = { 2028: [6, 14, 6, 30], 2030: [1, 1, 1, 17], 2032: [6, 23, 7, 8] }
const WORLD_CUP = { 2026: [5, 11, 6, 19], 2030: [5, 8, 6, 21] }
const tableRange = (table) => (y) => { const t = table[y]; return t ? [dayNumber(y, t[0], t[1]), dayNumber(y, t[2], t[3])] : [1, 0] }

// Moving festivals, from published calendars (extend these tables as years pass). Months are 0-based.
// Diwali (Lakshmi Puja, as observed in India; timeanddate.com)
const DIWALI = { 2026: [10, 8], 2027: [9, 29], 2028: [9, 17], 2029: [10, 5], 2030: [9, 26], 2031: [10, 14] }
// The first night of Hanukkah (the first candle is lit that evening; chabad.org, hebcal.com)
const HANUKKAH = { 2026: [11, 4], 2027: [11, 24], 2028: [11, 12], 2029: [11, 1], 2030: [11, 20], 2031: [11, 9], 2032: [10, 27], 2033: [11, 16] }
// Eid al-Fitr (Fiqh Council of North America; other countries may differ by a day). 2033 has two.
const EID_AL_FITR = ['2026-03-20', '2027-03-09', '2028-02-26', '2029-02-14', '2030-02-04', '2031-01-24', '2032-01-14', '2033-01-02', '2033-12-23', '2034-12-12', '2035-12-01', '2036-11-19', '2037-11-08', '2038-10-29', '2039-10-19', '2040-10-07']
// Holi, the day of colours (timeanddate.com)
const HOLI = { 2026: [2, 4], 2027: [2, 22], 2028: [2, 11], 2029: [2, 1], 2030: [2, 20], 2031: [2, 9] }
// Earth Hour, 8:30 to 9:30 pm local time, on the night WWF announces (earthhour.org); later years use the last Saturday of March
const EARTH_HOUR = { 2026: [2, 28], 2027: [2, 27] }

// Which night of Hanukkah a date is (1 to 8), or 0 outside it. The night of the first candle counts as night 1 all day.
export function hanukkahNight(date) {
  for (const year of [date.getFullYear(), date.getFullYear() - 1]) {
    const start = HANUKKAH[year]
    if (!start) continue
    const night = dayNumber(date.getFullYear(), date.getMonth(), date.getDate()) - dayNumber(year, start[0], start[1]) + 1
    if (night >= 1 && night <= 8) return night
  }
  return 0
}

// The day of the year (1 for January 1)
const dayOfYear = (y, m, d) => dayNumber(y, m, d) - dayNumber(y, 0, 1) + 1

// Oktoberfest in Munich: from the Saturday after September 15 to the first Sunday of October, or to October 3 if that is later
function oktoberfest(year) {
  const weekday = new Date(Date.UTC(year, 8, 15)).getUTCDay()
  const start = dayNumber(year, 8, 15 + (((6 - weekday) % 7) || 7))
  return [start, Math.max(dayNumber(year, 9, nthSunday(year, 9, 1)), dayNumber(year, 9, 3))]
}

// The last Saturday of a month
function lastSaturday(year, month) {
  const last = new Date(Date.UTC(year, month + 1, 0))
  return last.getUTCDate() - ((last.getUTCDay() + 1) % 7)
}

const RULES = [
  { id: 'olympics', range: tableRange(OLYMPICS) },
  { id: 'hanukkah', range: (y) => { const d = HANUKKAH[y]; if (!d) return [1, 0]; const n = dayNumber(y, d[0], d[1]); return [n, n + 7] } },
  { id: 'diwali', range: (y) => { const d = DIWALI[y]; if (!d) return [1, 0]; const n = dayNumber(y, d[0], d[1]); return [n, n + 1] } },
  { id: 'holi', range: (y) => { const d = HOLI[y]; if (!d) return [1, 0]; const n = dayNumber(y, d[0], d[1]); return [n, n] } },
  { id: 'nowruz', range: (y) => [dayNumber(y, 2, 20), dayNumber(y, 2, 21)] },
  { id: 'towelday', range: (y) => [dayNumber(y, 4, 25), dayNumber(y, 4, 25)] },
  { id: 'programmers', range: (y) => { const n = dayNumber(y, 0, 1) + 255; return [n, n] } },
  { id: 'riel', where: ['CA-MB'], range: (y) => [dayNumber(y, 1, nthMonday(y, 1, 3)) - 3, dayNumber(y, 1, nthMonday(y, 1, 3))] },
  { id: 'chinese', range: (y) => { const d = LUNAR_NEW_YEAR[y]; if (!d) return [1, 0]; const n = dayNumber(y, d[0], d[1]); return [n - 3, n + 3] } },
  { id: 'groundhog', where: ['CA', 'US'], range: (y) => [dayNumber(y, 1, 2), dayNumber(y, 1, 2)] },
  { id: 'voyageur', where: ['CA-MB'], range: (y) => { const m = dayNumber(y, 1, nthMonday(y, 1, 3)); return [m - 3, m + 6] } },
  { id: 'superbowl', where: ['US', 'CA'], range: (y) => [dayNumber(y, 1, nthSunday(y, 1, 2)), dayNumber(y, 1, nthSunday(y, 1, 2))] },
  { id: 'valentines', range: (y) => [dayNumber(y, 1, 7), dayNumber(y, 1, 14)] },
  { id: 'piday', range: (y) => [dayNumber(y, 2, 14), dayNumber(y, 2, 14)] },
  { id: 'goodfriday', range: (y) => { const { month, day } = easter(y); return [dayNumber(y, month, day) - 2, dayNumber(y, month, day) - 2] } },
  { id: 'stpatricks', range: (y) => [dayNumber(y, 2, 10), dayNumber(y, 2, 17)] },
  { id: 'earth', range: (y) => [dayNumber(y, 3, 22), dayNumber(y, 3, 22)] },
  { id: 'aprilfools', range: (y) => [dayNumber(y, 3, 1), dayNumber(y, 3, 1)] },
  { id: 'easter', range: (y) => { const { month, day } = easter(y); return [dayNumber(y, month, day) - 7, dayNumber(y, month, day) + 1] } },
  { id: 'victoria', where: ['CA'], range: (y) => [dayNumber(y, 4, victoriaDay(y)) - 3, dayNumber(y, 4, victoriaDay(y))] },
  { id: 'pride', range: (y) => [dayNumber(y, 5, nthSunday(y, 5, 1)) - 2, dayNumber(y, 5, nthSunday(y, 5, 1))] },
  { id: 'graduation', where: ['CA', 'US'], range: (y) => [dayNumber(y, 5, 1), dayNumber(y, 5, 14)] },
  { id: 'canada', where: ['CA'], range: (y) => [dayNumber(y, 6, 1), dayNumber(y, 6, 1)] },
  { id: 'maythe4th', range: (y) => [dayNumber(y, 4, 4), dayNumber(y, 4, 4)] },
  { id: 'cinco', where: ['MX', 'US'], range: (y) => [dayNumber(y, 4, 5), dayNumber(y, 4, 5)] },
  { id: 'mothersday', range: (y) => [dayNumber(y, 4, nthSunday(y, 4, 2)), dayNumber(y, 4, nthSunday(y, 4, 2))] },
  { id: 'fathersday', range: (y) => [dayNumber(y, 5, nthSunday(y, 5, 3)), dayNumber(y, 5, nthSunday(y, 5, 3))] },
  { id: 'juneteenth', where: ['US'], range: (y) => [dayNumber(y, 5, 19), dayNumber(y, 5, 19)] },
  { id: 'usa', where: ['US'], range: (y) => [dayNumber(y, 6, 4), dayNumber(y, 6, 4)] },
  { id: 'mexico', where: ['MX'], range: (y) => [dayNumber(y, 8, 15), dayNumber(y, 8, 16)] },
  { id: 'chile', where: ['CL'], range: (y) => [dayNumber(y, 8, 18), dayNumber(y, 8, 19)] },
  { id: 'pirateday', range: (y) => [dayNumber(y, 8, 19), dayNumber(y, 8, 19)] },
  { id: 'terryfox', where: ['CA-MB'], range: (y) => [dayNumber(y, 8, nthMonday(y, 8, 1) + 13), dayNumber(y, 8, nthMonday(y, 8, 1) + 13)] },
  { id: 'orangeshirt', where: ['CA'], range: (y) => [dayNumber(y, 8, 30), dayNumber(y, 8, 30)] },
  { id: 'labour', where: ['CA', 'US'], range: (y) => [dayNumber(y, 8, nthMonday(y, 8, 1)) - 3, dayNumber(y, 8, nthMonday(y, 8, 1))] },
  { id: 'oktoberfest', range: oktoberfest },
  { id: 'thanksgiving', where: ['CA'], range: (y) => [dayNumber(y, 9, nthMonday(y, 9, 2)) - 3, dayNumber(y, 9, nthMonday(y, 9, 2))] },
  { id: 'movember', range: (y) => [dayNumber(y, 10, 1), dayNumber(y, 10, 1)] },
  { id: 'dayofdead', where: ['MX'], range: (y) => [dayNumber(y, 10, 1), dayNumber(y, 10, 2)] },
  { id: 'blackfriday', range: (y) => [dayNumber(y, 10, nthThursday(y, 10, 4)) + 1, dayNumber(y, 10, nthThursday(y, 10, 4)) + 1] },
  { id: 'cybermonday', range: (y) => [dayNumber(y, 10, nthThursday(y, 10, 4)) + 4, dayNumber(y, 10, nthThursday(y, 10, 4)) + 4] },
  { id: 'usthanksgiving', where: ['US'], range: (y) => [dayNumber(y, 10, nthThursday(y, 10, 4)), dayNumber(y, 10, nthThursday(y, 10, 4)) + 3] },
  { id: 'halloween', range: (y) => [dayNumber(y, 9, 21), dayNumber(y, 9, 31)] },
  { id: 'remembrance', where: ['CA', 'GB', 'AU'], range: (y) => [dayNumber(y, 10, 11), dayNumber(y, 10, 11)] },
  { id: 'boxingday', where: ['CA', 'GB', 'AU'], range: (y) => [dayNumber(y, 11, 26), dayNumber(y, 11, 26)] },
  { id: 'veterans', where: ['US'], range: (y) => [dayNumber(y, 10, 11), dayNumber(y, 10, 11)] },
  { id: 'gta6', range: (y) => (y === 2026 ? [dayNumber(y, 10, 19), dayNumber(y, 10, 19)] : [1, 0]) },
  { id: 'greycup', where: ['CA'], range: (y) => [dayNumber(y, 10, nthSunday(y, 10, 3)), dayNumber(y, 10, nthSunday(y, 10, 3))] },
  { id: 'christmas', range: (y) => [dayNumber(y, 11, 1), dayNumber(y, 11, 26)] },
  { id: 'newyearsday', range: (y) => [dayNumber(y, 0, 1), dayNumber(y, 0, 1)] },
  { id: 'newyear', range: (y) => [dayNumber(y, 11, 31), dayNumber(y, 11, 31)] },
  { id: 'worldcup', range: tableRange(WORLD_CUP) },
  { id: 'summer', range: (y) => [dayNumber(y, 5, 21), dayNumber(y, 8, 22)] },
]

// Which regions a rule is for match the person's settings: 'CA' covers 'CA-MB', but 'CA-MB' only matches that province
function isForRegions(where, regions) {
  if (!where) return true
  return regions.some((region) => where.some((tag) => region === tag || region.startsWith(`${tag}-`)))
}

// "MM-DD" as stored by /krab birthday and friends, or null
function monthDay(value) {
  const match = /^(\d{2})-(\d{2})$/.exec(value ?? '')
  return match ? [Number(match[1]) - 1, Number(match[2])] : null
}

// The personal days, from the person's settings, which win over every holiday on their day
const PERSONAL = [['birthday', 'birthday'], ['herbirthday', 'gfBirthday'], ['hisbirthday', 'bfBirthday'], ['anniversary', 'anniversary']]

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// The outfit id for a Date, or null on an ordinary day.
// settings: { regions: ['CA-MB', 'US', ...], days: { birthday, gfBirthday, bfBirthday, anniversary } as 'MM-DD', south: true below the equator }
export function outfitFor(date, settings = {}) {
  const regions = settings.regions ?? []
  for (const [id, key] of PERSONAL) {
    const day = monthDay(settings.days?.[key])
    if (day && date.getMonth() === day[0] && date.getDate() === day[1]) return id
  }
  // Earth Hour: only during the hour itself, when the lights go out
  const earth = EARTH_HOUR[date.getFullYear()] ?? [2, lastSaturday(date.getFullYear(), 2)]
  const minutes = date.getHours() * 60 + date.getMinutes()
  if (date.getMonth() === earth[0] && date.getDate() === earth[1] && minutes >= 20 * 60 + 30 && minutes < 21 * 60 + 30) return 'earthhour'
  // Friday the 13th, in any month, wins over everything
  if (date.getDate() === 13 && date.getDay() === 5) return 'friday13'
  // Leap Day, February 29
  if (date.getMonth() === 1 && date.getDate() === 29) return 'leapday'
  // Valentine's Day itself always wins, even over Louis Riel Day
  if (date.getMonth() === 1 && date.getDate() === 14) return 'valentines'
  const today = dayNumber(date.getFullYear(), date.getMonth(), date.getDate())
  const year = date.getFullYear()
  // Eid al-Fitr and the day after
  const yesterday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1)
  if (EID_AL_FITR.includes(isoDate(date)) || EID_AL_FITR.includes(isoDate(yesterday))) return 'eid'
  for (const rule of RULES) {
    if (!isForRegions(rule.where, regions)) continue
    // Below the equator summer is December to March: the summer outfit follows the person's own summer
    const [first, last] = rule.id === 'summer' && settings.south ? [dayNumber(year, 11, 21), dayNumber(year + 1, 2, 20)] : rule.range(year)
    const southEarly = rule.id === 'summer' && settings.south && today <= dayNumber(year, 2, 20)
    if ((today >= first && today <= last) || southEarly) return rule.id
  }
  return null
}

// Every region code a holiday is tagged with, for /krab holidays
export const REGION_CODES = [...new Set(RULES.flatMap((rule) => rule.where ?? []))].sort()

// The days each outfit is worn, in words, for the preview page
export const WHEN = {
  chinese: 'Three days before to three days after Lunar New Year (2026: Feb 17, 2027: Feb 6, 2028: Jan 26, and so on to 2040).',
  valentines: 'February 7 to February 14.',
  riel: 'The Friday to the 3rd Monday of February (Louis Riel Day, Manitoba).',
  stpatricks: 'March 10 to March 17.',
  goodfriday: 'Good Friday, the Friday before Easter Sunday.',
  easter: 'The week leading up to Easter, through Easter Monday.',
  victoria: 'The Friday to the Monday before May 25 (Victoria Day).',
  pride: 'The Friday to the Sunday of the first Sunday in June (a Pride Parade weekend: June 5 to 7 in 2026).',
  leapday: 'February 29, which only comes every four years.',
  graduation: 'June 1 to June 14.',
  canada: 'July 1 only.',
  usa: 'July 4 only.',
  olympics: 'The Games: LA 2028 (July 14 to 30), the French Alps 2030 (February 1 to 17), Brisbane 2032 (July 23 to August 8).',
  worldcup: 'The big international football tournament, on days with no other holiday: 2026 (June 11 to July 19) and 2030 (June 8 to July 21).',
  superbowl: 'The big American football final, the 2nd Sunday of February (Valentine\'s Day itself still wins).',
  greycup: 'The Canadian football final, the 3rd Sunday of November.',
  gta6: 'November 19, 2026 only (a huge, long-awaited video game release).',
  friday13: 'Any Friday the 13th, in any month (it wins over everything else).',
  anniversary: 'Your anniversary, once you set it with /krab anniversary.',
  herbirthday: "Your girlfriend's birthday, once you set it with /krab gf-birthday.",
  hisbirthday: "Your boyfriend's birthday, once you set it with /krab bf-birthday.",
  programmers: "The 256th day of the year: September 13, or the day before in a leap year (Programmers' Day).",
  diwali: 'The day of Diwali and the day after (2026: Nov 8, 2027: Oct 29, 2028: Oct 17, through 2031).',
  hanukkah: 'The eight nights of Hanukkah, with one more menorah candle lit each night (2026: from Dec 4, 2027: from Dec 24, through 2033).',
  eid: 'Eid al-Fitr and the day after (2026: Mar 20, 2027: Mar 9, 2028: Feb 26, through 2040; some countries may be a day apart).',
  earthhour: 'Earth Hour night, only from 8:30 to 9:30 pm (2026: March 28), when the lights go out.',
  veterans: 'November 11 (Remembrance Day, the Canadian outfit, takes that day first; try this one with /krab outfit veterans).',
  usthanksgiving: 'Thursday (and the Saturday and Sunday) of the 4th week of November (US Thanksgiving).',
  blackfriday: 'The Friday after US Thanksgiving.',
  cybermonday: 'The Monday after US Thanksgiving.',
  parka: 'Whenever it feels -30 or colder outside (from the live weather), on days with no holiday outfit.',
  heatwave: 'Whenever it feels 30 or hotter outside by day (from the live weather), on days with no holiday outfit.',
  blizzard: 'Whenever it is snowing in a strong wind (from the live weather), on days with no holiday outfit.',
  voyageur: 'The Friday before the 3rd Monday of February, for 10 days (Festival du Voyageur).',
  terryfox: 'The 2nd Sunday after Labour Day (Terry Fox Run).',
  aprilfools: 'April 1 only.',
  movember: 'November 1 only (the first day of Movember).',
  dayofdead: 'November 2 (November 1 is Movember).',
  orangeshirt: 'September 30 only (National Day for Truth and Reconciliation).',
  boxingday: 'December 26 only.',
  groundhog: 'February 2 only (Groundhog Day).',
  piday: 'March 14 only (Pi Day).',
  thanksgiving: 'The Friday to the 2nd Monday of October (Canadian Thanksgiving).',
  newyear: "December 31 only (New Year's Eve).",
  newyearsday: "January 1 only (New Year's Day).",
  mothersday: 'The 2nd Sunday of May only (Mother\'s Day).',
  fathersday: 'The 3rd Sunday of June only (Father\'s Day).',
  earth: 'April 22 only (Earth Day).',
  birthday: 'Your birthday, once you set it with /krab birthday.',
  cinco: 'May 5 only.',
  maythe4th: 'May 4 only (May the Fourth be with you).',
  summer: 'June 21 to September 22, except when a holiday below it applies.',
  chile: 'September 18 and 19 (Fiestas Patrias).',
  mexico: 'September 15 and 16 (El Grito, the night of the 15th, and Independence Day).',
  holi: 'The day of Holi, the festival of colours (2026: Mar 4, 2027: Mar 22, 2028: Mar 11, through 2031).',
  nowruz: 'March 20 and 21 (Nowruz, the Persian New Year, at the spring equinox).',
  juneteenth: 'June 19 only (Juneteenth).',
  oktoberfest: 'The Saturday after September 15 to the first Sunday of October (Oktoberfest), when no other holiday is on.',
  pirateday: 'September 19 only (Talk Like a Pirate Day). Chile\'s Independence Day wins that day if you follow Chile.',
  towelday: 'May 25 only (Towel Day, for fans of a certain guide to the galaxy).',
  labour: 'The Friday to the 1st Monday of September (Labour Day).',
  halloween: 'October 21 to 31, with a different costume every day: witch, ghost, pirate, mummy, skeleton, zombie, vampire, Frankenstein\'s monster, Ghostbuster, werewolf, and the pumpkin on Halloween night.',
  remembrance: 'November 11 only.',
  christmas: 'December 1 to December 26.',
}

// The season for a Date (flipped below the equator): the background effect on days with no holiday outfit
export function seasonFor(date, south = false) {
  if (south) return { winter: 'summer', spring: 'fall', summer: 'winter', fall: 'spring' }[seasonFor(date)]
  const today = dayNumber(date.getFullYear(), date.getMonth(), date.getDate())
  const year = date.getFullYear()
  const starts = [
    ['winter', dayNumber(year, 11, 1)],
    ['fall', dayNumber(year, 8, 23)],
    ['summer', dayNumber(year, 5, 21)],
    ['spring', dayNumber(year, 2, 20)],
  ]
  for (const [name, first] of starts) if (today >= first) return name
  return 'winter'
}

// The time of day behind him: stars and a moon at night (9 pm to 5 am), the sun rising in the morning (5 to 10 am), the sun setting (6 to 9 pm)
export function timeOfDay(hour) {
  if (hour >= 21 || hour < 5) return 'night'
  if (hour < 10) return 'sunrise'
  if (hour >= 18) return 'sunset'
  return null
}

// A day's scenes with the sky of the hour added behind them. The daytime sun (the summer one, and a heat wave's blazing one)
// steps aside, since the sky is not daytime.
const DAYTIME_SUNS = new Set(['sun', 'summer', 'scorcher'])
export function scenesWithTime(scenes, hour) {
  const time = timeOfDay(hour)
  const base = scenes ?? []
  if (time === null) return base
  // Eid's crescent brings its own stars, so the ordinary moon stays away
  if (time === 'night' && base.includes('crescent')) return base
  const kept = base.filter((id) => !DAYTIME_SUNS.has(id))
  if (base.includes('summer')) kept.push('clouds')
  return [time, ...new Set(kept)]
}

import { HARVEST_MOON_NIGHTS, SUPERMOON_NIGHTS } from './moondata.mjs'

// ---- Sky events, added behind him at night (and the odd one by day) ----
// Total lunar eclipses (blood moons) visible at night from central North America, by the evening the night begins (NASA's list, in Central time).
// Elsewhere the eclipse may not be visible, or may fall on the next night.
const BLOOD_MOON_EVENINGS = ['2026-03-02', '2029-06-25', '2033-10-07', '2036-08-06']
// The northern lights only show when the Kp index (see weather.mjs) reaches a real geomagnetic storm (level G1)
export const AURORA_KP = 5
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// The calendar day a night began on: after midnight it is still yesterday evening's night
function nightOf(date, hour) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (hour < 5) d.setDate(d.getDate() - 1)
  return d
}

// Total solar eclipses (somewhere on Earth), the day they happen: a darkened sun by day. Hybrid eclipse of 2031 included.
const TOTAL_SOLAR_ECLIPSES = ['2026-08-12', '2027-08-02', '2028-07-22', '2030-11-25', '2031-11-14', '2033-03-30']

// The evenings the meteor showers peak around (each night runs on until the next morning)
function meteorShowerNight(night) {
  const month = night.getMonth()
  const day = night.getDate()
  if (month === 7 && day >= 11 && day <= 13) return true // the Perseids
  if (month === 10 && day >= 16 && day <= 17) return true // the Leonids
  return month === 11 && day >= 13 && day <= 14 // the Geminids
}

// What the sky is doing. weather: the reading ({ sky }) or null; kp: the live Kp index or null; force: show the aurora regardless (for trying it out)
export function skyEvents(date, { hour = date.getHours(), weather = null, kp = null, force = false } = {}) {
  const none = { bloodMoon: false, bigMoon: null, meteors: false, aurora: false, eclipse: false }
  // A total solar eclipse, in daylight
  if (hour >= 8 && hour < 18) return { ...none, eclipse: TOTAL_SOLAR_ECLIPSES.includes(isoDay(date)) }
  if (timeOfDay(hour) !== 'night') return none
  const night = nightOf(date, hour)
  const evening = isoDay(night)
  return {
    bloodMoon: BLOOD_MOON_EVENINGS.includes(evening),
    // The Harvest Moon wins over an ordinary supermoon
    bigMoon: HARVEST_MOON_NIGHTS.includes(evening) ? 'harvest' : SUPERMOON_NIGHTS.includes(evening) ? 'super' : null,
    meteors: meteorShowerNight(night),
    ufo: rareNight(night) === 'ufo',
    comet: rareNight(night) === 'comet',
    // The northern lights need a real storm (a high enough Kp) and a clear sky; with no reading of either, there are none
    aurora: force || (weather?.sky === 'sunny' && typeof kp === 'number' && kp >= AURORA_KP),
    eclipse: false,
  }
}

// The scenes with the sky's events added. The night sky (the 'night' scene) gets the night events; a blood moon, Harvest Moon or supermoon replaces the ordinary moon.
// A solar eclipse takes over the sun by day.
export function scenesWithSky(scenes, events) {
  if (events.eclipse) {
    const kept = (scenes ?? []).filter((id) => id !== 'sun' && id !== 'summer')
    if ((scenes ?? []).includes('summer')) kept.push('clouds')
    return [...new Set([...kept, 'eclipse'])]
  }
  if (!scenes?.includes('night')) return scenes
  const rare = [...(events.ufo ? ['ufo'] : []), ...(events.comet ? ['comet'] : [])]
  const moon = events.bloodMoon ? 'bloodmoon' : events.bigMoon === 'harvest' ? 'harvestmoon' : events.bigMoon === 'super' ? 'supermoon' : null
  const swapped = scenes.map((id) => (id === 'night' && moon ? moon : id))
  return [...(events.aurora ? ['aurora'] : []), ...swapped, ...(events.meteors ? ['meteors'] : []), ...rare]
}

// ---- Everyday life: birds by day, butterflies on spring and summer days, fireflies on summer nights ----
// Not in rain, snow, storms, fog, smoke or the extreme cold and heat: everything with sense stays home then
const STAY_HOME = new Set(['rain', 'storm', 'blizzard', 'snow', 'hail', 'freezingrain', 'fog', 'smoke', 'fire', 'frostedglass', 'eclipse', 'blackout'])
export function scenesWithLife(scenes, { hour, season }) {
  const base = scenes ?? []
  if (base.some((id) => STAY_HOME.has(id))) return base
  const time = timeOfDay(hour)
  const added = []
  if (time !== 'night') added.push('birds')
  if (time === null && (season === 'spring' || season === 'summer')) added.push('butterflies')
  if (time === 'night' && season === 'summer') added.push('fireflies')
  return [...base, ...added.filter((id) => !base.includes(id))]
}

// A rare night: about one night in 40 a UFO zips past, and on another one in 40 a comet hangs in the sky (the same nights every year)
function rareNight(night) {
  const n = Math.floor(Date.UTC(night.getFullYear(), night.getMonth(), night.getDate()) / 86400000)
  const mixed = Math.imul(n ^ (n >>> 7), 2654435761) >>> 0
  return mixed % 40 === 0 ? 'ufo' : mixed % 40 === 20 ? 'comet' : null
}

// The next World Cup year, read from the date: a tournament counts until the end of July of its year, then the next one (every four years from 2026)
export function worldCupYear(date) {
  const year = date.getFullYear()
  const offset = (((2026 - year) % 4) + 4) % 4
  return offset === 0 && date.getMonth() > 6 ? year + 4 : year + offset
}

// The number of the next Super Bowl (Super Bowl LXI is the game of February 2027), counting a game as over once its Sunday has passed
export function superBowlNumber(date) {
  const year = date.getFullYear()
  const game = new Date(year, 1, nthSunday(year, 1, 2), 23, 59)
  return (date > game ? year + 1 : year) - 1966
}
