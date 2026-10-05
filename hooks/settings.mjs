// Reading what people type into /krab birthday, /krab holidays and friends. Pure code, so plain node can test it.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

const pad = (n) => String(n).padStart(2, '0')

// A month and day in any common spelling ("Jan 15", "15 jan", "1/15", "01-15", "jan 15th") as 'MM-DD', or null if it is not a real date
export function parseMonthDay(text) {
  const t = String(text ?? '').trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/, '$1').replace(/,/g, ' ')
  let month = null
  let day = null
  const numeric = /^(\d{1,2})\s*[-/.]\s*(\d{1,2})$/.exec(t)
  const named = /^([a-z]+)\.?\s+(\d{1,2})$/.exec(t) ?? /^(\d{1,2})\s+([a-z]+)\.?$/.exec(t)
  if (numeric) {
    month = Number(numeric[1])
    day = Number(numeric[2])
  } else if (named) {
    const [word, number] = /^\d/.test(named[1]) ? [named[2], named[1]] : [named[1], named[2]]
    const index = MONTHS.indexOf(word.slice(0, 3))
    if (index === -1 || (word.length > 3 && !word.startsWith(MONTHS[index]))) return null
    month = index + 1
    day = Number(number)
  } else {
    return null
  }
  if (month < 1 || month > 12 || day < 1 || day > DAYS_IN[month - 1]) return null
  return `${pad(month)}-${pad(day)}`
}

// 'MM-DD' back into words for messages: "Jan 15"
export function monthDayWords(value) {
  const match = /^(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return 'not set'
  const name = MONTHS[Number(match[1]) - 1]
  return `${name[0].toUpperCase()}${name.slice(1)} ${Number(match[2])}`
}

// Region codes: a country (CA, US, MX, CL, GB, AU) or a country and province or state (CA-MB, US-TX). Returns { regions, bad }
export function parseRegions(text) {
  const words = String(text ?? '').toUpperCase().split(/[\s,]+/).filter(Boolean)
  const regions = []
  const bad = []
  for (const word of words) {
    if (/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/.test(word)) {
      if (!regions.includes(word)) regions.push(word)
    } else bad.push(word)
  }
  return { regions, bad }
}

// "51.5, -0.1" typed straight in, instead of a place name: { latitude, longitude } or null
export function parseCoordinates(text) {
  const match = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(String(text ?? ''))
  if (!match) return null
  const latitude = Number(match[1])
  const longitude = Number(match[2])
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return { latitude: +latitude.toFixed(2), longitude: +longitude.toFixed(2) }
}

// The personal days and the commands that set them
export const DAY_COMMANDS = { birthday: 'birthday', 'gf-birthday': 'gfBirthday', 'bf-birthday': 'bfBirthday', anniversary: 'anniversary' }
export const DAY_NAMES = { birthday: 'your birthday', gfBirthday: "your girlfriend's birthday", bfBirthday: "your boyfriend's birthday", anniversary: 'your anniversary' }
