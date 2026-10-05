// Live weather for the strip, from Open-Meteo (free, no key): what the sky is doing and how windy it is.
// Pure code (no network here: register.mjs fetches and hands the text in), so plain node can test it.

// The weather for the place the person set with /krab location. Only these coordinates go in the request.
export function weatherUrl({ latitude, longitude }) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    '&current=weather_code,wind_speed_10m,wind_gusts_10m,is_day,apparent_temperature,uv_index&wind_speed_unit=kmh&timezone=auto'
}

// Looking up a place by name (Open-Meteo's free geocoding, no key): the name typed after /krab location is all that is sent
export function geocodeUrl(name) {
  return `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`
}

// Read the geocoding answer: { name, latitude, longitude, country } or null
export function parsePlace(text) {
  try {
    const hit = JSON.parse(text)?.results?.[0]
    if (!hit || !Number.isFinite(hit.latitude) || !Number.isFinite(hit.longitude)) return null
    return { name: [hit.name, hit.admin1, hit.country_code].filter(Boolean).join(', '), latitude: +hit.latitude.toFixed(2), longitude: +hit.longitude.toFixed(2), country: hit.country_code ?? null }
  } catch {
    return null
  }
}

// NOAA's planetary K index: how disturbed the earth's magnetic field is right now, which is what sets off the northern lights.
// 0 is quiet, 9 is a major storm. Free, no key.
export const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'

// Read the newest Kp from NOAA's answer (a list of readings, newest last). Returns a number, or null if it does not make sense.
export function parseKp(text) {
  try {
    const rows = JSON.parse(text)
    if (!Array.isArray(rows) || rows.length === 0) return null
    const last = rows.at(-1)
    // Newer files are a list of objects; older ones are a list of lists with a header row
    const value = Array.isArray(last) ? Number(last[1]) : Number(last?.Kp ?? last?.kp_index)
    return Number.isFinite(value) && value >= 0 && value <= 9 ? value : null
  } catch {
    return null
  }
}

// Wind from this speed (km/h) is breezy (level 1), from this much strong (level 2)
export const BREEZY_KMH = 25
export const STRONG_KMH = 45

// Open-Meteo's weather codes, grouped by what they look like
export function skyFor(code) {
  if (code === 0 || code === 1) return 'sunny'
  if (code === 45 || code === 48) return 'fog'
  if (code === 2 || code === 3) return 'cloudy'
  // Freezing drizzle and freezing rain: an ice storm
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'freezing'
  // Heavy rain and violent showers: a downpour
  if (code === 65 || code === 82) return 'downpour'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  // A thunderstorm with hail
  if (code === 96 || code === 99) return 'hail'
  if (code >= 95 && code <= 99) return 'storm'
  return 'cloudy'
}

export function windLevel(speedKmh, gustKmh = 0) {
  if (speedKmh >= STRONG_KMH || gustKmh >= 65) return 2
  if (speedKmh >= BREEZY_KMH || gustKmh >= 45) return 1
  return 0
}

// Read Open-Meteo's answer (the response text). Returns { sky, wind, isDay } or null if it does not make sense.
export function parseWeather(text) {
  try {
    const current = JSON.parse(text)?.current
    if (!current || typeof current.weather_code !== 'number') return null
    return {
      sky: skyFor(current.weather_code),
      wind: windLevel(Number(current.wind_speed_10m) || 0, Number(current.wind_gusts_10m) || 0),
      isDay: current.is_day !== 0,
      // How cold or hot it feels, in degrees (wind chill and humidity included); null if the reading has none
      temp: Number.isFinite(Number(current.apparent_temperature)) && current.apparent_temperature !== null ? Number(current.apparent_temperature) : null,
      // How strong the sun is (the UV index, 0 to 11+); null if the reading has none
      uv: Number.isFinite(Number(current.uv_index)) && current.uv_index !== null ? Number(current.uv_index) : null,
    }
  } catch {
    return null
  }
}

// The air quality where the person is (Open-Meteo's free air-quality service, no key): only the coordinates are sent
export function airUrl({ latitude, longitude }) {
  return `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi&timezone=auto`
}

// Read the air-quality answer: the US air quality index (0 good, 100 moderate, 150+ unhealthy), or null
export function parseAir(text) {
  try {
    const value = Number(JSON.parse(text)?.current?.us_aqi)
    return Number.isFinite(value) && value >= 0 ? value : null
  } catch {
    return null
  }
}

// From this air quality index the air counts as smoky (unhealthy for sensitive groups and worse: wildfire smoke, mostly)
export const SMOKY_AQI = 101
// From this UV index the sun is strong enough for sunscreen (very high)
export const HIGH_UV = 8

// Named conditions to try it out with /krab weather <name>
export const TRIAL = {
  sunny: { sky: 'sunny', wind: 0, isDay: true },
  cloudy: { sky: 'cloudy', wind: 0, isDay: true },
  rain: { sky: 'rain', wind: 0, isDay: true },
  storm: { sky: 'storm', wind: 1, isDay: true },
  snow: { sky: 'snow', wind: 0, isDay: true },
  windy: { sky: 'cloudy', wind: 2, isDay: true },
  rainbow: { sky: 'sunny', wind: 0, isDay: true, rainbow: true },
  cold: { sky: 'sunny', wind: 0, isDay: true, temp: -34 },
  heat: { sky: 'sunny', wind: 0, isDay: true, temp: 34 },
  blizzard: { sky: 'snow', wind: 2, isDay: true, temp: -12 },
  fog: { sky: 'fog', wind: 0, isDay: true, temp: 2 },
  hail: { sky: 'hail', wind: 1, isDay: true, temp: 12 },
  icestorm: { sky: 'freezing', wind: 0, isDay: true, temp: -3 },
  downpour: { sky: 'downpour', wind: 1, isDay: true, temp: 14 },
  smoke: { sky: 'sunny', wind: 0, isDay: true, temp: 24, aqi: 160 },
  uv: { sky: 'sunny', wind: 0, isDay: true, temp: 27, uv: 9 },
}

// How hard it has to be before he dresses for it (feels-like temperature, in degrees)
export const EXTREME_COLD = -30
export const HEAT_WAVE = 30

// The outfit the weather calls for: a blizzard, extreme cold, a heat wave, hail, an ice storm, a downpour, wildfire smoke or a strong sun.
// Null on an ordinary day.
export function weatherOutfit(weather) {
  if (!weather) return null
  if (weather.sky === 'snow' && weather.wind >= 2) return 'blizzard'
  if (typeof weather.temp === 'number' && weather.temp <= EXTREME_COLD) return 'parka'
  if (typeof weather.temp === 'number' && weather.temp >= HEAT_WAVE && weather.isDay) return 'heatwave'
  if (weather.sky === 'hail') return 'hail'
  if (weather.sky === 'freezing') return 'icestorm'
  if (weather.sky === 'downpour') return 'downpour'
  if (typeof weather.aqi === 'number' && weather.aqi >= SMOKY_AQI) return 'smoke'
  if (weather.sky === 'sunny' && weather.isDay && typeof weather.uv === 'number' && weather.uv >= HIGH_UV) return 'sunscreen'
  return null
}

// What the sky adds to the day's scenes. The summer sky (sun and clouds) gives way to the real one when the weather is known.
// Sun only shows by day; no matter the season.
const SKY_SCENES = {
  sunny: (isDay) => (isDay ? ['sun'] : []),
  cloudy: () => ['clouds'],
  rain: () => ['raincloud', 'rain'],
  storm: () => ['storm'],
  hail: () => ['storm', 'hail'],
  freezing: () => ['raincloud', 'freezingrain'],
  downpour: () => ['storm', 'puddles'],
  snow: () => ['clouds', 'snow'],
  fog: () => ['fog'],
}

export function scenesWithWeather(base, weather) {
  // A heat wave brings its own blazing sun, so the ordinary one stays away
  if (base?.includes('scorcher')) return scenesWithWeather(base.filter((id) => id !== 'scorcher'), weather).filter((id) => id !== 'sun').concat('scorcher')
  if (!weather) return base ?? []
  const kept = (base ?? []).filter((id) => id !== 'summer')
  // Snow in a strong wind is a blizzard: it comes sideways
  const sky = weather.sky === 'snow' && weather.wind >= 2 ? ['blizzard'] : SKY_SCENES[weather.sky]?.(weather.isDay) ?? []
  // Wildfire smoke hangs over everything, so it is drawn last, dimming the sun
  const isSmoky = typeof weather.aqi === 'number' && weather.aqi >= SMOKY_AQI
  const added = [...sky, ...(weather.rainbow ? ['rainbow'] : [])]
  const all = [...new Set([...kept, ...added])].filter((id) => id !== 'smoke')
  // In smoke the bright sun gives way to the dim red one the smoke brings, drawn over everything
  return isSmoky || kept.includes('smoke') ? [...all.filter((id) => id !== 'sun'), 'smoke'] : all
}
