// Run with: node --test tests/weather.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TRIAL, parseAir, parseKp, parseWeather, scenesWithWeather, skyFor, weatherOutfit, windLevel } from '../hooks/weather.mjs'

test('weather codes become what the sky looks like', () => {
  assert.equal(skyFor(0), 'sunny')
  assert.equal(skyFor(1), 'sunny')
  assert.equal(skyFor(2), 'cloudy')
  assert.equal(skyFor(3), 'cloudy')
  assert.equal(skyFor(45), 'fog')
  assert.equal(skyFor(48), 'fog')
  assert.equal(skyFor(53), 'rain')
  assert.equal(skyFor(63), 'rain')
  assert.equal(skyFor(81), 'rain')
  assert.equal(skyFor(73), 'snow')
  assert.equal(skyFor(86), 'snow')
  assert.equal(skyFor(95), 'storm')
  // Hail, freezing rain and heavy rain each get their own look
  assert.equal(skyFor(96), 'hail')
  assert.equal(skyFor(99), 'hail')
  assert.equal(skyFor(66), 'freezing')
  assert.equal(skyFor(56), 'freezing')
  assert.equal(skyFor(65), 'downpour')
  assert.equal(skyFor(82), 'downpour')
})

test('the new weather gear: hail, an ice storm, a downpour, wildfire smoke and a strong sun', () => {
  assert.equal(weatherOutfit(TRIAL.hail), 'hail')
  assert.equal(weatherOutfit(TRIAL.icestorm), 'icestorm')
  assert.equal(weatherOutfit(TRIAL.downpour), 'downpour')
  assert.equal(weatherOutfit(TRIAL.smoke), 'smoke')
  assert.equal(weatherOutfit(TRIAL.uv), 'sunscreen')
  // A strong sun only counts by day, and ordinary air is not smoke
  assert.equal(weatherOutfit({ ...TRIAL.uv, isDay: false }), null)
  assert.equal(weatherOutfit({ ...TRIAL.smoke, aqi: 60 }), null)
  assert.ok(scenesWithWeather([], TRIAL.smoke).includes('smoke'))
  assert.equal(parseAir(JSON.stringify({ current: { us_aqi: 163 } })), 163)
  assert.equal(parseAir('nonsense'), null)
})

test('wind: breezy from 25 km/h, strong from 45', () => {
  assert.equal(windLevel(10), 0)
  assert.equal(windLevel(24), 0)
  assert.equal(windLevel(25), 1)
  assert.equal(windLevel(44), 1)
  assert.equal(windLevel(45), 2)
  assert.equal(windLevel(10, 70), 2)
  assert.equal(windLevel(10, 50), 1)
})

test('Open-Meteo answers are read, and nonsense is ignored', () => {
  const text = JSON.stringify({ current: { weather_code: 61, wind_speed_10m: 31.2, wind_gusts_10m: 48, is_day: 1 } })
  assert.deepEqual(parseWeather(text), { sky: 'rain', wind: 1, isDay: true, temp: null, uv: null })
  assert.equal(parseWeather(JSON.stringify({ current: { weather_code: 0, wind_speed_10m: 4, wind_gusts_10m: 9, is_day: 1, apparent_temperature: -33.4 } })).temp, -33.4)
  assert.deepEqual(parseWeather(JSON.stringify({ current: { weather_code: 0, wind_speed_10m: 4, wind_gusts_10m: 9, is_day: 0 } })), { sky: 'sunny', wind: 0, isDay: false, temp: null, uv: null })
  assert.equal(parseWeather('not json'), null)
  assert.equal(parseWeather('{}'), null)
})

test('the sky adds its scenes to the day, in any season', () => {
  assert.deepEqual(scenesWithWeather(['leaves'], null), ['leaves'])
  assert.deepEqual(scenesWithWeather(['leaves'], TRIAL.sunny), ['leaves', 'sun'])
  assert.deepEqual(scenesWithWeather(['snow'], TRIAL.sunny), ['snow', 'sun'])
  assert.deepEqual(scenesWithWeather(['flowers'], TRIAL.cloudy), ['flowers', 'clouds'])
  assert.deepEqual(scenesWithWeather(['flowers'], TRIAL.rain), ['flowers', 'raincloud', 'rain'])
  assert.deepEqual(scenesWithWeather(['leaves'], TRIAL.storm), ['leaves', 'storm'])
  assert.deepEqual(scenesWithWeather(['flowers'], TRIAL.snow), ['flowers', 'clouds', 'snow'])
  // The made-up summer sky gives way to the real one, and no sun at night
  assert.deepEqual(scenesWithWeather(['summer'], TRIAL.cloudy), ['clouds'])
  assert.deepEqual(scenesWithWeather(['summer'], { sky: 'sunny', wind: 0, isDay: false }), [])
})

test("NOAA's Kp index is read from the newest row, in either file format, and nonsense gives nothing", () => {
  assert.equal(parseKp(JSON.stringify([{ time_tag: 'a', Kp: 4 }, { time_tag: 'b', Kp: 3.33 }])), 3.33)
  assert.equal(parseKp(JSON.stringify([['time_tag', 'Kp', 'a_running'], ['a', '2.00', '7'], ['b', '5.67', '40']])), 5.67)
  assert.equal(parseKp('not json'), null)
  assert.equal(parseKp('[]'), null)
  assert.equal(parseKp(JSON.stringify([{ Kp: 12 }])), null)
  assert.equal(parseKp(JSON.stringify([{ Kp: 'high' }])), null)
})

test('the weather can call for gear: a parka in extreme cold, light clothes in a heat wave, a scarf in a blizzard, nothing on an ordinary day', () => {
  assert.equal(weatherOutfit({ sky: 'sunny', wind: 0, isDay: true, temp: -30 }), 'parka')
  assert.equal(weatherOutfit({ sky: 'sunny', wind: 0, isDay: true, temp: -29.9 }), null)
  assert.equal(weatherOutfit({ sky: 'sunny', wind: 0, isDay: true, temp: 30 }), 'heatwave')
  assert.equal(weatherOutfit({ sky: 'sunny', wind: 0, isDay: false, temp: 33 }), null, 'a hot night is not a heat wave look')
  assert.equal(weatherOutfit({ sky: 'snow', wind: 2, isDay: true, temp: -40 }), 'blizzard', 'a blizzard beats the cold')
  assert.equal(weatherOutfit({ sky: 'snow', wind: 1, isDay: true, temp: -5 }), null)
  assert.equal(weatherOutfit({ sky: 'sunny', wind: 0, isDay: true, temp: null }), null)
  assert.equal(weatherOutfit(null), null)
  assert.deepEqual(scenesWithWeather(['leaves'], TRIAL.fog), ['leaves', 'fog'])
  assert.deepEqual(scenesWithWeather(['snow'], TRIAL.blizzard), ['snow', 'blizzard'])
})
