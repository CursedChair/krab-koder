// Run with: node --test tests/seasons.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hanukkahNight, outfitFor, REGION_CODES, scenesWithSky, seasonFor, scenesWithTime, skyEvents, superBowlNumber, timeOfDay, worldCupYear } from '../hooks/seasons.mjs'

// Someone who gets every country's holidays, with made-up personal days (not anyone's real ones)
const EVERYWHERE = { regions: ['CA-MB', 'US', 'MX', 'CL', 'GB'], days: { birthday: '08-08', gfBirthday: '10-07', bfBirthday: '01-20', anniversary: '04-09' } }
const on = (iso, settings = EVERYWHERE) => outfitFor(new Date(`${iso}T12:00:00`), settings)

test('each outfit starts and ends on the right days', () => {
  assert.equal(on('2026-10-20'), null)
  assert.equal(on('2026-10-21'), 'halloween')
  assert.equal(on('2026-10-24'), 'halloween')
  assert.equal(on('2026-10-31'), 'halloween')
  assert.notEqual(on('2026-11-01'), 'halloween')
  assert.equal(on('2026-11-01'), 'movember')
  assert.equal(on('2026-11-03'), null)
  assert.equal(on('2026-11-04'), null)
  assert.equal(on('2026-11-10'), null)
  assert.equal(on('2026-11-11'), 'remembrance')
  assert.equal(on('2026-11-12'), null)
  assert.equal(on('2026-12-01'), 'christmas')
  assert.equal(on('2026-12-25'), 'christmas')
  assert.equal(on('2026-12-26'), 'boxingday')
  assert.equal(on('2026-12-27'), null)
  assert.equal(on('2026-03-09'), null)
  assert.equal(on('2026-03-10'), 'stpatricks')
  assert.equal(on('2026-03-17'), 'stpatricks')
  assert.equal(on('2026-03-18'), null)
})

test('holidays that move: Louis Riel Day, Easter, Victoria Day and Labour Day', () => {
  // Louis Riel Day 2026 is Monday Feb 16 (third Monday)
  assert.equal(on('2026-02-13'), 'friday13')
  assert.equal(on('2026-02-16'), 'riel')
  assert.equal(on('2026-02-17'), 'chinese')
  assert.equal(on('2026-02-12'), 'valentines')
  // Easter 2026 is April 5, 2027 is March 28
  assert.equal(on('2026-03-29'), 'easter')
  assert.equal(on('2026-04-05'), 'easter')
  assert.equal(on('2026-04-03'), 'goodfriday')
  assert.equal(on('2026-04-02'), 'easter')
  assert.equal(on('2027-03-26'), 'goodfriday')
  assert.equal(on('2026-04-06'), 'easter')
  assert.equal(on('2026-04-07'), null)
  assert.equal(on('2027-03-28'), 'easter')
  // Victoria Day 2026 is Monday May 18, 2027 is Monday May 24
  assert.equal(on('2026-05-15'), 'victoria')
  assert.equal(on('2026-05-18'), 'victoria')
  assert.equal(on('2026-05-19'), null)
  assert.equal(on('2027-05-24'), 'victoria')
  // Labour Day 2026 is Monday Sep 7, 2027 is Sep 6
  assert.equal(on('2026-09-04'), 'labour')
  assert.equal(on('2026-09-07'), 'labour')
  assert.equal(on('2027-09-06'), 'labour')
})

test('summer fills the gaps, and the holidays inside it win', () => {
  // 2027 has no World Cup, so summer shows as plain summer
  assert.equal(on('2027-06-20'), 'fathersday')
  assert.equal(on('2027-06-27'), 'summer')
  assert.equal(on('2027-06-30'), 'summer')
  assert.equal(on('2027-07-01'), 'canada')
  assert.equal(on('2027-07-02'), 'summer')
  assert.equal(on('2026-09-04'), 'labour')
  assert.equal(on('2026-09-08'), 'summer')
  assert.equal(on('2026-09-11'), 'summer')
  assert.equal(on('2026-09-22'), 'oktoberfest', 'Oktoberfest takes over the last days of summer')
  assert.equal(on('2026-10-05'), null)
  // in 2026 the World Cup fills the gaps instead, and the holidays still win
  assert.equal(on('2026-06-27'), 'worldcup')
  assert.equal(on('2026-07-01'), 'canada')
  assert.equal(on('2026-07-04'), 'usa')
})

test("Valentine's Day: Feb 7 to 14, and the 14th wins even on Louis Riel Day's weekend", () => {
  assert.equal(on('2026-02-06'), null)
  assert.equal(on('2026-02-07'), 'valentines')
  assert.equal(on('2026-02-11'), 'valentines')
  // In 2026 Louis Riel Day is Monday Feb 16: its Friday-to-Monday run starts Feb 13, but the 14th is Valentine's
  assert.equal(on('2026-02-13'), 'friday13')
  assert.equal(on('2026-02-14'), 'valentines')
  assert.equal(on('2026-02-15'), 'riel')
  // In 2027 Louis Riel Day is Monday Feb 15 (run from Feb 12): Valentine's still takes the 14th
  assert.equal(on('2027-02-14'), 'valentines')
  assert.equal(on('2027-02-15'), 'riel')
})

test("Chile's Independence Day: only September 18 and 19, ahead of summer", () => {
  assert.equal(on('2026-09-14'), 'summer')
  assert.equal(on('2026-09-17'), 'summer')
  assert.equal(on('2026-09-18'), 'chile')
  assert.equal(on('2026-09-19'), 'chile')
  assert.equal(on('2026-09-21'), 'oktoberfest', 'Oktoberfest takes over the end of summer')
})

test('Chinese New Year: three days either side of the lunar new year, and Valentine\'s Day itself still wins', () => {
  assert.equal(outfitFor(new Date(2026, 1, 14)), 'valentines')
  assert.equal(outfitFor(new Date(2026, 1, 14, 12)), 'valentines')
  assert.equal(outfitFor(new Date(2026, 1, 17)), 'chinese')
  assert.equal(outfitFor(new Date(2026, 1, 20)), 'chinese')
  assert.notEqual(outfitFor(new Date(2026, 1, 21)), 'chinese')
  assert.equal(outfitFor(new Date(2028, 0, 26)), 'chinese')
  assert.equal(outfitFor(new Date(2028, 0, 22)), null)
})

test('time of day: stars and moon at night, the sun rising in the morning, setting in the evening, and the daytime sun steps aside', () => {
  assert.deepEqual([0, 4, 5, 9, 10, 12, 17, 18, 20, 21, 23].map(timeOfDay), ['night', 'night', 'sunrise', 'sunrise', null, null, null, 'sunset', 'sunset', 'night', 'night'])
  assert.deepEqual(scenesWithTime(['summer'], 22), ['night', 'clouds'])
  assert.deepEqual(scenesWithTime(['sun', 'clouds'], 7), ['sunrise', 'clouds'])
  assert.deepEqual(scenesWithTime(['leaves'], 19), ['sunset', 'leaves'])
  assert.deepEqual(scenesWithTime(['leaves'], 13), ['leaves'])
})

test('Fourth of July is July 4 only, and Canada Day stays July 1', () => {
  assert.equal(on('2026-07-04'), 'usa')
  assert.equal(on('2026-07-01'), 'canada')
  assert.notEqual(on('2026-07-03'), 'usa')
  assert.notEqual(on('2026-07-05'), 'usa')
})

test('Cinco de Mayo is May 5 and May the Fourth is May 4, each on its day only', () => {
  assert.equal(on('2026-05-04'), 'maythe4th')
  assert.equal(on('2026-05-05'), 'cinco')
  assert.notEqual(on('2026-05-03'), 'maythe4th')
  assert.notEqual(on('2026-05-06'), 'cinco')
})

test('your birthday shows on the day you set, even inside summer, and not at all until you set it', () => {
  assert.equal(on('2026-08-08'), 'birthday')
  assert.equal(on('2026-08-07'), 'summer')
  assert.equal(on('2026-08-09'), 'summer')
  assert.equal(on('2026-08-08', { regions: [] }), 'summer')
})

test('Earth Day is April 22 only, even when it lands in Easter week', () => {
  assert.equal(on('2026-04-22'), 'earth')
  assert.notEqual(on('2026-04-21'), 'earth')
  assert.notEqual(on('2026-04-23'), 'earth')
  assert.equal(on('2038-04-22'), 'earth')
})

test("Mother's Day is the 2nd Sunday of May and Father's Day the 3rd Sunday of June, each on that day only", () => {
  assert.equal(on('2026-05-10'), 'mothersday')
  assert.equal(on('2027-05-09'), 'mothersday')
  assert.notEqual(on('2026-05-17'), 'mothersday')
  assert.equal(on('2026-06-21'), 'fathersday')
  assert.equal(on('2027-06-20'), 'fathersday')
  assert.notEqual(on('2026-06-14'), 'fathersday')
})

test('Thanksgiving (Friday to the 2nd Monday of October), Pi Day, Groundhog Day and New Year', () => {
  assert.equal(on('2026-10-09'), 'thanksgiving')
  assert.equal(on('2026-10-12'), 'thanksgiving')
  assert.notEqual(on('2026-10-13'), 'thanksgiving')
  assert.equal(on('2026-03-14'), 'piday')
  assert.equal(on('2026-03-13'), 'friday13')
  assert.equal(on('2026-02-02'), 'groundhog')
  assert.equal(on('2026-12-31'), 'newyear')
  assert.equal(on('2027-01-01'), 'newyearsday')
  assert.equal(on('2026-12-30'), null)
})

test('Voyageur, Terry Fox, April Fools, Movember, Day of the Dead, Orange Shirt Day and Boxing Day', () => {
  assert.equal(on('2026-02-22'), 'voyageur')
  assert.equal(on('2027-02-16'), 'voyageur')
  assert.equal(on('2027-02-21'), 'voyageur')
  assert.notEqual(on('2027-02-22'), 'voyageur')
  assert.equal(on('2026-09-20'), 'terryfox')
  assert.equal(on('2028-09-17'), 'terryfox')
  assert.equal(on('2027-09-19'), 'chile')
  assert.equal(on('2026-04-01'), 'aprilfools')
  assert.equal(on('2026-11-01'), 'movember')
  assert.equal(on('2026-11-02'), 'dayofdead')
  assert.equal(on('2026-09-30'), 'orangeshirt')
  assert.equal(on('2026-12-26'), 'boxingday')
})

test('US Thanksgiving runs Thursday to Sunday of the 4th week of November, and Remembrance Day keeps November 11', () => {
  assert.equal(on('2026-11-26'), 'usthanksgiving')
  assert.equal(on('2026-11-29'), 'usthanksgiving')
  assert.notEqual(on('2026-11-30'), 'usthanksgiving')
  assert.equal(on('2027-11-25'), 'usthanksgiving')
  assert.equal(on('2026-11-11'), 'remembrance')
})

test('the anniversary and partner birthdays show on the days you set, every year, and win over holidays', () => {
  assert.equal(on('2026-04-09'), 'anniversary')
  assert.equal(on('2027-04-09'), 'anniversary')
  assert.notEqual(on('2026-04-08'), 'anniversary')
  assert.equal(on('2026-10-07'), 'herbirthday')
  assert.equal(on('2027-10-07'), 'herbirthday')
  assert.equal(on('2026-01-20'), 'hisbirthday')
  assert.notEqual(on('2026-01-21'), 'hisbirthday')
  // A personal day set on a holiday wins
  assert.equal(on('2026-07-01', { regions: ['CA'], days: { anniversary: '07-01' } }), 'anniversary')
})

test('holidays follow your regions: a country gets its days, a province adds its own, and worldwide days always show', () => {
  // With no regions, only worldwide days
  assert.equal(on('2027-07-01', { regions: [] }), 'summer')
  assert.equal(on('2026-12-25', { regions: [] }), 'christmas')
  assert.equal(on('2026-10-31', { regions: [] }), 'halloween')
  // Canada gets Canada Day, but Louis Riel Day only comes with Manitoba
  assert.equal(on('2026-07-01', { regions: ['CA'] }), 'canada')
  assert.notEqual(on('2026-02-16', { regions: ['CA'] }), 'riel')
  assert.equal(on('2026-02-16', { regions: ['CA-MB'] }), 'riel')
  assert.equal(on('2026-07-04', { regions: ['US'] }), 'usa')
  assert.equal(on('2027-07-04', { regions: ['CA'] }), 'summer')
  assert.ok(REGION_CODES.includes('CA-MB') && REGION_CODES.includes('US'))
})

test("new worldwide days: Programmers' Day, Diwali, Hanukkah's eight nights, Eid al-Fitr, and Earth Hour only during its hour", () => {
  assert.equal(on('2026-09-13'), 'programmers')
  assert.equal(on('2028-09-12'), 'programmers')
  assert.equal(on('2026-11-08', { regions: [] }), 'diwali')
  assert.equal(on('2026-11-09', { regions: [] }), 'diwali')
  assert.equal(on('2026-12-04', { regions: [] }), 'hanukkah')
  assert.equal(on('2026-12-11', { regions: [] }), 'hanukkah')
  assert.notEqual(on('2026-12-12', { regions: [] }), 'hanukkah')
  assert.equal(hanukkahNight(new Date(2026, 11, 4)), 1)
  assert.equal(hanukkahNight(new Date(2026, 11, 11)), 8)
  assert.equal(hanukkahNight(new Date(2027, 0, 1)), 0)
  assert.equal(hanukkahNight(new Date(2027, 11, 31)), 8)
  assert.equal(hanukkahNight(new Date(2028, 0, 1)), 0)
  assert.equal(on('2027-03-09', { regions: [] }), 'eid')
  assert.equal(on('2027-03-10', { regions: [] }), 'eid')
  assert.notEqual(on('2027-03-11', { regions: [] }), 'eid')
  assert.equal(outfitFor(new Date(2026, 2, 28, 20, 45), {}), 'earthhour')
  assert.notEqual(outfitFor(new Date(2026, 2, 28, 19, 0), {}), 'earthhour')
  assert.notEqual(outfitFor(new Date(2026, 2, 28, 21, 40), {}), 'earthhour')
})

test('below the equator the seasons flip, and summer is December to March', () => {
  assert.equal(seasonFor(new Date(2026, 6, 15), true), 'winter')
  assert.equal(seasonFor(new Date(2026, 0, 15), true), 'summer')
  assert.equal(on('2026-01-15', { regions: [], south: true }), 'summer')
  assert.notEqual(on('2026-07-15', { regions: [], south: true }), 'summer')
})

test('Friday the 13th, in any month, wins over everything', () => {
  assert.equal(on('2026-02-13'), 'friday13')
  assert.equal(on('2026-03-13'), 'friday13')
  assert.equal(on('2026-11-13'), 'friday13')
  assert.equal(on('2027-08-13'), 'friday13')
  assert.notEqual(on('2026-04-13'), 'friday13')
  assert.notEqual(on('2026-10-13'), 'friday13')
})

test('World Cup, Olympics, Super Bowl, Grey Cup and GTA VI days', () => {
  assert.equal(on('2026-06-16'), 'worldcup')
  assert.equal(on('2030-06-18'), 'worldcup')
  assert.equal(on('2026-07-19'), 'worldcup')
  assert.notEqual(on('2026-07-20'), 'worldcup')
  assert.equal(on('2028-07-20'), 'olympics')
  assert.equal(on('2030-02-10'), 'olympics')
  // Eid al-Fitr wins over the Games on its two days
  assert.equal(on('2030-02-05'), 'eid')
  assert.equal(on('2026-02-08'), 'superbowl')
  assert.equal(on('2027-02-14'), 'valentines')
  assert.equal(on('2026-11-15'), 'greycup')
  assert.equal(on('2026-11-19'), 'gta6')
  assert.notEqual(on('2027-11-19'), 'gta6')
})

test('night sky events: blood moons, the Perseids and the northern lights, only after dark', () => {
  const at = (iso, hour) => new Date(`${iso}T${String(hour).padStart(2, '0')}:00:00`)
  const clear = { sky: 'sunny' }
  assert.equal(skyEvents(at('2026-03-02', 22)).bloodMoon, true)
  assert.equal(skyEvents(at('2026-03-03', 3)).bloodMoon, true)
  assert.equal(skyEvents(at('2026-03-03', 22)).bloodMoon, false)
  assert.equal(skyEvents(at('2026-03-02', 14)).bloodMoon, false)
  assert.equal(skyEvents(at('2026-08-12', 23)).meteors, true)
  assert.equal(skyEvents(at('2026-08-14', 23)).meteors, false)
  // The northern lights need a real storm (Kp 5 or more) and a clear sky, at night
  assert.equal(skyEvents(at('2026-12-10', 23), { weather: clear, kp: 6 }).aurora, true)
  assert.equal(skyEvents(at('2026-12-10', 23), { weather: clear, kp: 5 }).aurora, true)
  assert.equal(skyEvents(at('2026-12-10', 23), { weather: clear, kp: 4.67 }).aurora, false)
  assert.equal(skyEvents(at('2026-12-10', 23), { weather: clear, kp: 3 }).aurora, false)
  assert.equal(skyEvents(at('2026-12-10', 23), { weather: clear, kp: null }).aurora, false)
  assert.equal(skyEvents(at('2026-12-10', 23), { weather: clear }).aurora, false)
  assert.equal(skyEvents(at('2026-12-10', 23), { weather: { sky: 'cloudy' }, kp: 6 }).aurora, false)
  assert.equal(skyEvents(at('2026-12-10', 23), { weather: null, kp: 6 }).aurora, false)
  assert.equal(skyEvents(at('2026-12-10', 13), { weather: clear, kp: 6 }).aurora, false)
  assert.equal(skyEvents(at('2026-07-10', 23), { weather: clear, kp: 7 }).aurora, true)
  assert.equal(skyEvents(at('2026-07-10', 23), { force: true }).aurora, true)
  assert.deepEqual(scenesWithSky(['night', 'bats'], { bloodMoon: true, meteors: true, aurora: true }), ['aurora', 'bloodmoon', 'bats', 'meteors'])
  assert.deepEqual(scenesWithSky(['leaves'], { bloodMoon: true, meteors: true, aurora: true }), ['leaves'])
})

test('the year on the World Cup jersey and the Super Bowl number follow the date', () => {
  const at = (y, m, d) => new Date(y, m, d, 12)
  assert.equal(worldCupYear(at(2026, 5, 20)), 2026)
  assert.equal(worldCupYear(at(2026, 6, 25)), 2026)
  assert.equal(worldCupYear(at(2026, 9, 4)), 2030)
  assert.equal(worldCupYear(at(2027, 0, 5)), 2030)
  assert.equal(worldCupYear(at(2030, 5, 20)), 2030)
  assert.equal(worldCupYear(at(2030, 8, 1)), 2034)
  assert.equal(worldCupYear(at(2034, 5, 20)), 2034)
  assert.equal(superBowlNumber(at(2026, 0, 10)), 60)
  assert.equal(superBowlNumber(at(2026, 9, 4)), 61)
  assert.equal(superBowlNumber(at(2027, 1, 14)), 61)
  assert.equal(superBowlNumber(at(2027, 1, 15)), 62)
})

test('Black Friday and Cyber Monday: the day after and the Monday after US Thanksgiving', () => {
  assert.equal(on('2026-11-26'), 'usthanksgiving')
  assert.equal(on('2026-11-27'), 'blackfriday')
  assert.equal(on('2026-11-28'), 'usthanksgiving')
  assert.equal(on('2026-11-30'), 'cybermonday')
  assert.equal(on('2027-11-26'), 'blackfriday')
  assert.equal(on('2027-11-29'), 'cybermonday')
})

test('the sky: supermoons, the Harvest Moon, meteor showers and total solar eclipses', () => {
  const at = (iso, hour) => new Date(`${iso}T${String(hour).padStart(2, '0')}:00:00`)
  // Harvest Moon 2026 is the full moon of September 26; the nights around it
  assert.equal(skyEvents(at('2026-09-25', 23)).bigMoon, 'harvest')
  assert.equal(skyEvents(at('2026-09-26', 23)).bigMoon, 'harvest')
  assert.equal(skyEvents(at('2026-09-27', 3)).bigMoon, 'harvest')
  assert.equal(skyEvents(at('2026-09-20', 23)).bigMoon, null)
  // The supermoons of November and December 2026
  assert.equal(skyEvents(at('2026-11-23', 22)).bigMoon, 'super')
  assert.equal(skyEvents(at('2026-12-23', 22)).bigMoon, 'super')
  assert.equal(skyEvents(at('2026-06-29', 22)).bigMoon, null, 'a far full moon is no supermoon')
  assert.equal(skyEvents(at('2026-12-23', 13)).bigMoon, null, 'not by day')
  // Meteor showers: Perseids, Leonids and Geminids
  assert.equal(skyEvents(at('2026-08-12', 23)).meteors, true)
  assert.equal(skyEvents(at('2026-11-17', 23)).meteors, true)
  assert.equal(skyEvents(at('2026-12-13', 23)).meteors, true)
  assert.equal(skyEvents(at('2026-12-16', 23)).meteors, false)
  // Total solar eclipses, by day
  assert.equal(skyEvents(at('2026-08-12', 13)).eclipse, true)
  assert.equal(skyEvents(at('2026-08-12', 23)).eclipse, false)
  assert.equal(skyEvents(at('2026-08-13', 13)).eclipse, false)
  assert.deepEqual(scenesWithSky(['summer'], { eclipse: true }), ['clouds', 'eclipse'])
  assert.deepEqual(scenesWithSky(['night'], { bigMoon: 'harvest', meteors: false, aurora: false }), ['harvestmoon'])
  assert.deepEqual(scenesWithSky(['night'], { bloodMoon: true, bigMoon: 'harvest' }), ['bloodmoon'], 'a blood moon wins')
})

test('the moon shows its real phase: new, first quarter, full and last quarter on known dates', async () => {
  const { moonPhase } = await import('../hooks/scenery.mjs')
  const near = (value, target) => Math.min(Math.abs(value - target), 1 - Math.abs(value - target)) < 0.04
  assert.ok(near(moonPhase(new Date(Date.UTC(2026, 9, 10, 16))), 0), 'new moon, Oct 10 2026')
  assert.ok(near(moonPhase(new Date(Date.UTC(2026, 9, 18, 16))), 0.25), 'first quarter, Oct 18 2026')
  assert.ok(near(moonPhase(new Date(Date.UTC(2026, 9, 26, 4))), 0.5), 'full moon, Oct 26 2026')
  assert.ok(near(moonPhase(new Date(Date.UTC(2026, 10, 1, 20))), 0.75), 'last quarter, Nov 1 2026')
})

test('everyday life: birds by day, butterflies on spring and summer days, fireflies on summer nights, and nobody out in a storm', async () => {
  const { scenesWithLife } = await import('../hooks/seasons.mjs')
  assert.deepEqual(scenesWithLife(['leaves'], { hour: 13, season: 'fall' }), ['leaves', 'birds'])
  assert.deepEqual(scenesWithLife(['flowers'], { hour: 13, season: 'spring' }), ['flowers', 'birds', 'butterflies'])
  assert.deepEqual(scenesWithLife(['night'], { hour: 23, season: 'summer' }), ['night', 'fireflies'])
  assert.deepEqual(scenesWithLife(['night'], { hour: 23, season: 'winter' }), ['night'])
  assert.deepEqual(scenesWithLife(['raincloud', 'rain'], { hour: 13, season: 'summer' }), ['raincloud', 'rain'])
})

test('a UFO or a comet shows on about one night in forty each, and never by day', async () => {
  const { skyEvents } = await import('../hooks/seasons.mjs')
  let ufos = 0
  let comets = 0
  for (let d = 0; d < 400; d++) {
    const night = new Date(2027, 0, 1 + d, 23)
    const sky = skyEvents(night)
    if (sky.ufo) ufos++
    if (sky.comet) comets++
    assert.ok(!(sky.ufo && sky.comet))
    assert.ok(!skyEvents(new Date(2027, 0, 1 + d, 13)).ufo)
  }
  assert.ok(ufos >= 3 && ufos <= 20, `${ufos} UFO nights`)
  assert.ok(comets >= 3 && comets <= 20, `${comets} comet nights`)
})

test('new days: Holi, Nowruz, Towel Day, Juneteenth, Mexican Independence Day, Talk Like a Pirate Day and Oktoberfest', async () => {
  const { outfitFor } = await import('../hooks/seasons.mjs')
  const at = (iso, regions = ['CA-MB', 'US', 'MX', 'CL']) => { const [y, m, d] = iso.split('-').map(Number); return outfitFor(new Date(y, m - 1, d, 12), { regions }) }
  assert.equal(at('2026-03-04'), 'holi')
  assert.equal(at('2027-03-21'), 'nowruz')
  assert.equal(at('2026-05-25'), 'towelday')
  assert.equal(at('2026-06-19'), 'juneteenth')
  assert.notEqual(at('2026-06-19', ['GB']), 'juneteenth')
  assert.equal(at('2026-09-15'), 'mexico')
  assert.equal(at('2026-09-16'), 'mexico')
  assert.notEqual(at('2026-09-16', ['GB']), 'mexico')
  assert.equal(at('2026-09-19', ['GB']), 'pirateday')
  assert.equal(at('2026-09-19'), 'chile', "Chile's day wins for people who follow Chile")
  // Oktoberfest: the Saturday after September 15 to the first Sunday of October, or October 3 if that is later
  assert.equal(at('2026-09-21', ['GB']), 'oktoberfest')
  assert.equal(at('2026-10-04', ['GB']), 'oktoberfest')
  assert.equal(at('2026-10-05', ['GB']), null)
  assert.equal(at('2028-10-03', ['GB']), 'oktoberfest')
  assert.equal(at('2018-09-21', ['GB']), 'summer', 'in 2018 it began on Sep 22, the Saturday after a Saturday the 15th')
  assert.equal(at('2018-09-22', ['GB']), 'oktoberfest')
})

test("a heat wave's blazing sun sets with the ordinary one: none at night, sunrise or sunset, still there by day", async () => {
  const { scenesWithTime } = await import('../hooks/seasons.mjs')
  const heat = ['scorcher', 'fire']
  for (const hour of [23, 3, 7, 19]) assert.ok(!scenesWithTime(heat, hour).includes('scorcher'), `hour ${hour}`)
  assert.ok(scenesWithTime(heat, 23).includes('fire'), 'the flames stay; only the sun goes')
  assert.deepEqual(scenesWithTime(heat, 13), heat)
})
