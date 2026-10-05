// Seasonal outfits for Clawd, drawn in his own units (body x 11..96, y 0..65; eyes at y 11..22).
// Pure drawing code. head: worn on top of the head and over the eyes. body: on his belly. props: held or floating, inside his picture.
// Every outfit is a few pixel blocks the same way he is made, so it looks drawn by the same hand.

import { digitsSvg } from './pixelfont.mjs'
import { hanukkahNight, superBowlNumber, worldCupYear } from './seasons.mjs'

const r = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
const loop = (inner, type, values, dur, begin = 0) =>
  `<g>${inner}<animateTransform attributeName="transform" type="${type}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="${values}"/></g>`
const pulse = (inner, values, dur, begin = 0) =>
  `<g>${inner}<animate attributeName="opacity" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="${values}"/></g>`

// ---- Halloween: witch hat and a flapping bat ----
const WITCH = '#3B2A5C'
const witchHat = () =>
  r(4, -8, 99, 9, WITCH) + r(22, -22, 63, 15, WITCH) + r(34, -34, 40, 13, WITCH) + r(56, -44, 22, 11, WITCH) + r(22, -15, 63, 6, '#E8833A') + r(50, -16, 9, 8, '#F2D04B') + r(53, -14, 3, 4, WITCH)
const bat = (x, y, begin) =>
  loop(
    r(0, 0, 6, 4, '#1C1626') + loop(r(-9, -3, 8, 4, '#1C1626') + r(6, -3, 8, 4, '#1C1626'), 'scale', '1 1;1 .3;1 1', 0.5) + r(0, -3, 2, 2, '#E8833A'),
    'translate',
    `${x} ${y};${x + 6} ${y - 6};${x} ${y}`,
    2.4,
    begin,
  )

// ---- Christmas: Santa hat, striped scarf, snow ----
const santaHat = () =>
  r(13, -6, 82, 10, '#F7F5F0') + r(21, -22, 66, 17, '#C8372D') + r(31, -32, 46, 11, '#C8372D') + r(66, -30, 22, 9, '#C8372D') + r(80, -34, 14, 14, '#F7F5F0')
const scarf = () =>
  r(11, 48, 85, 10, '#2E7D4F') + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => r(14 + i * 11, 48, 5, 10, '#C8372D')).join('') + r(76, 56, 11, 14, '#2E7D4F') + r(79, 56, 4, 14, '#C8372D')
const snow = () =>
  [[96, -20, 0], [108, -8, 0.8], [4, -12, 1.6], [118, -32, 2.2], [-8, -2, 0.4]]
    .map(([x, y, begin]) => loop(r(0, 0, 4, 4, '#F7F5F0'), 'translate', `${x} ${y};${x - 4} ${y + 40}`, 3, begin))
    .join('')

// ---- Summer: straw hat, sunglasses, a sun ----
const strawHat = () => r(2, -6, 103, 8, '#E8C36A') + r(26, -23, 55, 18, '#E8C36A') + r(26, -10, 55, 5, '#C8372D')
const sunglasses = () =>
  r(15, 8, 24, 17, '#1B1B1B') + r(69, 8, 24, 17, '#1B1B1B') + r(39, 12, 30, 4, '#1B1B1B') + r(19, 11, 6, 4, '#6F7C8C') + r(73, 11, 6, 4, '#6F7C8C')
const sun = () =>
  loop(r(0, 0, 18, 18, '#F2C94C') + [[-8, 7], [26, 7], [7, -8], [7, 26]].map(([x, y]) => r(x, y, 4, 4, '#F2C94C')).join(''), 'rotate', '0 9 9;45 9 9;0 9 9', 4)

// ---- Good Friday: a crown of thorns, long hair and a beard, a plain cream robe with a dark red sash, and a wooden cross ----
const HAIR = '#5A3A22'
const BEARD = '#6B4426'
const VINE = '#A8965A'
const thornCrown = () =>
  // a twisted vine band with long thorns pointing up and out, and a few drops of red
  r(8, -6, 91, 4, VINE) + r(8, -6, 91, 1.2, '#C7B678') + r(8, -3, 91, 1, '#7C6B3A') +
  [10, 22, 34, 46, 58, 70, 82, 93].map((x, i) => r(x, i % 2 ? -11 : -10, 2, 5, VINE) + r(x + (i % 2 ? 3 : -2), i % 2 ? -13 : -12, 2, 2, VINE)).join('') +
  [6, 12].map((y, i) => r(i ? 96 : 5, y, 2, 3, VINE)).join('') +
  [16, 38, 61, 84].map((x) => r(x, -2, 2, 3, '#C0392B')).join('')
const longHair = () =>
  r(22, -7, 63, 5, HAIR) + r(14, -3, 79, 6, HAIR) + r(8, 1, 13, 37, HAIR) + r(86, 1, 13, 37, HAIR) + r(4, 26, 8, 12, HAIR) + r(95, 26, 8, 12, HAIR) +
  r(24, 3, 8, 3, HAIR) + r(75, 3, 8, 3, HAIR) + r(50, -2, 7, 5, HAIR, ' fill-opacity=".0"')
const gentleBeard = () =>
  r(22, 20, 63, 12, BEARD) + r(27, 30, 53, 8, BEARD) + r(36, 36, 35, 6, BEARD) + r(44, 40, 19, 4, BEARD) + r(22, 20, 6, 1.4, '#8A6240') + r(79, 20, 6, 1.4, '#8A6240')
const goodFridayHead = () => longHair() + gentleBeard() + thornCrown()
const simpleRobe = () =>
  r(11, 34, 85, 32, '#F1ECE0') + [20, 34, 66, 80].map((x) => r(x, 36, 1.5, 30, '#D9D2C0')).join('') + r(36, 34, 35, 5, '#D9D2C0') + r(11, 52, 85, 5, '#8E2A2A') + r(11, 52, 85, 1, '#B3433F') + r(60, 57, 4, 9, '#8E2A2A')
const woodenCross = () => r(10, -2, 6, 38, '#7A5230') + r(1, 8, 24, 6, '#7A5230') + r(10, -2, 2, 38, '#9A6B40') + r(1, 8, 24, 1.5, '#9A6B40')

// ---- Pride: a rainbow shirt, a rainbow band over his head, and a Pride flag ----
const PRIDE = ['#E4262F', '#F28A2E', '#F7D13A', '#2FA84F', '#2F6FD0', '#8E4BC4']
const prideShirt = () => PRIDE.map((c, i) => r(11, 34 + i * 5.34, 85, 5.4, c)).join('') + r(11, 34, 85, 2, '#FFFFFF', ' fill-opacity=".25"')
const prideBand = () => PRIDE.map((c, i) => r(53.5 - (39 + i * 8) / 2, -14 + i * 2.7, 39 + i * 8, 2.8, c)).join('')
const prideFlag = () =>
  loop(r(0, 0, 3, 64, '#6B4F3A') + PRIDE.map((c, i) => r(3, i * 6, 46, 6.2, c)).join(''), 'rotate', '-2 0 64;2 0 64;-2 0 64', 3.4)

// ---- Leap Day: a frog, with big eyes on top of his head, a green body, and a hop ----
const FROG = '#4FAE3A'
const frogEyes = () =>
  r(18, -14, 24, 16, FROG) + r(65, -14, 24, 16, FROG) + r(22, -11, 16, 11, '#F7F5F0') + r(69, -11, 16, 11, '#F7F5F0') + r(27, -8, 7, 7, '#14121C') + r(74, -8, 7, 7, '#14121C') + r(29, -7, 2, 2, '#FFFFFF') + r(76, -7, 2, 2, '#FFFFFF')
const frogBody = () => r(11, 34, 85, 32, FROG) + r(30, 40, 47, 26, '#CFE8A0') + r(30, 40, 47, 2, '#B5D788') + [[18, 44], [80, 50], [24, 58]].map(([x, y]) => r(x, y, 5, 4, '#3E8E2E')).join('')

// ---- Easter: bunny ears and painted eggs ----
const bunnyEars = () =>
  loop(r(22, -46, 17, 46, '#F7F5F0') + r(27, -40, 7, 34, '#F4A6B8'), 'rotate', '-4 30 0;3 30 0;-4 30 0', 3.2) +
  loop(r(66, -46, 17, 46, '#F7F5F0') + r(71, -40, 7, 34, '#F4A6B8'), 'rotate', '4 74 0;-3 74 0;4 74 0', 3.6)
const egg = (x, y, base, stripe) => r(x + 2, y, 8, 3, base) + r(x, y + 3, 12, 8, base) + r(x + 2, y + 11, 8, 3, base) + r(x, y + 5, 12, 2, stripe)
const eggs = () => egg(104, 70, '#F4A6B8', '#F7F5F0') + egg(117, 73, '#8FC7F2', '#F2C94C') + egg(-10, 72, '#B7E08A', '#F7F5F0')

// ---- St Patrick's Day: green top hat with a gold buckle, shamrock ----
const leprechaunHat = () =>
  r(8, -6, 91, 9, '#1E7A3C') + r(24, -36, 59, 31, '#1E7A3C') + r(24, -14, 59, 7, '#0F4D26') + r(49, -15, 11, 9, '#F2C94C') + r(52, -12, 5, 3, '#0F4D26')
const shamrock = (x, y) =>
  pulse(r(x + 5, y, 7, 7, '#2E9E55') + r(x, y + 6, 7, 7, '#2E9E55') + r(x + 10, y + 6, 7, 7, '#2E9E55') + r(x + 5, y + 10, 7, 7, '#2E9E55') + r(x + 8, y + 16, 3, 8, '#1E7A3C'), '1;.55;1', 2.4)

// ---- Canada Day: red and white like the flag, a maple leaf, and a flag in his hand ----
const RED = '#D6252B'
const WHITE = '#F7F5F0'
const mapleLeaf = (x, y, fill, u = 1) =>
  [[14, 0, 5, 5], [10, 4, 13, 5], [4, 8, 25, 6], [6, 13, 21, 4], [10, 16, 13, 4], [15, 19, 3, 6]].map(([dx, dy, w, h]) => r(x + dx * u, y + dy * u, w * u, h * u, fill)).join('')
// Red on the sides and white in the middle, with the leaf on his belly, so he is the flag
const flagLeaf = () => mapleLeaf(37, 20, RED)
const flagBody = () => r(32, 0, 43, 65, WHITE) + flagLeaf()
const firework = (x, y, color, begin) =>
  pulse(
    [[0, -9], [0, 9], [-9, 0], [9, 0], [-6, -6], [6, -6], [-6, 6], [6, 6]].map(([dx, dy]) => r(x + dx - 1.5, y + dy - 1.5, 3, 3, color)).join('') + r(x - 2, y - 2, 4, 4, color),
    '0;1;1;0',
    2.2,
    begin,
  )
// A big flag for the flag routine: he stands waving it, in his red and white colours
export const bigCanadianFlag = () =>
  r(0, -34, 4, 74, '#6B4F3A') + r(4, -34, 14, 30, RED) + r(18, -34, 28, 30, WHITE) + r(46, -34, 14, 30, RED) + mapleLeaf(21.5, -31.5, RED, 0.8)

const canadianFlag = () =>
  loop(
    r(0, 0, 3, 64, '#6B4F3A') + r(3, 0, 11, 28, RED) + r(14, 0, 18, 28, WHITE) + r(32, 0, 11, 28, RED) + mapleLeaf(14.5, 7, RED, 0.5),
    'rotate',
    '-2 0 64;2 0 64;-2 0 64',
    3.4,
  )

// ---- Louis Riel Day: ceinture flechee (Metis sash) and the Metis flag ----
const sash = () =>
  r(11, 42, 85, 14, '#C8372D') +
  [0, 1, 2, 3, 4, 5, 6, 7].map((i) => r(13 + i * 11, 44, 5, 3, '#F7F5F0') + r(16 + i * 11, 47, 5, 3, '#2F5FA8') + r(13 + i * 11, 50, 5, 3, '#F2C94C') + r(16 + i * 11, 53, 3, 2, '#2E9E55')).join('') +
  [0, 1, 2, 3].map((i) => r(82 + i * 3, 56, 2, 13, '#C8372D')).join('')
const metisFlag = () =>
  loop(
    r(0, 0, 3, 64, '#6B4F3A') +
      r(3, 0, 40, 28, '#1F4E9E') +
      r(9, 9, 11, 11, '#F7F5F0') + r(12, 12, 5, 5, '#1F4E9E') +
      r(26, 9, 11, 11, '#F7F5F0') + r(29, 12, 5, 5, '#1F4E9E') +
      r(18, 12, 10, 5, '#F7F5F0'),
    'rotate',
    '-2 0 64;2 0 64;-2 0 64',
    3.4,
  )

// ---- Remembrance Day: an army helmet and a red poppy ----
const armyHelmet = () =>
  r(6, -5, 95, 7, '#4A582F') + r(14, -15, 79, 11, '#5B6B3A') + r(24, -23, 59, 9, '#5B6B3A') +
  [[30, -20, 7, 4], [52, -19, 8, 4], [70, -13, 7, 4], [20, -12, 7, 4], [44, -11, 9, 4]].map(([x, y, w, h]) => r(x, y, w, h, '#3F4B27')).join('') +
  r(14, 2, 4, 18, '#3A4426') + r(89, 2, 4, 18, '#3A4426')
// Placed on his belly between his hands, so nothing is drawn over it
const poppy = () =>
  r(37, 51, 3, 11, '#2E7D4F') + r(40, 55, 7, 4, '#2E7D4F') +
  r(34, 36, 10, 6, '#C8372D') + r(28, 41, 22, 10, '#C8372D') + r(34, 50, 10, 4, '#C8372D') + r(33, 40, 12, 12, '#C8372D') + r(36, 43, 6, 6, '#1B1B1B')

// ---- Victoria Day: a crown, an ermine collar, and fireworks ----
const crown = () =>
  r(24, -8, 59, 10, '#E8B93C') + r(24, -20, 11, 13, '#E8B93C') + r(48, -26, 12, 19, '#E8B93C') + r(72, -20, 11, 13, '#E8B93C') +
  r(28, -5, 5, 5, '#C8372D') + r(51, -5, 6, 5, '#2F5FA8') + r(75, -5, 5, 5, '#2E9E55') + r(50, -26, 8, 4, '#F7F5F0')
const ermine = () =>
  r(11, 50, 85, 10, '#F7F5F0') + [0, 1, 2, 3, 4, 5, 6].map((i) => r(17 + i * 12, 52, 4, 6, '#1B1B1B')).join('')

// ---- Labour Day: a hard hat, a tool belt, and a hammer ----
const hardHat = () => r(8, -5, 91, 7, '#E0A010') + r(18, -16, 71, 12, '#F2B21B') + r(30, -24, 47, 9, '#F2B21B') + r(50, -26, 8, 13, '#E0A010')
const toolBelt = () => r(11, 46, 85, 7, '#6B4F3A') + r(47, 45, 13, 9, '#F2C94C') + r(50, 48, 7, 3, '#6B4F3A') + r(80, 53, 8, 10, '#8A8A86')
const hammer = () =>
  loop(r(0, 0, 4, 38, '#8B5E3C') + r(-8, -6, 20, 10, '#8A8A86') + r(-8, -6, 6, 10, '#B9B9B4'), 'rotate', '-8 2 38;6 2 38;-8 2 38', 1.6)

// props: only what he holds. scene: the background effects for the day (see scenery.mjs); they are not stuck to him.
// ---- Chile's Independence Day (Fiestas Patrias): a huaso's black hat and poncho, and the Chilean flag in his hand ----
const CL_RED = '#D52B1E'
const CL_BLUE = '#0039A6'
const STAR_ROWS = ['...X...', '...X...', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', '.X...X.']
const star = (x, y, cell, fill) => STAR_ROWS.map((row, i) => [...row.matchAll(/X+/g)].map((run) => r(x + run.index * cell, y + i * cell, run[0].length * cell, cell, fill)).join('')).join('')
// The huaso's black felt hat: a round crown that narrows a little, a wide flat brim, and a blue, white and red ribbon (the Chilean colours)
const huasoHat = () =>
  r(0, -3, 107, 5, '#15151A') + r(5, -4.5, 97, 2, '#23232B') +
  r(34, -19, 39, 4, '#15151A') + r(31, -15, 45, 12, '#15151A') + r(34, -19, 39, 1, '#2B2B33') +
  r(31, -8.4, 45, 1.8, '#1F3FA8') + r(31, -6.6, 45, 1.8, '#F7F5F0') + r(31, -4.8, 45, 1.8, '#D52B1E')
// A huaso's poncho (manta de corral) in the Chilean colours: a navy edge, a wide cream frame, and inside it a thin white stripe,
// a red panel, white and grey bands, a navy band, a white band and a second red panel. Hangs wider than his body, starting below his eyes.
const NAVY = '#1B2A66'
const CREAM = '#EEEAE0'
const PON_RED = '#C42240'
const PON_GREY = '#8F96A3'
const poncho = () =>
  // the navy edge (thick), a thin cream frame, then a navy line before the stripes: the dark outline is thicker than the white
  r(6, 34, 95, 46, NAVY) + r(10, 38, 87, 38, CREAM) + r(13, 41, 81, 32, NAVY) +
  // the stripes across the field
  r(16, 44, 75, 1, PON_GREY) + r(16, 45, 75, 3, CREAM) +
  r(16, 49, 75, 6.5, PON_RED) +
  r(16, 56.5, 75, 3, CREAM) + r(16, 59.5, 75, 1.2, PON_GREY) +
  r(16, 63.7, 75, 3, CREAM) + r(16, 66.7, 75, 0.8, PON_GREY) +
  r(16, 68.5, 75, 2.5, PON_RED) +
  // a soft fold down the middle
  r(53, 49, 1.6, 22, '#07070B', ' fill-opacity=".25"') +
  // the neck opening
  r(44, 34, 19, 4, '#DD775B') + r(47, 38, 13, 2, '#DD775B')

// A big flag for the flag routine: he stands waving it
export const bigChileanFlag = () =>
  r(0, -34, 4, 74, '#6B4F3A') + r(4, -34, 56, 15, '#F7F5F0') + r(4, -19, 56, 15, CL_RED) + r(4, -34, 22, 15, CL_BLUE) + star(8.5, -30, 2, '#F7F5F0')

const chileanFlag = () =>
  loop(
    r(0, 0, 3, 64, '#6B4F3A') + r(3, 0, 40, 14, '#F7F5F0') + r(3, 14, 40, 14, CL_RED) + r(3, 0, 16, 14, CL_BLUE) + star(6.5, 3.5, 1.3, '#F7F5F0'),
    'rotate',
    '-2 0 64;2 0 64;-2 0 64',
    3.4,
  )

// ---- Graduation: a black gown with a gold stole, a mortarboard with a swinging tassel ----
const GOWN = '#1D212B'
const gradCap = () =>
  r(4, -13, 99, 5, '#15181F') + r(8, -8, 91, 2, '#2B3040') + r(26, -6, 55, 8, '#15181F') + r(50, -16, 6, 3, '#E8B93C') +
  r(55, -14, 44, 1.5, '#E8B93C') +
  loop(r(98, -13, 1.6, 20, '#E8B93C') + r(95.5, 7, 6.6, 11, '#E8B93C') + r(96.5, 17, 4.6, 3, '#C99A2A'), 'rotate', '-9 99 -13;9 99 -13;-9 99 -13', 1.8)
const gown = () =>
  r(11, 34, 85, 34, GOWN) + r(11, 64, 85, 15, GOWN) +
  [24, 38, 69, 83].map((x) => r(x, 36, 2, 41, '#2D3344')).join('') +
  // the stole: two gold bands from the shoulders down the front, with fringe at the ends
  r(36, 34, 7, 40, '#E8B93C') + r(65, 34, 7, 40, '#E8B93C') + r(36, 74, 7, 3, '#C99A2A') + r(65, 74, 7, 3, '#C99A2A') +
  // a white collar at the neck
  r(44, 34, 20, 3, '#F7F5F0')

// ---- Chinese New Year: a red Tang jacket with gold knots, a small red cap, and a red lantern in his hand ----
const CNY_RED = '#C8102E'
const GOLD = '#F2C230'
const cnyCap = () =>
  r(22, -2, 63, 4, '#7E0A1C') + r(26, -9, 55, 8, CNY_RED) + r(32, -13, 43, 5, CNY_RED) + r(50, -19, 7, 6, GOLD) + r(26, -3, 55, 1.5, GOLD)
const tangJacket = () =>
  r(11, 26, 85, 40, CNY_RED) + r(11, 26, 85, 3, '#7E0A1C') +
  // the stand-up gold collar and a gold trim down the front
  r(42, 26, 23, 4, GOLD) + r(52, 30, 3, 36, GOLD) + r(11, 63, 85, 3, GOLD) +
  // frog-button knots down the middle
  [34, 42, 50, 58].map((y) => r(49, y, 9, 3, GOLD) + r(51, y + 3, 5, 2, '#7E0A1C')).join('') +
  // gold coin-like patterns on the chest
  [[20, 36], [20, 50], [78, 36], [78, 50]].map(([x, y]) => r(x, y, 8, 8, GOLD) + r(x + 2, y + 2, 4, 4, CNY_RED)).join('')
// The flag of China for the flag routine: red, a big yellow star and four small ones
export const bigChineseFlag = () =>
  r(0, -34, 4, 74, '#6B4F3A') + r(4, -34, 56, 37, '#DE2910') + star(8, -30, 3, '#FFDE00') +
  [[30, -33], [35, -28], [35, -22], [30, -17]].map(([x, y]) => star(x, y, 1, '#FFDE00')).join('') + ''
const lantern = () =>
  loop(
    r(10, -6, 2, 8, '#6B4F3A') + r(5, 2, 12, 3, GOLD) + r(0, 5, 22, 18, CNY_RED) + r(4, 7, 14, 14, '#E23A4E') + r(10, 5, 2, 18, GOLD) +
      r(5, 23, 12, 3, GOLD) + r(10, 26, 2, 9, GOLD) + r(8, 33, 6, 4, GOLD),
    'rotate',
    '-6 11 -6;6 11 -6;-6 11 -6',
    2.8,
  )

// ---- Fourth of July: a star-spangled top hat, a stars-and-stripes shirt, and the American flag in his hand ----
const US_RED = '#C8283A'
const US_BLUE = '#1F3A82'
const US_WHITE = '#F7F5F0'
const dots = (x, y, cols, rows, gap, fill) => Array.from({ length: rows }, (_, j) => Array.from({ length: cols }, (_, i) => r(x + i * gap + (j % 2) * (gap / 2), y + j * gap, 1.2, 1.2, fill)).join('')).join('')
const usHat = () =>
  r(4, -4, 99, 6, US_RED) + r(4, -4, 99, 1.2, '#E24B5B') +
  r(26, -34, 55, 31, US_BLUE) + dots(29, -31, 7, 5, 7.4, US_WHITE) +
  r(26, -10, 55, 3, US_WHITE) + r(26, -7, 55, 3, US_RED) + r(26, -37, 55, 3, '#2C4A9A')
const usShirt = () =>
  Array.from({ length: 8 }, (_, i) => r(11, 34 + i * 4.2, 85, 4.2, i % 2 === 0 ? US_RED : US_WHITE)).join('') +
  r(11, 34, 36, 17, US_BLUE) + dots(14, 37, 5, 4, 6.4, US_WHITE)
const usFlag = () =>
  loop(
    r(0, 0, 3, 64, '#6B4F3A') + Array.from({ length: 7 }, (_, i) => r(3, i * 4, 44, 4, i % 2 === 0 ? US_RED : US_WHITE)).join('') + r(3, 0, 20, 16, US_BLUE) + dots(5, 2.5, 4, 4, 4.6, US_WHITE),
    'rotate',
    '-2 0 64;2 0 64;-2 0 64',
    3.4,
  )
// The flag of the United States for the flag routine
export const bigUsFlag = () =>
  r(0, -34, 4, 74, '#6B4F3A') + Array.from({ length: 13 }, (_, i) => r(4, -34 + i * 2.9, 58, 2.9, i % 2 === 0 ? US_RED : US_WHITE)).join('') + r(4, -34, 26, 20.3, US_BLUE) + dots(6.5, -31.5, 6, 5, 4.2, US_WHITE)

// ---- Cinco de Mayo: a big sombrero, a colourful striped serape, and the Mexican flag in his hand ----
const MX_GREEN = '#1E8A4C'
const MX_RED = '#D8283A'
const sombrero = () =>
  r(-8, -4, 123, 6, '#E3B94E') + r(-8, -4, 123, 1.5, MX_RED) + r(-8, 0.5, 123, 1.5, '#C99A2A') +
  [-4, 6, 16, 26, 76, 86, 96, 106].map((x) => r(x, -2.5, 3, 3, MX_RED)).join('') +
  r(30, -12, 47, 9, '#E3B94E') + r(36, -22, 35, 11, '#E3B94E') + r(41, -28, 25, 7, '#E3B94E') +
  r(30, -8, 47, 3, MX_RED) + r(30, -5, 47, 1.5, '#F7F5F0') + [32, 40, 48, 56, 64, 72].map((x) => r(x, -7.5, 3, 2, '#F2C230')).join('')
const serape = () =>
  [[MX_RED, 5], ['#F7F5F0', 2], [MX_GREEN, 5], ['#F2C230', 3], ['#1B1B1B', 1.5], [MX_RED, 5], ['#F7F5F0', 2], [MX_GREEN, 5], ['#F2C230', 3]]
    .reduce((acc, [fill, h]) => ({ y: acc.y + h, out: acc.out + r(9, acc.y, 89, h, fill) }), { y: 34, out: '' }).out +
  Array.from({ length: 15 }, (_, i) => r(10 + i * 6, 70, 2.5, 5, i % 2 ? '#F7F5F0' : MX_RED)).join('')
const mexFlag = () =>
  loop(
    r(0, 0, 3, 64, '#6B4F3A') + r(3, 0, 14, 28, MX_GREEN) + r(17, 0, 13, 28, '#F7F5F0') + r(30, 0, 14, 28, MX_RED) +
      r(21, 9, 6, 7, '#8A5A2B') + r(22, 16, 4, 2, MX_GREEN) + r(20, 18, 8, 1.5, '#6B4F3A'),
    'rotate',
    '-2 0 64;2 0 64;-2 0 64',
    3.4,
  )
export const bigMexicanFlag = () =>
  r(0, -34, 4, 74, '#6B4F3A') + r(4, -34, 20, 38, MX_GREEN) + r(24, -34, 19, 38, '#F7F5F0') + r(43, -34, 20, 38, MX_RED) +
  r(29, -24, 9, 11, '#8A5A2B') + r(30.5, -13, 6, 3, MX_GREEN) + r(28, -10, 11, 2, '#6B4F3A')

// ---- May the Fourth: a Jedi robe, a glowing blue lightsaber, and a galaxy far, far away ----
const ROBE = '#CDB88F'
const jediRobe = () =>
  r(11, 34, 85, 36, ROBE) + r(11, 34, 22, 36, '#A8916A') + r(74, 34, 22, 36, '#A8916A') +
  r(42, 34, 23, 7, '#DD775B') + r(46, 41, 15, 3, '#DD775B') +
  r(11, 54, 85, 5, '#6B4A2B') + r(47, 53, 13, 7, '#B9B9BF') + r(51, 55, 5, 3, '#6B4A2B') +
  r(36, 34, 3, 20, '#8F7A55') + r(68, 34, 3, 20, '#8F7A55')
const lightsaber = () =>
  pulse(r(-3, -22, 10, 64, '#6FD3FF', ' fill-opacity=".22"') + r(-1, -22, 6, 64, '#9BE3FF', ' fill-opacity=".5"'), '.7;1;.7', 1.1) +
  r(0.5, -22, 3, 64, '#EAFBFF') + r(-0.5, 42, 5, 22, '#9A9AA0') + r(-0.5, 46, 5, 2, '#333338') + r(-0.5, 52, 5, 2, '#333338') + r(1, 60, 2, 4, '#E03C31')

// ---- Birthday: a tall polka-dot party hat and a cake with flickering candles in his hand ----
const PARTY = ['#F25C8B', '#F7D046', '#4FB6F2', '#7BD36B']
// A white cone with a rainbow sweeping diagonally across it, little stars, a "happy birthday" in colourful letters, a red rim,
// and a bright bow with curling ribbons on top, like a party hat from a shop
const RAINBOW = ['#E23A4E', '#F28A2E', '#F7D046', '#4DB86B', '#3F9BE0', '#8A5CC8']
const partyHat = () => {
  const cell = 1.7
  const rows = 24
  const rects = []
  for (let i = 0; i < rows; i++) {
    const v = i / (rows - 1)
    const half = 2.4 + v * 22
    const runs = []
    for (let k = -Math.ceil(half / cell); k <= Math.ceil(half / cell); k++) {
      const x = k * cell
      if (Math.abs(x) + cell / 2 > half) continue
      const t = v * 9.5 - (x / half) * 2.2
      let fill = x > half - cell * 1.3 ? '#E4E0D6' : '#F8F6F1'
      if (t >= 5.2 && t < 11.2) fill = RAINBOW[Math.floor((t - 5.2) / 1)]
      const last = runs[runs.length - 1]
      if (last && last.fill === fill) last.w += cell
      else runs.push({ x, w: cell, fill })
    }
    for (const run of runs) rects.push(r(53.5 + run.x - cell / 2, -40 + i * 1.7, run.w, 1.9, run.fill))
  }
  const text = (y, from, to, colours) => Array.from({ length: Math.floor((to - from) / 2.6) }, (_, i) => r(from + i * 2.6, y, 1.8, 2, colours[i % colours.length])).join('')
  const star = (x, y, fill) => r(x, y - 1, 1.2, 3.2, fill) + r(x - 1, y, 3.2, 1.2, fill)
  return (
    rects.join('') +
    text(-24, 45, 62, ['#E23A4E', '#F28A2E', '#4DB86B', '#3F9BE0', '#8A5CC8']) +
    text(-20.5, 42, 66, ['#3F9BE0', '#8A5CC8', '#E23A4E', '#F28A2E', '#4DB86B', '#F7D046']) +
    star(47, -30, '#E23A4E') + star(59, -28, '#F7D046') + star(44, -14, '#3F9BE0') + star(49, -9, '#F28A2E') + star(40, -5, '#E23A4E') +
    r(22, -1, 63, 3.8, '#C23A5A') + r(22, -1, 63, 1, '#E06A86') +
    // the bow and its curling ribbons
    r(45, -48.0, 7, 6, '#3F9BE0') + r(55, -48.0, 7, 6, '#F28A2E') + r(51, -47.0, 5, 6, '#4DB86B') + r(49, -51.0, 4, 4, '#E23A4E') + r(55, -51.0, 4, 4, '#F7D046') +
    r(62, -50.0, 7, 1.6, '#8A5CC8') + r(68, -48.5, 1.6, 5, '#8A5CC8') + r(63, -44.0, 6, 1.6, '#8A5CC8') +
    r(61, -45.0, 6, 1.6, '#F28A2E') + r(66, -43.5, 1.6, 5, '#F28A2E') + r(60, -39.0, 6, 1.6, '#F28A2E') +
    r(43, -46.0, 1.6, 7, '#3F9BE0') + r(41, -40.0, 3, 1.6, '#3F9BE0')
  )
}
const flame = (x, delay) => pulse(r(x, 14, 3, 5, '#F7A33A') + r(x + 0.5, 15.5, 2, 3, '#FFE27A'), '.55;1;.7;1;.55', 0.7, delay)
const cake = () =>
  r(-10, 42, 36, 3, '#E8E4DA') +
  r(-6, 31, 28, 11, '#F25C8B') + r(-6, 31, 28, 3, '#F7F5F0') + [-4, 2, 8, 14, 19].map((x, i) => r(x, 34, 3, 2 + (i % 2) * 2, '#F7F5F0')).join('') +
  r(-3, 38, 22, 2, '#C93D6E') + [[0, 'a'], [6, 'b'], [12, 'c']].map(([x]) => '').join('') +
  r(-1, 22, 3, 9, '#4FB6F2') + r(5, 22, 3, 9, '#F7D046') + r(11, 22, 3, 9, '#7BD36B') +
  flame(-1, 0) + flame(5, 0.2) + flame(11, 0.4)

// ---- Earth Day: a crown of leaves, a green shirt with the Earth on it, and a little tree in a pot ----
const LEAF_DARK = '#2E7D3A'
const LEAF = '#4CAF50'
const disc = (cx, cy, R, cell, fill) =>
  Array.from({ length: R * 2 }, (_, i) => {
    const y = i + 0.5 - R
    const half = Math.sqrt(Math.max(0, R * R - y * y))
    return r(cx - half * cell, cy - R * cell + i * cell, half * 2 * cell, cell, fill)
  }).join('')
// A five-petal flower, 8 wide, with a bright centre
const flower = (x, y, petal, centre, size = 1) =>
  r(x + 2.5 * size, y, 3 * size, 2.5 * size, petal) + r(x + 2.5 * size, y + 5.5 * size, 3 * size, 2.5 * size, petal) +
  r(x, y + 2.5 * size, 2.5 * size, 3 * size, petal) + r(x + 5.5 * size, y + 2.5 * size, 2.5 * size, 3 * size, petal) +
  r(x + 1 * size, y + 1 * size, 2 * size, 2 * size, petal) + r(x + 5 * size, y + 5 * size, 2 * size, 2 * size, petal) +
  r(x + 2.5 * size, y + 2.5 * size, 3 * size, 3 * size, centre)
// A lush crown like a bride's: big cream and blush roses with white blossoms, buds and green leaves, heaviest at the sides and sweeping across the top of his head
const bloomRose = (x, y, size, bloom = '#F6EBDD', blush = '#F2C9B8') =>
  r(x + size * 0.15, y + size * 0.2, size * 0.7, size * 0.6, bloom) + r(x + size * 0.3, y, size * 0.4, size, bloom) + r(x, y + size * 0.3, size, size * 0.4, bloom) +
  r(x + size * 0.28, y + size * 0.28, size * 0.44, size * 0.44, blush) + r(x + size * 0.4, y + size * 0.4, size * 0.2, size * 0.2, '#D99A86') + r(x + size * 0.12, y + size * 0.18, size * 0.2, size * 0.16, '#FFFFFF', ' fill-opacity=".8"')
// flip = -1 mirrors the pair; a rectangle cannot have a negative width, so a mirrored one starts at its far end instead
const leafPair = (x, y, flip = 1) => {
  const bar = (dx, dy, w, h, fill) => r(flip < 0 ? x - dx - w : x + dx, y + dy, w, h, fill)
  return bar(0, 0, 6, 2.5, LEAF_DARK) + bar(1, -1.5, 4, 1.6, LEAF) + bar(1, 2.5, 5, 1.6, LEAF)
}
const leafCrown = () => {
  const cream = ['#F6EBDD', '#FBF6EE', '#F9EEDF']
  const blush = ['#F2C9B8', '#F7D9CC', '#F4CFC0']
  // a lighter crown: a single row of roses with leaves showing between them, a few small ones peeking above, and a rose or two at each side
  const row = [20, 33, 46, 59, 72].map((x, i) => bloomRose(x, -11 + (i % 2) * -2, 11, cream[i % 3], blush[(i + 1) % 3])).join('')
  const peeking = [27, 53, 66].map((x, i) => bloomRose(x, -19, 8, cream[(i + 2) % 3], blush[i % 3])).join('')
  const sides = bloomRose(6, -5, 14) + bloomRose(7, 8, 8, '#FBF6EE', '#F7D9CC') + bloomRose(87, -5, 14) + bloomRose(92, 8, 8, '#FBF6EE', '#F7D9CC')
  const leaves = [14, 28, 41, 54, 67, 80, 90].map((x, i) => leafPair(x, -8 + (i % 2) * 2, i % 2 ? -1 : 1)).join('')
  return r(10, -4, 87, 6, LEAF_DARK) + leaves + peeking + row + sides + r(44, -2, 3, 3, '#FFFFFF') + r(70, -1, 3, 3, '#FFFFFF')
}
// The Earth: a shaded globe in chunky pixels, with a dark rim, ice caps, the Americas, Europe and Africa, and a few clouds
const EARTH_LAND = [
  '....................',
  '......LLLL..........',
  '.....LLLLLL.........',
  '....LLLLLLLL........',
  '....LLLLLLL.....L...',
  '.....LLLLLL....LLL..',
  '......LLLLL...LLLL..',
  '......LLLL.....LLL..',
  '.......LLL....LLLL..',
  '.......LLLL..LLLLL..',
  '........LLL..LLLLL..',
  '.........LL..LLLL...',
  '.........LLL..LLL...',
  '.........LLLL..LL...',
  '..........LLL.......',
  '..........LLL.......',
  '...........LL.......',
  '...........L........',
  '....................',
  '....................',
]
const EARTH_CLOUDS = new Set(['3,12', '3,13', '3,14', '4,12', '8,3', '8,4', '8,5', '12,13', '12,14', '13,12', '13,13', '14,7', '14,8', '6,16', '6,17', '2,10', '2,11'])
const earthGlobe = (cx, cy, cell) => {
  const R = 10
  const out = []
  for (let i = 0; i < R * 2; i++) {
    const runs = []
    for (let j = 0; j < R * 2; j++) {
      const dx = j + 0.5 - R
      const dy = i + 0.5 - R
      const d2 = dx * dx + dy * dy
      if (d2 > R * R) continue
      const light = (dx + dy) / (R * 1.45)
      let fill
      if (d2 > (R - 1.1) * (R - 1.1)) fill = '#143A7A'
      else if (i <= 1 || i >= R * 2 - 2) fill = '#EAF2FA'
      else if (EARTH_LAND[i][j] === 'L') fill = light > 0.38 ? '#2F8A47' : light < -0.5 ? '#7FD07C' : '#4CAF5A'
      else fill = light > 0.45 ? '#1E4FA0' : light < -0.55 ? '#5B9BF2' : '#2F6FD0'
      if (EARTH_CLOUDS.has(`${i},${j}`)) fill = '#F4F8FC'
      const last = runs[runs.length - 1]
      if (last && last.fill === fill && last.end === j) {
        last.end = j + 1
      } else runs.push({ from: j, end: j + 1, fill })
    }
    for (const run of runs) out.push(r(+(cx + (run.from - R) * cell).toFixed(2), +(cy + (i - R) * cell).toFixed(2), +((run.end - run.from) * cell + 0.15).toFixed(2), +(cell + 0.15).toFixed(2), run.fill))
  }
  return out.join('')
}
const earthShirt = () =>
  // a plain, full-width green tee: a round neck, a hem line, and the Earth badge in the middle
  r(11, 34, 85, 31, '#4FA66A') + r(11, 34, 85, 2, '#3C8A54') + r(40, 34, 27, 3, '#2E7D3A') + r(44, 37, 19, 2, '#2E7D3A') + r(11, 62, 85, 3, '#3C8A54') +
  earthGlobe(53.5, 51, 1.1)
const sapling = () =>
  r(-5, 36, 18, 3, '#C9784A') + r(-3, 39, 14, 10, '#B5653A') + r(-1, 35, 10, 2, '#5A3A22') +
  loop(r(3, 18, 2, 18, '#3E8E41') + r(-5, 14, 9, 6, LEAF) + r(5, 10, 9, 6, LEAF) + r(-1, 6, 8, 6, '#6CC070') + r(3, 4, 3, 3, '#8FD99A'), 'rotate', '-4 4 36;4 4 36;-4 4 36', 2.8)

// ---- Mother's Day: a flower headband, a pink cardigan with a heart, and a bouquet in his hand ----
const mumHead = () =>
  r(22, -3, 63, 4, '#F4A6C0') +
  flower(24, -12, '#F25C8B', '#F7D046', 1.1) + flower(34, -10, '#F7F5F0', '#F2C230') + flower(44, -8, '#B58CE0', '#F7D046', 0.9) +
  [30, 41].map((x) => r(x, -2, 4, 3, '#4CAF50')).join('') +
  r(70, -7, 6, 6, '#F25C8B') + r(77, -7, 6, 6, '#F25C8B') + r(75, -6, 3, 4, '#E23A6B') + r(72, -1, 2, 7, '#F25C8B') + r(78, -1, 2, 7, '#F25C8B')
const mumBody = () =>
  r(11, 34, 85, 32, '#F4A6C0') + r(11, 34, 85, 3, '#E889A8') + r(52.5, 37, 2, 29, '#E889A8') +
  [42, 50, 58].map((y) => r(49, y, 2.5, 2.5, '#F7F5F0') + r(56, y, 2.5, 2.5, '#F7F5F0')).join('') +
  r(14, 34, 3, 32, '#F7F5F0', ' fill-opacity=".5"') + heart(22, 44, 3, '#E0334F')
const bouquet = () =>
  loop(
    r(2, 18, 2, 18, '#3E8E41') + r(-4, 19, 2, 17, '#3E8E41') + r(8, 19, 2, 17, '#3E8E41') +
      r(-8, 8, 8, 9, '#F25C8B') + r(-6, 6, 4, 3, '#E23A6B') + r(0, 4, 8, 10, '#F7D046') + r(2, 2, 4, 3, '#E0A010') + r(7, 8, 8, 9, '#B58CE0') + r(9, 6, 4, 3, '#8A5CC8') +
      r(-9, 34, 22, 12, '#F7F5F0') + r(-9, 34, 22, 2, '#F25C8B') + r(-5, 44, 14, 6, '#F4A6C0'),
    'rotate',
    '-3 3 44;3 3 44;-3 3 44',
    2.8,
  )

// ---- Father's Day: a navy ball cap, a blue shirt with a red tie, and a "#1 DAD" mug ----
const dadCap = () =>
  r(24, -9, 59, 10, '#1F3A6E') + r(30, -14, 47, 6, '#1F3A6E') + r(38, -17, 31, 4, '#1F3A6E') + r(51, -18.5, 5, 2.5, '#E23A4E') +
  r(70, -1, 32, 4, '#16294F') + r(70, -1, 32, 1, '#2C4C8A') + r(24, -1, 59, 3, '#16294F') + r(45, -11, 17, 6, '#F7F5F0') + r(47.5, -9.5, 12, 3, '#E23A4E')
const dadBody = () =>
  r(11, 34, 85, 32, '#3A78C8') + r(11, 34, 85, 3, '#2C5FA0') +
  [12, 28, 44, 60, 76].map((x) => r(x, 37, 1.6, 29, '#2C5FA0')).join('') + [40, 48, 56].map((y) => r(11, y, 85, 1.6, '#2C5FA0')).join('') +
  r(42, 34, 23, 5, '#F7F5F0') + r(48, 38, 11, 5, '#C42240') + r(49.5, 43, 8, 14, '#D8283A') + r(51, 57, 5, 5, '#D8283A') + r(49.5, 47, 8, 1.6, '#F7F5F0')
const dadMug = () =>
  r(0, 26, 20, 22, '#F7F5F0') + r(0, 26, 20, 3, '#D9D5CA') + r(20, 30, 6, 4, '#F7F5F0') + r(23, 30, 3, 14, '#F7F5F0') + r(20, 40, 6, 4, '#F7F5F0') +
  r(3, 33, 14, 3, '#1F3A6E') + r(3, 38, 14, 3, '#E23A4E') + r(5, 43, 10, 1.5, '#1F3A6E') +
  pulse(r(4, 16, 2, 8, '#E8E4DA', ' fill-opacity=".7"') + r(10, 12, 2, 10, '#E8E4DA', ' fill-opacity=".6"') + r(15, 17, 2, 7, '#E8E4DA', ' fill-opacity=".7"'), '.3;.9;.3', 2.2)

// ---- Valentine's Day: beating heart eyes, rosy cheeks, and a red rose in his hand ----
const HEART_ROWS = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
const heart = (x, y, cell, fill) => HEART_ROWS.map((row, i) => [...row.matchAll(/X+/g)].map((run) => r(x + run.index * cell, y + i * cell, run[0].length * cell, cell, fill)).join('')).join('')
// Heart eyes: a red heart, centred on the eye, that beats. It replaces the dark square, so blinking and glancing still work.
export const heartEye = () =>
  loop(heart(-9.1, -7.8, 2.6, '#E0334F') + r(-6.5, -5.2, 2.6, 2.6, '#FFB3C6'), 'scale', '1 1;1.14 1.14;1 1', 0.9)

// An anime blush: one soft pink glow right across his face under the eyes, with red diagonal hatching on it, glowing slowly
const hatch = (x, y) => r(x, y + 4, 1.6, 1.6, '#FF3B5C', ' fill-opacity=".55"') + r(x + 1.6, y + 2.4, 1.6, 1.6, '#FF3B5C', ' fill-opacity=".55"') + r(x + 3.2, y + 0.8, 1.6, 1.6, '#FF3B5C', ' fill-opacity=".55"')
const blush = () =>
  pulse(
    r(12, 24.5, 83, 10, '#FF8FA8', ' fill-opacity=".1"') +
      r(14, 26, 79, 7, '#FF8FA8', ' fill-opacity=".17"') +
      Array.from({ length: 15 }, (_, i) => hatch(17 + i * 5.2, 26.5)).join(''),
    '.6;1;.6',
    2.4,
  )

const rose = () =>
  loop(
    r(0, -2, 3, 36, '#2E7D4F') + r(3, 16, 7, 3, '#2E7D4F') + r(-7, 11, 7, 3, '#2E7D4F') +
      r(-5, -12, 13, 3, '#E0334F') + r(-7, -9, 17, 8, '#E0334F') + r(-5, -1, 13, 3, '#E0334F') + r(-2, -8, 7, 5, '#B8203A') + r(0, -6, 3, 2, '#E0334F'),
    'rotate',
    '-4 1 34;4 1 34;-4 1 34',
    2.6,
  )

// ---- Thanksgiving (Canada): a pilgrim hat, a big white collar, and a pumpkin pie in his hand ----
const pilgrimHat = () =>
  r(4, -4, 99, 5, '#1E1B18') + r(28, -30, 51, 26, '#1E1B18') + r(31, -34, 45, 5, '#1E1B18') + r(28, -10, 51, 6, '#5B3E22') +
  r(45, -11, 17, 9, '#E8B93C') + r(48.5, -8.5, 10, 4, '#1E1B18')
const pilgrimCollar = () =>
  // a dark coat, a wide white collar that points down the chest, and a gold buckle on the belt
  r(11, 34, 85, 32, '#2A2622') + r(11, 34, 85, 3, '#3A342E') + r(26, 34, 55, 5, '#F7F5F0') + r(20, 38, 22, 11, '#F7F5F0') + r(65, 38, 22, 11, '#F7F5F0') +
  r(44, 40, 19, 3, '#F7F5F0') + r(42, 48, 4, 2, '#E4E0D6') + r(61, 48, 4, 2, '#E4E0D6') + r(11, 58, 85, 4, '#5B3E22') + r(47, 57, 13, 6, '#E8B93C') + r(50.5, 59, 6, 2.5, '#2A2622')
const pumpkinPie = () =>
  r(-9, 40, 36, 3, '#E8E4DA') + r(-8, 36, 34, 6, '#C98A4B') + [-8, -3, 2, 7, 12, 17, 22].map((x) => r(x, 35, 3, 3, '#B07538')).join('') +
  r(-5, 31, 28, 6, '#E0883A') + r(-2, 33, 22, 2, '#C46F25') + r(2, 28, 12, 4, '#F7F5F0') + r(4, 26, 8, 3, '#F7F5F0') +
  pulse(r(0, 14, 2, 8, '#E8E4DA', ' fill-opacity=".6"') + r(7, 10, 2, 10, '#E8E4DA', ' fill-opacity=".5"') + r(14, 15, 2, 7, '#E8E4DA', ' fill-opacity=".6"'), '.25;.85;.25', 2.4)

// ---- New Year's Eve: a gold party hat with the new year on it, and a sparkler ----
// The year that is starting: on Jan 1 it is this year, and on Dec 31 (or any other day) it is the next one. Read from the clock every time he is drawn.
const newYearNumber = () => {
  const now = new Date(Date.now())
  return now.getMonth() === 0 ? now.getFullYear() : now.getFullYear() + 1
}
const newYearHat = () => {
  const rows = Array.from({ length: 9 }, (_, i) => r(53.5 - (4 + i * 5) / 2, -36 + i * 3.8, 4 + i * 5, 4, i % 3 === 1 ? '#D9DEE6' : '#F2C230')).join('')
  const digits = digitsSvg(String(newYearNumber()).slice(-2), 45.5, -13, 1.6, '#14213D')
  return rows + digits + r(22, -1, 63, 3.5, '#D9DEE6') + r(49, -42, 9, 8, '#F7F5F0') + r(51, -44, 5, 3, '#F7F5F0') + [[40, -22], [66, -26], [60, -9]].map(([x, y]) => r(x, y, 2.4, 2.4, '#FFF3A8')).join('')
}
const sparkler = () => {
  const spark = (x, y, begin) => pulse(r(x, y, 2.4, 2.4, '#FFE27A') + r(x + 0.8, y - 1.6, 0.8, 5.6, '#FFF6C8') + r(x - 1.6, y + 0.8, 5.6, 0.8, '#FFF6C8'), '0;1;0', 0.6, begin)
  return r(0, 8, 2, 54, '#8A8A90') + r(-1, 4, 4, 6, '#FFB347') + [[-6, -6, 0], [6, -9, 0.15], [-9, 2, 0.3], [9, 0, 0.45], [1, -14, 0.2], [-3, 8, 0.1], [7, 8, 0.35]].map(([x, y, b]) => spark(x, y, b)).join('')
}

// ---- New Year's Day: a black top hat, a navy jacket with a gold sash showing the year, and a glass of bubbly ----
const newYearsDayHat = () =>
  r(4, -4, 99, 5, '#14121C') + r(28, -34, 51, 31, '#14121C') + r(31, -37, 45, 4, '#14121C') + r(28, -10, 51, 5, '#F2C230') + r(28, -10, 51, 1, '#FFE27A') +
  [[34, -25], [64, -22], [44, -17]].map(([x, y]) => r(x, y, 2.2, 2.2, '#FFE27A')).join('')
const newYearsDayBody = () =>
  r(11, 34, 85, 32, '#14213D') + r(11, 34, 85, 3, '#0B1426') + r(43, 34, 21, 22, '#F7F5F0') + r(50, 34, 7, 8, '#14213D') +
  r(11, 47, 85, 12, '#F2C230') + r(11, 47, 85, 1.5, '#FFE27A') + r(11, 57.5, 85, 1.5, '#D6A21C') + digitsSvg(String(newYearNumber()), 35.5, 50, 1.5, '#14213D') +
  [41, 45].map((y) => r(51, y, 2.5, 2.5, '#F2C230')).join('')
const bubbly = () =>
  r(0, 62, 14, 2.5, '#E8E4DA') + r(5.5, 46, 3, 16, '#E8E4DA') + r(0, 22, 14, 24, '#F6E7A8', ' fill-opacity=".85"') + r(0, 22, 14, 2, '#FFFFFF', ' fill-opacity=".8"') + r(-0.8, 22, 1.6, 24, '#E8E4DA') + r(13.2, 22, 1.6, 24, '#E8E4DA') +
  [[3, 40, 0], [8, 34, 0.5], [5, 28, 1.0], [10, 42, 0.3]].map(([x, y, b]) => pulse(r(x, y, 2, 2, '#FFFBE0'), '0;1;0', 1.2, b)).join('')

// ---- Pi Day: a purple beanie with pi on it, a shirt with pi and its first digits, and a pie in his hand ----
const PI_ROWS = ['XXXXXXX', '.X...X.', '.X...X.', '.X...X.', '.X...XX']
const piSign = (x, y, cell, fill) => PI_ROWS.map((row, j) => [...row.matchAll(/X+/g)].map((run) => r(x + run.index * cell, y + j * cell, run[0].length * cell, cell, fill)).join('')).join('')
const piBeanie = () =>
  r(24, -9, 59, 10, '#5B3FA0') + r(30, -14, 47, 6, '#5B3FA0') + r(38, -17, 31, 4, '#5B3FA0') + r(22, -1, 63, 3.5, '#47318A') + r(50, -22, 7, 6, '#F7F5F0') +
  piSign(46, -14, 2, '#F7F5F0')
const piShirt = () =>
  r(11, 34, 85, 32, '#2B3A67') + r(11, 34, 85, 3, '#1F2B4D') + piSign(43, 38, 3, '#F7F5F0') + digitsSvg('3.14159', 36.5, 56, 1.3, '#7FD6F2')
const piPie = () =>
  r(-9, 40, 36, 3, '#E8E4DA') + r(-8, 34, 34, 8, '#D9A05B') + [-8, -3, 2, 7, 12, 17, 22].map((x) => r(x, 33, 3, 3, '#C98A4B')).join('') +
  r(-5, 29, 28, 6, '#D9A05B') + [-4, 3, 10, 17].map((x) => r(x, 29, 2, 6, '#B97F3E')).join('') + [31, 33].map((y) => r(-5, y, 28, 1.6, '#B97F3E')).join('') +
  [-2, 6, 14].map((x) => r(x, 30.5, 4, 3, '#C42240')).join('')

// ---- Groundhog Day: a furry brown hat with round ears (and a groundhog peeking out of a burrow in the background) ----
const groundhogHat = () =>
  r(22, -4, 63, 6, '#8A5A32') + r(26, -10, 55, 7, '#9C6A3C') + r(32, -13, 43, 4, '#9C6A3C') +
  r(22, -17, 12, 12, '#8A5A32') + r(25, -14, 6, 7, '#E7A9A0') + r(73, -17, 12, 12, '#8A5A32') + r(76, -14, 6, 7, '#E7A9A0')

// ---- Halloween costumes: a witch, a ghost, a pumpkin and a vampire (plus four more below), one for each day from Oct 24 to Oct 31 ----
// A proper ghost: a rounded white sheet over his head and body with the eyes left clear (his own eyes are the ghost's), a scalloped hem,
// soft folds and a little round "oooh" mouth
const ghostSheet = () =>
  // over the head, in pieces so the two eye holes (x 18-35 and 72-89, y 8-25) stay clear
  r(16, -16, 75, 4, '#F7F5F0') + r(11, -12, 85, 20, '#F7F5F0') + r(35, 8, 37, 17, '#F7F5F0') + r(7, 8, 11, 17, '#F7F5F0') + r(89, 8, 11, 17, '#F7F5F0') +
  r(11, -12, 85, 2, '#FFFFFF') + r(86, -10, 6, 18, '#E4E0D6') + r(86, 8, 14, 17, '#E4E0D6') + r(50, -12, 3, 20, '#EDEAE2')
const ghostBody = () =>
  r(5, 25, 97, 38, '#F7F5F0') +
  // the wavy hem: scallops hanging down over his legs
  [5, 17, 29, 41, 53, 65, 77, 89].map((x, i) => r(x, 63, 13, 6 + (i % 2) * 3, '#F7F5F0') + r(x + 2, 69 + (i % 2) * 3, 9, 2, '#F7F5F0')).join('') +
  // shading on the right, folds and mouth
  r(90, 25, 12, 44, '#E4E0D6') + [26, 40, 66].map((x) => r(x, 38, 2, 28, '#EDEAE2')).join('') +
  r(48, 33, 11, 11, '#1C1626') + r(50, 35, 7, 7, '#3A2A4A')
const pumpkinTop = () =>
  r(48, -16, 7, 9, '#4F7A2B') + r(52, -20, 4, 6, '#4F7A2B') + r(14, -8, 79, 11, '#F28A2E') + r(24, -13, 59, 8, '#F28A2E') +
  [28, 44, 60, 76].map((x) => r(x, -10, 2, 13, '#D96F1A')).join('')
const pumpkinBody = () =>
  r(11, 32, 85, 36, '#F28A2E') + [24, 40, 56, 72].map((x) => r(x, 34, 2.5, 32, '#D96F1A')).join('') +
  r(34, 42, 10, 9, '#FFD34A') + r(63, 42, 10, 9, '#FFD34A') + r(44, 56, 20, 4, '#FFD34A') + r(34, 54, 10, 6, '#FFD34A') + r(63, 54, 10, 6, '#FFD34A') + r(50, 50, 7, 5, '#FFD34A')
const vampireHair = () =>
  // slicked-back black hair with a widow's peak; the sideburns run down the very edges of his head, clear of his eyes (which start at x 21 and end at x 86)
  r(16, -6, 75, 10, '#14121C') + r(22, -10, 63, 6, '#14121C') + r(46, -2, 15, 8, '#14121C') + r(50, 2, 7, 6, '#14121C') + r(11, -2, 9, 26, '#14121C') + r(87, -2, 9, 26, '#14121C')
const vampireCape = () =>
  r(8, 32, 91, 38, '#14121C') + r(26, 32, 55, 38, '#8E1B2C') + r(22, 30, 14, 18, '#14121C') + r(71, 30, 14, 18, '#14121C') + r(40, 32, 27, 4, '#F7F5F0') +
  r(46, 40, 4, 7, '#F7F5F0') + r(57, 40, 4, 7, '#F7F5F0') + r(52, 52, 3, 3, '#D0A63A')

// ---- More Halloween costumes: a mummy, a skeleton, Frankenstein's monster, a werewolf, a zombie, a pirate and a Ghostbuster ----
// Costumes that cover his eyes draw their own, and a second set with X's for when the limit is reached
const crossEyes = (y, back, fore, xs = [22, 72]) =>
  xs.map((x) => r(x, y, 13, 9, back) + [[0, 0], [2, 2], [4, 4], [6, 6], [6, 0], [4, 2], [2, 4], [0, 6]].map(([a, b]) => r(x + 2.5 + a * 0.95, y + 0.5 + b * 0.95, 2, 2, fore)).join('')).join('')
const handCover = (side, colour) => r(side === 'left' ? 0 : 85, 21, 22, 23, colour)

const WRAP = '#E8E0C8'
const WRAP_SHADE = '#C9BE9E'
const mummyWraps = () =>
  // bandages over the top and sides of his head, across the bridge and over the lower face, leaving the eye holes (x 21-36 and 71-86, y 2-10) clear
  r(9, -9, 89, 11, WRAP) + r(12, -13, 83, 5, WRAP) + r(9, 2, 12, 31, WRAP) + r(86, 2, 12, 31, WRAP) + r(36, 2, 35, 9, WRAP) + r(17, 11, 73, 22, WRAP) +
  [-6, -2, 4, 8, 14, 19, 24, 29].map((y, i) => r(9 + (i % 2) * 2, y, 89 - (i % 2) * 4, 1.2, WRAP_SHADE)).join('') +
  r(22, 10, 14, 1.4, WRAP_SHADE) + r(71, 10, 14, 1.4, WRAP_SHADE)
const mummyLoose = () => loop(r(86, 22, 5, 16, WRAP) + r(86, 36, 7, 2, WRAP_SHADE), 'rotate', '-6 88 22;8 88 22;-6 88 22', 2.4)
const mummyHead = () => mummyWraps() + r(21, 2, 15, 8, '#1B1612') + r(71, 2, 15, 8, '#1B1612') + r(26, 4, 5, 4, '#F7F5F0') + r(76, 4, 5, 4, '#F7F5F0') + mummyLoose()
const mummyLimit = () => mummyWraps() + crossEyes(2, '#1B1612', '#F7F5F0', [22, 72]) + mummyLoose()
const mummyBody = () =>
  r(11, 34, 85, 32, WRAP) + [37, 41, 45, 50, 54, 58, 63].map((y, i) => r(11, y, 85, 1.2, WRAP_SHADE) + r(11 + (i % 3) * 14, y + 1.2, 18 + (i % 2) * 10, 2, '#F4EEDC')).join('') +
  r(30, 34, 20, 8, WRAP_SHADE, ' fill-opacity=".6"') + loop(r(70, 60, 4, 14, WRAP) + r(69, 72, 6, 2, WRAP_SHADE), 'rotate', '-8 72 60;8 72 60;-8 72 60', 2.8)

const skeletonFace = () =>
  r(17, -3, 73, 37, '#F5F2EA') + r(17, -3, 73, 2, '#FFFFFF') + r(87, -3, 3, 37, '#DDD8CB') +
  r(20, 0, 19, 14, '#0F0D14') + r(68, 0, 19, 14, '#0F0D14') +
  r(51, 15, 6, 6, '#0F0D14') + r(52, 13, 4, 3, '#0F0D14') +
  r(28, 25, 51, 7, '#0F0D14') + [30, 36, 42, 48, 54, 60, 66, 72].map((x) => r(x, 26, 4, 5, '#F5F2EA')).join('') + r(28, 28.3, 51, 1, '#0F0D14')
const skeletonHead = () => skeletonFace() + r(26, 4, 3, 3, '#F28A2E', ' fill-opacity=".8"') + r(77, 4, 3, 3, '#F28A2E', ' fill-opacity=".8"')
const skeletonLimit = () => skeletonFace() + crossEyes(2, '#0F0D14', '#F5F2EA', [25, 69])
const skeletonBody = () =>
  r(11, 34, 85, 32, '#14121C') + r(52, 34, 3, 32, '#F5F2EA') + [38, 44, 50, 56].map((y) => r(32, y, 43, 3, '#F5F2EA') + r(28, y + 1, 4, 2, '#F5F2EA') + r(75, y + 1, 4, 2, '#F5F2EA')).join('') + r(44, 60, 19, 4, '#F5F2EA')

const FRANK = '#7FB069'
const FRANK_DARK = '#2E4A2A'
const monsterFace = () =>
  // a flat-top head of black hair, green skin with a heavy brow, forehead stitches, a stitched mouth and the neck bolts
  r(16, -16, 75, 15, '#1B221E') + r(12, -7, 83, 10, '#1B221E') + r(9, 0, 9, 22, '#1B221E') + r(89, 0, 9, 22, '#1B221E') +
  r(17, 2, 73, 31, FRANK) + r(17, -1, 73, 4, FRANK) + r(87, 2, 3, 31, '#659A52') +
  r(20, 1, 19, 4, FRANK_DARK) + r(68, 1, 19, 4, FRANK_DARK) +
  r(32, 0, 43, 1.4, FRANK_DARK) + [36, 44, 52, 60, 68].map((x) => r(x, -1.5, 1.4, 4.4, FRANK_DARK)).join('') +
  r(38, 24, 31, 2, FRANK_DARK) + [41, 47, 53, 59, 65].map((x) => r(x, 22, 1.4, 6, FRANK_DARK)).join('') +
  r(2, 22, 8, 7, '#8E96A0') + r(0, 24, 4, 3, '#5A626C') + r(97, 22, 8, 7, '#8E96A0') + r(103, 24, 4, 3, '#5A626C')
const monsterHead = () => monsterFace() + r(24, 5, 12, 6, '#14141A') + r(71, 5, 12, 6, '#14141A') + r(27, 6, 3, 3, '#F7F5F0') + r(74, 6, 3, 3, '#F7F5F0')
const monsterLimit = () => monsterFace() + crossEyes(4, '#14141A', '#F7F5F0', [23, 71])
const monsterBody = () =>
  // green skin all over, a torn dark jacket hanging open at the sides, a stitched seam down the middle and scars
  r(11, 34, 85, 32, FRANK) + r(11, 34, 85, 3, '#659A52') + r(90, 36, 6, 30, '#659A52') +
  r(11, 34, 20, 26, '#2B2F3A') + r(76, 34, 20, 26, '#2B2F3A') + r(11, 56, 6, 4, FRANK) + r(23, 58, 6, 3, FRANK) + r(80, 57, 6, 4, FRANK) + r(89, 59, 6, 2, FRANK) +
  r(52, 38, 1.4, 22, FRANK_DARK) + [41, 46, 51, 56].map((y) => r(49, y, 7, 1.2, FRANK_DARK)).join('') +
  r(38, 44, 9, 1.2, FRANK_DARK) + r(60, 50, 9, 1.2, FRANK_DARK) + [40, 43, 46].map((x) => r(x, 42, 1.2, 5, FRANK_DARK)).join('') +
  r(11, 62, 85, 4, '#2B2F3A') + [14, 24, 38, 50, 64, 78, 88].map((x, i) => r(x, 65, 5, 2 + (i % 2) * 2, '#2B2F3A')).join('')
const monsterHand = (side) => handCover(side, FRANK) + r(side === 'left' ? 9 : 94, 26, 1.4, 12, FRANK_DARK)

const WOLF = '#6B5B4B'
const werewolfFace = () =>
  // pointed ears, a shaggy mane down both sides, and a long grey muzzle with a black nose and a flash of fangs
  r(20, -25, 4, 4, WOLF) + r(18, -21, 8, 5, WOLF) + r(16, -16, 12, 8, WOLF) + r(83, -25, 4, 4, WOLF) + r(81, -21, 8, 5, WOLF) + r(79, -16, 12, 8, WOLF) + r(21, -20, 3, 8, '#B08A7A') + r(83, -20, 3, 8, '#B08A7A') +
  r(16, -6, 75, 10, WOLF) + r(8, -2, 14, 36, WOLF) + r(85, -2, 14, 36, WOLF) + r(4, 20, 8, 14, '#52453A') + r(95, 20, 8, 14, '#52453A') +
  r(36, 2, 35, 8, WOLF) + r(35, 10, 37, 17, '#9A8672') + r(38, 25, 31, 6, '#9A8672') + r(49, 12, 9, 5, '#14121C') + r(51, 17, 5, 2, '#14121C') +
  r(38, 24, 31, 2, '#14121C') + r(40, 26, 4, 5, '#F7F5F0') + r(63, 26, 4, 5, '#F7F5F0') + r(8, 6, 14, 1.4, '#52453A') + r(85, 12, 14, 1.4, '#52453A')
const werewolfHead = () => werewolfFace() + r(22, 2, 13, 8, '#F2C94C') + r(72, 2, 13, 8, '#F2C94C') + r(27, 2, 3, 8, '#14121C') + r(77, 2, 3, 8, '#14121C')
const werewolfLimit = () => werewolfFace() + crossEyes(1, '#F2C94C', '#14121C', [22, 72])
const werewolfBody = () =>
  r(11, 34, 85, 32, WOLF) + [38, 46, 54, 61].map((y, i) => r(14 + (i % 2) * 4, y, 24, 1.4, '#52453A') + r(60 + (i % 2) * 6, y + 2, 24, 1.4, '#52453A')).join('') +
  r(22, 34, 26, 12, '#B3433F') + r(24, 34, 6, 18, '#B3433F') + r(41, 34, 5, 24, '#B3433F') + r(26, 52, 1.4, 6, '#B3433F') +
  r(60, 40, 2, 11, '#F7F5F0', ' fill-opacity=".5"') + r(65, 40, 2, 11, '#F7F5F0', ' fill-opacity=".5"') + r(70, 40, 2, 11, '#F7F5F0', ' fill-opacity=".5"')

const ZOMBIE = '#9DB38A'
const ZOMBIE_DARK = '#4E5E48'
const zombieFace = () =>
  // grey-green skin, patchy hair, a wound on the head, sunken eyes, and an open mouth with a drip of blood
  r(17, -2, 73, 35, ZOMBIE) + r(87, -2, 3, 35, '#7F9670') + r(19, 12, 15, 2.4, ZOMBIE_DARK) + r(73, 12, 15, 2.4, ZOMBIE_DARK) +
  r(22, -9, 16, 7, '#4A3A2A') + r(26, -12, 8, 4, '#4A3A2A') + r(50, -7, 11, 6, '#4A3A2A') + r(72, -8, 14, 7, '#4A3A2A') + r(8, 2, 9, 12, '#4A3A2A') + r(90, 4, 8, 10, '#4A3A2A') +
  r(60, -2, 11, 5, '#8E2A2A') + r(62, 3, 4, 6, '#8E2A2A') + r(65, -1, 3, 2, '#C0584E') +
  r(34, 21, 40, 9, '#3A1414') + [37, 44, 51, 58, 65].map((x, i) => r(x, 21, 4, 3 + (i % 2), '#E8E2C8')).join('') + [40, 54, 62].map((x) => r(x, 27, 4, 3, '#E8E2C8')).join('') +
  r(46, 30, 3, 9, '#A01E1E') + r(47, 38, 1, 2, '#A01E1E') + r(18, 20, 8, 1.4, ZOMBIE_DARK) + r(82, 17, 8, 1.4, ZOMBIE_DARK)
const zombieHead = () => zombieFace() + r(22, 3, 13, 8, '#E8E6C8') + r(72, 3, 13, 8, '#E8E6C8') + r(27, 5, 4, 4, '#3A3A2A') + r(81, 4, 3, 4, '#3A3A2A')
const zombieLimit = () => zombieFace() + crossEyes(3, '#E8E6C8', '#3A3A2A', [22, 72])
const zombieBody = () =>
  // a torn, stained grey shirt with the green-grey skin showing through the holes
  r(11, 34, 85, 32, ZOMBIE) + r(11, 34, 85, 30, '#6F7A86') + r(30, 34, 47, 5, '#5A6470') +
  r(20, 42, 12, 9, ZOMBIE) + r(64, 48, 14, 10, ZOMBIE) + r(40, 56, 9, 6, ZOMBIE) + r(22, 44, 1.4, 7, ZOMBIE_DARK) + r(66, 50, 1.4, 8, ZOMBIE_DARK) +
  r(46, 40, 10, 8, '#8E2A2A') + r(50, 47, 3, 8, '#8E2A2A') + r(14, 56, 8, 4, '#8E2A2A', ' fill-opacity=".8"') +
  [11, 20, 31, 44, 58, 70, 83].map((x, i) => r(x, 62, 9, 4 + (i % 3) * 2, '#6F7A86')).join('')
const zombieHand = (side) => handCover(side, ZOMBIE) + r(side === 'left' ? 4 : 90, 33, 10, 1.4, '#8E2A2A')

const pirateHat = () =>
  // a black tricorn with gold trim and a white skull-and-crossbones
  r(2, -6, 103, 7, '#14121C') + r(2, -6, 103, 1.5, '#D9A441') + r(16, -18, 75, 13, '#14121C') + r(26, -24, 55, 7, '#14121C') + r(36, -28, 35, 5, '#14121C') +
  r(4, -10, 14, 6, '#14121C') + r(89, -10, 14, 6, '#14121C') + r(16, -7, 75, 1.4, '#D9A441') +
  r(47, -22, 13, 9, '#F5F2EA') + r(49, -20, 3, 3, '#14121C') + r(55, -20, 3, 3, '#14121C') + r(52, -16, 3, 2, '#14121C') + r(49, -12, 9, 2, '#F5F2EA') +
  r(40, -12, 8, 1.6, '#F5F2EA') + r(60, -12, 8, 1.6, '#F5F2EA')
const pirateFace = () =>
  // an eyepatch over one eye with its strap, a gold earring and a bit of stubble
  r(20, 0, 17, 12, '#14121C') + r(8, 2, 13, 1.6, '#14121C') + r(36, 0, 50, 1.6, '#14121C') + r(94, 13, 4, 4, '#F2C230') + r(95, 14, 2, 2, '#D9A441') +
  [28, 34, 40, 46, 52, 58, 64, 70, 76].map((x, i) => r(x, 28 + (i % 2) * 2, 2, 2, '#5A3A22')).join('')
const pirateHead = () => pirateHat() + pirateFace()
const pirateBody = () =>
  // a striped shirt, an open black vest, a red sash with a gold buckle
  r(11, 34, 85, 32, '#F1ECE0') + [36, 43, 50, 57, 64].map((y) => r(11, y, 85, 3, '#2F4A8A')).join('') +
  r(11, 34, 22, 22, '#1B1B22') + r(74, 34, 22, 22, '#1B1B22') + [38, 45, 52].map((y) => r(14, y, 3, 2, '#D9A441') + r(79, y, 3, 2, '#D9A441')).join('') +
  r(11, 54, 85, 7, '#B3261E') + r(11, 54, 85, 1.2, '#D6504A') + r(47, 53, 13, 9, '#D9A441') + r(50, 56, 7, 3, '#B3261E') + r(70, 61, 5, 8, '#B3261E')
const cutlass = () =>
  // the blade points up out of his hand, with a gold guard and a brown grip
  r(11, -8, 4, 30, '#C9CED6') + r(11, -8, 1.4, 30, '#EEF1F5') + r(12, -12, 2, 4, '#C9CED6') + r(4, 22, 18, 3, '#D9A441') + r(11, 25, 4, 9, '#5A3A22') + r(10, 34, 6, 3, '#D9A441')

const KHAKI = '#B8A878'
const KHAKI_DARK = '#9A8C60'
const ghostbusterHead = () =>
  // goggles pushed up onto his forehead: orange lenses in a dark frame on a strap
  r(13, -8, 81, 3, '#2A2A32') + r(20, -7, 25, 11, '#2A2A32') + r(62, -7, 25, 11, '#2A2A32') + r(23, -5, 19, 7, '#F2A93B') + r(65, -5, 19, 7, '#F2A93B') +
  r(25, -4, 6, 2, '#FFD27A') + r(67, -4, 6, 2, '#FFD27A') + r(45, -4, 17, 3, '#2A2A32')
const ghostbusterBody = () =>
  // a khaki jumpsuit with a black belt, shoulder straps, and the no-ghost badge on the chest
  r(11, 34, 85, 32, KHAKI) + r(11, 34, 85, 3, KHAKI_DARK) + r(30, 34, 47, 5, KHAKI_DARK) + r(18, 34, 6, 22, '#2A2A32') + r(83, 34, 6, 22, '#2A2A32') +
  r(11, 55, 85, 5, '#2A2A32') + r(48, 54, 11, 7, '#9AA0A8') + r(51, 56, 5, 3, '#2A2A32') + r(34, 40, 1.2, 14, KHAKI_DARK) + r(72, 40, 1.2, 14, KHAKI_DARK) +
  // the badge: a red ring with a slash across a little black ghost
  r(60, 38, 14, 14, '#D8283A') + r(58, 40, 18, 10, '#D8283A') + r(62, 40, 10, 10, '#F7F5F0') + r(60, 42, 14, 6, '#F7F5F0') +
  r(64, 42, 6, 6, '#14121C') + r(65, 41, 4, 2, '#14121C') + r(64, 48, 2, 2, '#14121C') + r(68, 48, 2, 2, '#14121C') + r(65, 44, 1.5, 1.5, '#F7F5F0') + r(68, 44, 1.5, 1.5, '#F7F5F0') +
  [[60, 39], [62, 41], [64, 43], [66, 45], [68, 47], [70, 49]].map(([x, y]) => r(x, y, 3, 3, '#D8283A')).join('')
const protonWand = () =>
  r(8, 0, 8, 22, '#5A5E66') + r(8, 0, 2, 22, '#7C818A') + r(6, -6, 12, 7, '#2A2A32') + r(10, 22, 4, 12, '#2A2A32') + r(8, 8, 8, 3, '#D8283A') +
  pulse(r(7, -14, 10, 8, '#F28A2E') + r(9, -20, 6, 6, '#FFD27A'), '.35;1;.35', 0.5)

const HALLOWEEN_COSTUMES = {
  witch: { name: 'Witch', alarmX: 20, head: witchHat(), body: '', scene: ['bats'] },
  ghost: { name: 'Ghost', head: ghostSheet(), body: ghostBody(), scene: ['bats'] },
  pumpkin: { name: 'Pumpkin', head: pumpkinTop(), body: pumpkinBody(), scene: ['leaves'] },
  vampire: { name: 'Vampire', head: vampireHair(), body: vampireCape(), scene: ['night', 'bats'] },
  mummy: { name: 'Mummy', head: mummyHead(), limitHead: mummyLimit(), body: mummyBody(), scene: ['night'] },
  skeleton: { name: 'Skeleton', head: skeletonHead(), limitHead: skeletonLimit(), body: skeletonBody(), scene: ['night', 'bats'] },
  frankenstein: { name: "Frankenstein's Monster", head: monsterHead(), limitHead: monsterLimit(), body: monsterBody(), sleeve: monsterHand, scene: ['storm'] },
  werewolf: { name: 'Werewolf', head: werewolfHead(), limitHead: werewolfLimit(), body: werewolfBody(), scene: ['night', 'bats'] },
  zombie: { name: 'Zombie', head: zombieHead(), limitHead: zombieLimit(), body: zombieBody(), sleeve: zombieHand, scene: ['fog'] },
  pirate: { name: 'Pirate', head: pirateHead(), body: pirateBody(), props: `<g transform="translate(104 -10)">${cutlass()}</g>`, scene: ['clouds'] },
  ghostbuster: { name: 'Ghostbuster', head: ghostbusterHead(), body: ghostbusterBody(), sleeve: (side) => r(side === 'left' ? 0 : 85, 21, 22, 12, KHAKI) + r(side === 'left' ? 0 : 85, 31, 22, 2, KHAKI_DARK), props: `<g transform="translate(104 -2)">${protonWand()}</g>`, scene: ['slimer'] },
}
// October 21 to 31 each have their own costume, ending on the pumpkin for Halloween night; any other day (a manual choice) is the witch
export const COSTUME_BY_DAY = { 21: 'witch', 22: 'ghost', 23: 'pirate', 24: 'mummy', 25: 'skeleton', 26: 'zombie', 27: 'vampire', 28: 'frankenstein', 29: 'ghostbuster', 30: 'werewolf', 31: 'pumpkin' }
const costumeToday = () => {
  const today = new Date(Date.now())
  return HALLOWEEN_COSTUMES[(today.getMonth() === 9 && COSTUME_BY_DAY[today.getDate()]) || 'witch']
}
const halloweenCostume = (id) => ({ name: `Halloween: ${HALLOWEEN_COSTUMES[id].name}`, date: 'Oct 21 to Oct 31', props: '', ...HALLOWEEN_COSTUMES[id] })

// ---- Festival du Voyageur: a red wool tuque with a tassel, a blue capote coat with a woven sash, and a canoe paddle ----
const VOY_RED = '#C42240'
const voyageurTuque = () =>
  r(22, -2, 63, 5, '#F7F5F0') + [24, 31, 38, 45, 52, 59, 66, 73].map((x, i) => r(x, -1, 3, 3, i % 2 ? '#2F6FD0' : '#F2C230')).join('') +
  r(26, -12, 55, 11, VOY_RED) + r(32, -17, 43, 6, VOY_RED) + r(40, -20, 27, 4, VOY_RED) + r(50, -27, 8, 8, '#F7F5F0') + r(51, -28.5, 6, 2, '#F7F5F0') +
  r(76, -16, 6, 24, VOY_RED) + r(75, 6, 8, 7, '#F2C230') + r(77, 13, 1.4, 3, '#F2C230') + r(80, 13, 1.4, 3, '#F2C230')
const voyageurBody = () =>
  r(11, 34, 85, 32, '#5B7DB5') + r(11, 34, 85, 3, '#3C5A9C') + r(34, 34, 39, 7, '#3C5A9C') + r(52, 41, 3, 3, '#F2C230') + r(52, 46, 3, 3, '#F2C230') +
  r(11, 54, 85, 9, VOY_RED) + Array.from({ length: 14 }, (_, i) => r(13 + i * 6, 55, 3, 3, '#F7F5F0') + r(16 + i * 6, 58.5, 3, 3, '#2F6FD0')).join('') +
  r(82, 63, 3, 11, VOY_RED) + r(86, 63, 3, 11, '#F7F5F0') + r(90, 63, 3, 11, '#2F6FD0')
const paddle = () =>
  r(0, 0, 4, 64, '#A7743E') + r(-5, -14, 14, 30, '#B98040') + r(-5, -5, 14, 3, VOY_RED) + r(-5, 1, 14, 3, '#2F6FD0') + r(-5, 7, 14, 3, '#F2C230') + r(1.2, -14, 1.6, 30, '#8F6030')

// ---- Terry Fox Run: a red headband, a white tee with a red heart ----
const TF_RED = '#D52B1E'
const foxHeadband = () => r(22, -2, 63, 5, TF_RED) + r(22, -2, 63, 1.2, '#F0584A') + r(83, 0, 6, 9, TF_RED) + r(87, 3, 5, 11, TF_RED)
const foxShirt = () =>
  r(13, 34, 81, 32, '#F7F5F0') + r(41, 34, 25, 3.5, TF_RED) + r(13, 34, 4, 32, '#E4E0D6', ' fill-opacity=".6"') + r(90, 34, 4, 32, '#E4E0D6', ' fill-opacity=".6"') + heart(43, 41, 3, TF_RED) + r(13, 62, 81, 4, '#E4E0D6', ' fill-opacity=".7"')

// ---- April Fools' Day: a jester hat with bells, a red clown nose, a ruffled collar and a rubber chicken ----
const jesterHat = () =>
  r(22, -2, 63, 4, '#F2C230') +
  r(22, -12, 15, 10, '#7B3FA0') + r(14, -18, 12, 8, '#7B3FA0') + r(7, -17, 9, 7, '#7B3FA0') + r(4, -13, 6, 6, '#F2C230') +
  r(44, -16, 19, 14, '#E23A4E') + r(48, -24, 11, 10, '#E23A4E') + r(51, -31, 6, 8, '#E23A4E') + r(50, -36, 7, 6, '#F2C230') +
  r(71, -12, 15, 10, '#2F8FE0') + r(82, -18, 12, 8, '#2F8FE0') + r(91, -17, 9, 7, '#2F8FE0') + r(97, -13, 6, 6, '#F2C230') +
  r(37, -10, 8, 8, '#F2C230') + r(63, -10, 8, 8, '#F2C230') + r(40, -8, 2.5, 2.5, '#7B3FA0') + r(66, -8, 2.5, 2.5, '#E23A4E') +
  r(49, 22, 10, 10, '#E23A4E') + r(50, 21, 8, 12, '#E23A4E') + r(51.5, 23, 3, 3, '#FF9AA5')
const jesterBody = () =>
  [22, 31, 40, 49, 58, 67, 76].map((x, i) => r(x, 38, 9, 7, ['#E23A4E', '#F2C230', '#2F8FE0'][i % 3]) + r(x + 2, 45, 5, 3, ['#E23A4E', '#F2C230', '#2F8FE0'][i % 3])).join('') +
  r(22, 36, 63, 2, '#F7F5F0')
const rubberChicken = () =>
  loop(
    r(2, 44, 2, 20, '#F2A93A') + r(8, 44, 2, 20, '#F2A93A') + r(-1, 62, 6, 2, '#F2A93A') + r(7, 62, 6, 2, '#F2A93A') +
      r(-3, 28, 16, 17, '#F2D13A') + r(-6, 32, 6, 8, '#F2D13A') + r(11, 32, 6, 8, '#F2D13A') + r(0, 18, 10, 12, '#F2D13A') + r(8, 22, 8, 3, '#F28A2E') +
      r(3, 14, 4, 5, '#E23A4E') + r(7, 15, 3, 4, '#E23A4E') + r(5, 22, 2, 2, '#14121C'),
    'rotate',
    '-8 5 40;8 5 40;-8 5 40',
    1.8,
  )

// ---- Movember: a big handlebar moustache and a blue awareness ribbon ----
const moustache = () => {
  const BROWN = '#4A2A12'
  // the right half as [x, y, width, height]; the left half is its mirror image around his middle (x 53.5)
  // (his eyes end at y 22, so the curled tips stop at y 26)
  const half = [[55.5, 30, 12, 7], [65.5, 32, 10, 5], [73.5, 30, 5, 5], [76, 27, 4, 5]]
  return r(46, 28, 15, 8, BROWN) + r(48, 34, 11, 3, BROWN) + r(47, 27, 13, 1.5, '#6B4426') + half.map(([x, y, w, h]) => r(x, y, w, h, BROWN) + r(107 - x - w, y, w, h, BROWN)).join('')
}
const movemberRibbon = () =>
  r(36, 42, 8, 8, '#2F8FE0') + r(46, 42, 8, 8, '#2F8FE0') + r(40, 48, 10, 6, '#1F6FC0') + r(38, 54, 5, 9, '#2F8FE0') + r(47, 54, 5, 9, '#2F8FE0') + r(38, 44, 3, 3, '#7FC0F2') + r(48, 44, 3, 3, '#7FC0F2')

// ---- Day of the Dead: a marigold crown, a painted sugar-skull face, a skeleton shirt, and a candle ----
const marigold = (x, y, size = 1) =>
  r(x + 2 * size, y, 4 * size, 2 * size, '#F28A2E') + r(x + 2 * size, y + 6 * size, 4 * size, 2 * size, '#F28A2E') + r(x, y + 2 * size, 2 * size, 4 * size, '#F28A2E') + r(x + 6 * size, y + 2 * size, 2 * size, 4 * size, '#F28A2E') +
  r(x + 1 * size, y + 1 * size, 6 * size, 6 * size, '#FFB534') + r(x + 3 * size, y + 3 * size, 2 * size, 2 * size, '#E8700F')
const dotdCrown = () =>
  r(14, -3, 79, 5, '#2E7D3A') + marigold(10, -12, 1.5) + marigold(24, -17, 1.3) + marigold(40, -20, 1.5) + marigold(56, -19, 1.4) + marigold(72, -17, 1.3) + marigold(86, -12, 1.5) +
  r(34, -8, 5, 5, '#F25C8B') + r(66, -8, 5, 5, '#8A5CC8') + r(50, -9, 5, 5, '#2FB5C8')
const SOCKET = '#3A2060'
// The painted sugar-skull face: white, with deep purple sockets (the dark colour is drawn under his own eyes, so they still show, blink and glance),
// petals around the eyes and cheeks, a heart-shaped nose and a stitched smile
const sugarSkullFace = () => {
  const W = '#F7F5F0'
  const ring = '#14121C'
  const petals = (x0, mirror) => {
    const at = (dx, dy, w, h, fill) => r(mirror ? 107 - (x0 + dx) - w : x0 + dx, dy, w, h, fill)
    return at(-6, 9, 3, 3, '#F25C8B') + at(-6, 14, 3, 3, '#8A5CC8') + at(-6, 19, 3, 3, '#2FB5C8') + at(3, 28, 4, 3, '#F25C8B') + at(9, 29, 4, 3, '#F28A2E') + at(15, 28, 4, 3, '#2FB5C8') +
      at(-1, 4, 3, 2, '#F28A2E') + at(5, 3, 3, 2, '#F25C8B') + at(12, 3, 3, 2, '#2FB5C8') + at(19, 4, 3, 2, '#8A5CC8')
  }
  return (
    // the white face, in pieces so the eye holes stay clear
    r(11, 1, 85, 7, W) + r(11, 8, 7, 17, W) + r(35, 8, 37, 17, W) + r(89, 8, 7, 17, W) + r(11, 25, 85, 14, W) +
    // thick dark rings around the sockets, with a thin purple line inside
    r(16, 5, 22, 3, ring) + r(16, 25, 22, 3, ring) + r(16, 5, 3, 23, ring) + r(35, 5, 3, 23, ring) + r(69, 5, 22, 3, ring) + r(69, 25, 22, 3, ring) + r(69, 5, 3, 23, ring) + r(88, 5, 3, 23, ring) +
    r(18, 8, 17, 1, '#7B4BB0') + r(72, 8, 17, 1, '#7B4BB0') +
    petals(18, false) + petals(18, true) +
    // forehead dots and cheek flowers
    [42, 46, 50, 54, 58, 62].map((x, i) => r(x, 2.5, 2, 2, ['#F25C8B', '#2FB5C8', '#F28A2E'][i % 3])).join('') + marigold(13, 29, 0.8) + marigold(88, 29, 0.8) +
    // a heart-shaped nose and a stitched smile with curled ends
    r(50, 26, 8, 2, ring) + r(51, 28, 6, 2, ring) + r(52, 30, 4, 2, ring) + r(53, 32, 2, 1, ring) +
    r(34, 35, 40, 2, ring) + r(31, 33, 3, 2, ring) + r(74, 33, 3, 2, ring) + [37, 42, 47, 52, 57, 62, 67, 72].map((x) => r(x, 32, 1.4, 9, ring)).join('') +
    r(46, 38.5, 15, 1.2, '#F25C8B') + r(49, 39.5, 9, 1.2, '#2FB5C8')
  )
}
const skeletonShirt = () =>
  // the dark sockets, then a black shirt with a rib cage, flower embroidery on the shoulders and a bright hem
  r(18, 8, 17, 17, SOCKET) + r(72, 8, 17, 17, SOCKET) +
  r(11, 40, 85, 25, '#1B1B22') + r(52.5, 41, 2, 24, '#F7F5F0') + [44, 50, 56, 62].map((y, i) => r(40 + i, y, 12, 2, '#F7F5F0') + r(55 - i, y, 12, 2, '#F7F5F0')).join('') +
  r(36, 41, 16, 2, '#F7F5F0') + r(55, 41, 16, 2, '#F7F5F0') + r(11, 62, 85, 3, '#F28A2E') + [14, 24, 34, 64, 74, 84].map((x, i) => r(x, 62.5, 4, 2, i % 2 ? '#F25C8B' : '#2FB5C8')).join('') +
  marigold(12, 42, 0.8) + marigold(86, 42, 0.8)
const candle = () =>
  r(0, 26, 14, 34, '#F2A33A', ' fill-opacity=".55"') + r(0, 26, 14, 2, '#FFD27A') + r(3, 30, 8, 28, '#FFF3C8') + r(6, 26, 2, 5, '#6B4F3A') + r(1, 58, 12, 3, '#C98A4B') +
  pulse(r(5, 14, 4, 10, '#F7A33A') + r(6, 17, 2, 6, '#FFE27A'), '.6;1;.7;1;.6', 0.8)

// ---- National Day for Truth and Reconciliation (Orange Shirt Day): a plain orange shirt with a heart ----
const orangeShirt = () =>
  r(13, 34, 81, 32, '#F28A2E') + r(41, 34, 25, 4, '#D96F1A') + r(13, 34, 81, 2.5, '#D96F1A') + r(13, 34, 4, 32, '#D96F1A', ' fill-opacity=".5"') + r(90, 34, 4, 32, '#D96F1A', ' fill-opacity=".5"') +
  heart(43, 44, 3, '#F7F5F0')

// ---- Boxing Day: red boxing gloves, a championship belt and a sports headband ----
const glove = (x) =>
  r(x, 19, 24, 29, '#D8283A') + r(x + 3, 16, 18, 4, '#D8283A') + r(x + 2, 21, 5, 18, '#F0584A') + r(x + (x < 40 ? 19 : -1), 33, 6, 14, '#F7F5F0') + r(x + 8, 24, 3, 3, '#F0584A', ' fill-opacity=".7"')
const boxingHeadband = () => r(22, -2, 63, 5, '#D8283A') + r(22, 0, 63, 1.2, '#F7F5F0') + r(48, -4, 11, 8, '#E8B93C') + r(50, -2, 7, 4, '#D8283A')
const championBelt = () =>
  r(11, 50, 85, 10, '#3A2E1E') + r(11, 50, 85, 1.5, '#5B4630') + r(40, 47, 27, 16, '#E8B93C') + r(43, 50, 21, 10, '#F5D060') + r(48, 52, 11, 6, '#D8283A') + r(52, 53, 3, 4, '#F5D060') +
  [16, 24, 76, 84].map((x) => r(x, 53, 4, 4, '#E8B93C')).join('')

// ---- Veterans Day (US): an olive garrison cap, a jacket with a rack of service ribbons, and the American flag ----
const OLIVE = '#5B6B3A'
const garrisonCap = () =>
  r(24, -4, 59, 5, '#3F4B27') + r(28, -13, 51, 10, OLIVE) + r(34, -17, 39, 5, OLIVE) + r(28, -4, 51, 2, '#E8B93C') + r(30, -11, 4, 4, '#E8B93C') + r(32, -9, 4, 2, '#F7F5F0')
const veteranJacket = () =>
  r(11, 34, 85, 32, OLIVE) + r(11, 34, 85, 3, '#3F4B27') + r(42, 34, 23, 12, '#F7F5F0') + r(50, 40, 7, 26, '#B02A37') + r(26, 34, 4, 32, '#3F4B27', ' fill-opacity=".5"') + r(77, 34, 4, 32, '#3F4B27', ' fill-opacity=".5"') +
  // a rack of service ribbons over the heart: three rows of red, white and blue bars
  [['#C8283A', '#F7F5F0', '#2F4F9C'], ['#2F4F9C', '#C8283A', '#E8B93C'], ['#F7F5F0', '#2F4F9C', '#C8283A']].map((row, j) => row.map((fill, i) => r(68 + i * 5, 42 + j * 4, 4.5, 3.5, fill)).join('')).join('') + r(17, 56, 12, 6, '#E8B93C') + r(19, 58, 8, 2, '#3F4B27')

// ---- US Thanksgiving: a fan of turkey feathers, a cosy cream sweater, and a roast turkey on a platter ----
const turkeyFeathers = () => {
  const colours = ['#8A4B22', '#C8372D', '#E0883A', '#F2C230', '#E0883A', '#C8372D', '#8A4B22']
  return colours.map((fill, i) => {
    const angle = (i - 3) * 22
    return `<g transform="rotate(${angle} 53.5 2)">${r(50, -42, 7, 40, fill)}${r(51.5, -42, 4, 6, '#F7F5F0', ' fill-opacity=".5"')}</g>`
  }).join('') + r(30, -6, 47, 8, '#8A4B22') + r(36, -10, 35, 6, '#8A4B22') + r(49, 24, 4, 11, '#C8372D') + r(54, 24, 4, 8, '#C8372D')
}
const creamSweater = () =>
  r(11, 34, 85, 32, '#E8D8B8') + r(11, 34, 85, 3, '#C9B48A') + r(42, 34, 23, 5, '#C9B48A') + [40, 47, 54, 61].map((y) => r(11, y, 85, 1.5, '#D7C49D')).join('') +
  [18, 30, 42, 54, 66, 78].map((x, i) => r(x, 43 + (i % 2) * 6, 5, 5, '#C8372D', ' fill-opacity=".8"')).join('')
const turkeyPlatter = () =>
  r(-14, 42, 46, 3, '#E8E4DA') + r(-12, 45, 42, 2, '#C9C4B8') +
  r(-8, 30, 34, 13, '#B5652D') + r(-4, 26, 26, 6, '#C97A3A') + r(-2, 28, 22, 2, '#E0A060') + r(-12, 36, 6, 8, '#B5652D') + r(26, 36, 6, 8, '#B5652D') + r(-14, 38, 4, 4, '#F7F5F0') + r(30, 38, 4, 4, '#F7F5F0') +
  pulse(r(0, 14, 2, 9, '#E8E4DA', ' fill-opacity=".6"') + r(9, 10, 2, 11, '#E8E4DA', ' fill-opacity=".5"') + r(17, 15, 2, 8, '#E8E4DA', ' fill-opacity=".6"'), '.25;.85;.25', 2.4)

// ---- Your anniversary (the date you set with /krab anniversary): a dapper top hat with a red rose, a tuxedo with a rose buttonhole, and a bunch of red roses; he is in love ----
const RED_ROSE = '#D8283A'
const DEEP_ROSE = '#A81A2A'
const anniversaryHat = () =>
  r(4, -4, 99, 5, '#14121C') + r(28, -31, 51, 27, '#14121C') + r(31, -34, 45, 4, '#14121C') + r(28, -10, 51, 5, RED_ROSE) + r(28, -10, 51, 1, '#F0584A') +
  bloomRose(60, -17, 11, RED_ROSE, DEEP_ROSE) + r(55, -9, 6, 3, LEAF_DARK) + r(71, -9, 6, 3, LEAF_DARK) + r(57, -12, 4, 2, LEAF)
const tuxedo = () =>
  r(11, 34, 85, 32, '#1B1B22') + r(40, 34, 27, 32, '#F7F5F0') + r(33, 34, 8, 26, '#2C2C36') + r(66, 34, 8, 26, '#2C2C36') + r(50, 34, 7, 6, '#1B1B22') +
  [48, 56].map((y) => r(52, y, 3, 3, '#E8B93C')).join('') + bloomRose(68, 42, 9, RED_ROSE, DEEP_ROSE) + r(66, 50, 5, 2.5, LEAF_DARK)
const redBouquet = () =>
  loop(
    r(2, 18, 2, 18, '#3E8E41') + r(-4, 19, 2, 17, '#3E8E41') + r(8, 19, 2, 17, '#3E8E41') +
      bloomRose(-9, 5, 11, RED_ROSE, DEEP_ROSE) + bloomRose(0, 0, 12, '#E23A4E', DEEP_ROSE) + bloomRose(9, 6, 11, RED_ROSE, DEEP_ROSE) + r(-3, 14, 5, 3, LEAF) + r(8, 15, 5, 3, LEAF) +
      r(-9, 34, 22, 12, '#F7F5F0') + r(-9, 34, 22, 2, RED_ROSE) + r(-5, 44, 14, 6, '#F4C6D0'),
    'rotate',
    '-3 3 44;3 3 44;-3 3 44',
    2.8,
  )

// ---- Your girlfriend's birthday (the date you set with /krab gf-birthday): a sparkling tiara, a pink top with a ruffled collar and sparkles, and a bunch of balloons; he is in love ----
const tiara = () => {
  const spark = (x, y, begin) => pulse(r(x, y, 2.2, 2.2, '#FFFFFF') + r(x + 0.7, y - 1.5, 0.8, 5.2, '#FFF6C8') + r(x - 1.5, y + 0.7, 5.2, 0.8, '#FFF6C8'), '0;1;0', 1.0, begin)
  return (
    r(26, -3, 55, 4.5, '#E8B93C') + r(26, -3, 55, 1, '#F5D060') + r(30, -9, 3.5, 7, '#E8B93C') + r(40, -14, 3.5, 12, '#E8B93C') + r(51.75, -20, 4.5, 18, '#E8B93C') + r(63.5, -14, 3.5, 12, '#E8B93C') + r(73.5, -9, 3.5, 7, '#E8B93C') +
    r(52.5, -12, 3, 3, '#F25C8B') + r(52.5, -6, 3, 3, '#B58CE0') + r(40.5, -16.5, 2.5, 2.5, '#B58CE0') + r(64, -16.5, 2.5, 2.5, '#B58CE0') + r(30.5, -11, 2.5, 2.5, '#F25C8B') + r(74, -11, 2.5, 2.5, '#F25C8B') +
    spark(46, -22, 0) + spark(60, -24, 0.4) + spark(34, -15, 0.7) + spark(72, -17, 0.2)
  )
}
const pinkTop = () =>
  r(11, 34, 85, 32, '#F7A8C8') + r(11, 34, 85, 2, '#E589B0') + [12, 20, 28, 36, 44, 52, 60, 68, 76, 84].map((x) => r(x, 35, 8, 5, '#FFFFFF') + r(x + 1.5, 39, 5, 2, '#FFFFFF')).join('') +
  [[20, 46], [34, 54], [70, 48], [84, 56], [52, 50], [26, 60]].map(([x, y], i) => pulse(r(x, y, 2.2, 2.2, '#FFFFFF') + r(x + 0.7, y - 1.5, 0.8, 5.2, '#FFFFFF') + r(x - 1.5, y + 0.7, 5.2, 0.8, '#FFFFFF'), '.3;1;.3', 1.4, i * 0.25)).join('')
const giftBalloons = (colours = [['#F25C8B', '#FFD0DE'], ['#B58CE0', '#EAD9FA'], ['#F5D060', '#FFF3B8']]) => {
  // three balloons fanned out above his hand, their strings gathered into one little knot in his grip (the hand is at about x -17..5, y 43..66 here)
  const KNOT = [2.5, 50]
  const body = (x, y, fill, shine) => r(x + 1, y, 8, 2, fill) + r(x, y + 2, 10, 10, fill) + r(x + 1, y + 12, 8, 2, fill) + r(x + 4, y + 14, 3, 2, fill) + r(x + 2, y + 2, 2, 4, shine, ' fill-opacity=".7"')
  const string = (x, y) => `<path d="M${x + 5.5} ${y + 16} L${KNOT[0]} ${KNOT[1]}" stroke="#E8E4DA" stroke-width="0.9" fill="none"/>`
  const balloons = [[-13, -24], [-3, -36], [8, -26]].map(([x, y], i) => [x, y, ...colours[i]])
  return loop(balloons.map(([x, y]) => string(x, y)).join('') + balloons.map(([x, y, f, sh]) => body(x, y, f, sh)).join('') + r(0, 48, 5, 5, '#E8E4DA'), 'rotate', `-2 ${KNOT[0]} ${KNOT[1]};2 ${KNOT[0]} ${KNOT[1]};-2 ${KNOT[0]} ${KNOT[1]}`, 2.6)
}

// ---- Friday the 13th: a hockey mask, white with red chevron markings, cracks and air holes (his own eyes show through the eye holes), and a tattered shirt ----
const MASK = '#E9E5D8'
const MASK_SHADE = '#CFC9B8'
const MASK_RED = '#B02A2A'
const MASK_HOLE = '#14121C'
const hockeyMask = () => {
  const chevron = (x) => r(x, 29, 12, 2, MASK_RED) + r(x + 2, 31, 8, 2, MASK_RED) + r(x + 4, 33, 4, 2, MASK_RED)
  return (
    // the mask, in pieces so the eye holes stay clear, narrowing down to the chin
    r(11, 0, 85, 8, MASK) + r(11, 8, 7, 17, MASK) + r(35, 8, 37, 17, MASK) + r(89, 8, 7, 17, MASK) + r(11, 25, 85, 10, MASK) + r(14, 35, 79, 5, MASK) + r(22, 40, 63, 4, MASK) + r(34, 44, 39, 2, MASK_SHADE) +
    // shading down the right side and a rim round the eye holes
    r(89, 8, 7, 27, MASK_SHADE) + r(17, 7, 20, 1.5, MASK_SHADE) + r(17, 25, 20, 1.5, MASK_SHADE) + r(70, 7, 20, 1.5, MASK_SHADE) + r(70, 25, 20, 1.5, MASK_SHADE) +
    // the red markings: a chevron on the forehead and one on each cheek
    r(46, 1, 15, 2, MASK_RED) + r(48, 3, 11, 2, MASK_RED) + r(50, 5, 7, 2, MASK_RED) + chevron(19) + chevron(76) +
    // air holes: round ones on the cheeks, a row across the mouth and a triangle at the nose
    [[14, 27], [14, 32], [91, 27]].map(([x, y]) => r(x, y, 2.5, 2.5, MASK_HOLE)).join('') + [37, 43, 49, 55, 61, 67].map((x) => r(x, 37, 3, 3, MASK_HOLE)).join('') +
    r(51, 26, 5, 2, MASK_HOLE) + r(52, 28, 3, 2, MASK_HOLE) +
    // scuffs and cracks
    r(28, 2, 1, 5, MASK_SHADE) + r(30, 6, 3, 1, MASK_SHADE) + r(70, 3, 1, 4, MASK_SHADE) + r(38, 30, 1, 5, MASK_SHADE) + r(40, 33, 3, 1, MASK_SHADE)
  )
}
const tatteredShirt = () =>
  r(11, 34, 85, 32, '#4A5A3E') + r(11, 34, 85, 3, '#38452E') + r(42, 34, 23, 6, '#38452E') +
  [[18, 48, 8, 3], [60, 44, 10, 3], [30, 58, 6, 3], [76, 54, 9, 3]].map(([x, y, w, h]) => r(x, y, w, h, '#2E3A25')).join('') +
  [11, 20, 29, 38, 47, 56, 65, 74, 83].map((x, i) => r(x, 62, 9, 3 + (i % 3) * 2, '#4A5A3E')).join('')

// ---- World Cup: a red and white striped fan hat, a red jersey with the tournament year, and the golden trophy ----
const WC_RED = '#D8283A'
const fanHat = () =>
  Array.from({ length: 7 }, (_, i) => r(32 + i * 6.2, -31, 6.2, 27, i % 2 ? '#F7F5F0' : WC_RED)).join('') + r(32, -34, 43, 4, WC_RED) + r(22, -4, 63, 5, WC_RED) + r(22, -4, 63, 1, '#F0584A') + r(32, -9, 43, 3, '#1B1B22')
const wcJersey = () =>
  r(11, 34, 85, 32, WC_RED) + r(11, 34, 85, 3, '#A81A2A') + r(42, 34, 23, 5, '#F7F5F0') + r(11, 56, 85, 3, '#F7F5F0') + r(11, 59, 85, 1, '#A81A2A') +
  digitsSvg(String(worldCupYear(new Date(Date.now()))).slice(-2), 44.5, 43, 2.2, '#F7F5F0')
const wcTrophy = () => {
  const glint = pulse(r(-5, 24, 2, 2, '#FFFFFF') + r(7, 30, 2, 2, '#FFFFFF'), '0;1;0', 1.4)
  return (
    r(-6, 58, 16, 3, '#1E8A4C') + r(-4, 55, 12, 3, '#E8B93C') + r(-3, 40, 10, 15, '#E8B93C') + r(-5, 34, 14, 7, '#F5D060') +
    r(-8, 21, 20, 14, '#F5D060') + r(-8, 21, 6, 14, '#FFE9A0', ' fill-opacity=".6"') + r(1.5, 21, 1.2, 14, '#C99A2A') + r(-6, 19, 16, 3, '#F5D060') +
    r(-10, 34, 5, 11, '#E8B93C') + r(10, 34, 5, 11, '#E8B93C') + glint
  )
}

// ---- GTA VI release day (Vice City style): a pink cap, mirrored sunglasses, a palm print shirt with a gold chain, and a game controller ----
const gtaCap = () =>
  r(24, -9, 59, 10, '#FF5FA8') + r(30, -14, 47, 6, '#FF5FA8') + r(38, -17, 31, 4, '#FF5FA8') + r(22, -1, 63, 3, '#D8387F') + r(46, -8, 15, 5, '#2AC4C0') + r(50, -7, 7, 3, '#FFE45E')
const gtaShades = () =>
  r(15, 7, 24, 19, '#C23AA8') + r(68, 7, 24, 19, '#C23AA8') + r(17, 9, 20, 15, '#1B1030') + r(70, 9, 20, 15, '#1B1030') + r(39, 12, 29, 3, '#C23AA8') +
  r(19, 11, 7, 3, '#FF9AD8') + r(72, 11, 7, 3, '#FF9AD8') + r(27, 17, 3, 2, '#2AC4C0', ' fill-opacity=".8"') + r(80, 17, 3, 2, '#2AC4C0', ' fill-opacity=".8"')
const gtaShirt = () =>
  r(11, 34, 85, 32, '#2AC4C0') + r(11, 34, 85, 3, '#1B9A98') + r(42, 34, 23, 9, '#DD775B') + r(36, 34, 7, 10, '#1B9A98') + r(64, 34, 7, 10, '#1B9A98') +
  [[16, 46], [28, 54], [72, 44], [82, 54], [56, 56], [20, 60]].map(([x, y], i) => r(x, y, 6, 4, '#FF5FA8') + r(x + 1.5, y - 1.5, 3, 3, i % 2 ? '#FFE45E' : '#FF9A55')).join('') +
  [[34, 50], [64, 50], [46, 60]].map(([x, y]) => r(x, y, 8, 3, '#1B7A55') + r(x + 2, y - 2, 4, 2, '#1B7A55')).join('') +
  r(45, 39, 17, 1.6, '#E8B93C') + r(51, 41, 5, 5, '#E8B93C') + r(52.5, 42.5, 2, 2, '#FFE9A0')
const gtaController = () =>
  // a light game controller, wider than his hand so it reads as one: two grips, a d-pad, four coloured buttons, two sticks and a glowing light bar
  r(-6, 45, 34, 13, '#E4E5EE') + r(-9, 51, 11, 14, '#E4E5EE') + r(23, 51, 11, 14, '#E4E5EE') + r(-9, 63, 11, 2, '#B9BAC8') + r(23, 63, 11, 2, '#B9BAC8') + r(-6, 45, 34, 1.4, '#FFFFFF') +
  r(9, 46, 8, 9, '#2A2540') + r(12, 46, 2.4, 7, '#FF5FA8') +
  r(-2, 49, 2.4, 7, '#2A2540') + r(-4.3, 51.3, 7, 2.4, '#2A2540') +
  r(20, 48, 2.6, 2.6, '#4ADE80') + r(23.5, 51, 2.6, 2.6, '#FF5F6E') + r(20, 54, 2.6, 2.6, '#4F8DF2') + r(16.5, 51, 2.6, 2.6, '#FF9AD8') +
  r(0, 58, 6, 6, '#2A2540') + r(1.5, 59.5, 3, 3, '#6A6590') + r(19, 58, 6, 6, '#2A2540') + r(20.5, 59.5, 3, 3, '#6A6590')

// ---- Super Bowl Sunday: a navy football helmet, a jersey with the game number, and a big foam finger ----
const footballHelmet = (shell, stripe) =>
  r(11, -12, 85, 20, shell) + r(18, -17, 71, 6, shell) + r(8, 8, 10, 24, shell) + r(89, 8, 10, 24, shell) + r(49, -17, 9, 25, stripe) + r(8, 12, 8, 3, stripe) + r(91, 12, 8, 3, stripe) +
  // the face mask: bars across and down in front of his mouth (the eyes stay clear)
  r(14, 27, 79, 2, '#CFCFD6') + r(14, 35, 79, 2, '#CFCFD6') + [24, 40, 53, 66, 83].map((x) => r(x, 27, 2, 12, '#CFCFD6')).join('')
const sbJersey = () =>
  r(11, 34, 85, 32, '#1B2A66') + r(11, 34, 85, 3, '#F2C230') + r(42, 34, 23, 5, '#F7F5F0') + r(11, 54, 85, 2, '#F2C230') + r(11, 57, 85, 2, '#F2C230') +
  digitsSvg(String(superBowlNumber(new Date(Date.now()))), 44.5, 42, 2.2, '#F7F5F0')
const foamFinger = () =>
  // a big orange foam hand: a puffy palm, three folded fingers, a thumb, a thick pointing finger with a round tip, a white cuff, and a white "1"
  r(-14, 36, 30, 26, '#F2603A') + r(-12, 34, 26, 4, '#FF7D55') + r(-18, 40, 7, 8, '#F2603A') + r(-18, 49, 7, 8, '#F2603A') + r(-18, 58, 7, 6, '#F2603A') +
  r(16, 44, 10, 11, '#F2603A') + r(18, 42, 7, 3, '#FF7D55') +
  r(-4, 2, 16, 36, '#F2603A') + r(-2, -2, 12, 5, '#F2603A') + r(0, -4, 8, 3, '#FF7D55') + r(-3, 4, 4, 32, '#FF8A66', ' fill-opacity=".7"') + r(9, 4, 3, 32, '#D94A24') +
  r(-14, 58, 30, 3, '#D94A24') + r(-12, 61, 26, 6, '#F7F5F0') + r(-12, 61, 26, 1.5, '#E4E0D6') +
  r(-18, 47, 7, 1.2, '#D94A24') + r(-18, 56, 7, 1.2, '#D94A24') + digitsSvg('1', -3.5, 42, 3.4, '#F7F5F0')

// ---- Grey Cup Sunday: a blue and gold helmet and jersey (blue and gold), and the silver Grey Cup ----
const greyCupBody = () =>
  r(11, 34, 85, 32, '#0A2A66') + r(11, 34, 85, 3, '#F2C230') + r(42, 34, 23, 5, '#F7F5F0') + r(11, 50, 85, 4, '#F2C230') + r(11, 56, 85, 2, '#F2C230') + digitsSvg('10', 44.5, 40, 1.8, '#F7F5F0')
const greyCup = () =>
  r(-8, 58, 18, 4, '#3A3F4A') + r(-6, 54, 14, 5, '#9AA3AF') + r(-3, 42, 8, 13, '#D9DEE6') + r(-8, 22, 18, 21, '#D9DEE6') + r(-8, 22, 5, 21, '#FFFFFF', ' fill-opacity=".6"') + r(5, 22, 5, 21, '#9AA3AF') +
  r(-11, 24, 3, 12, '#D9DEE6') + r(10, 24, 3, 12, '#D9DEE6') + r(-8, 20, 18, 3, '#9AA3AF')

// ---- The Games: an olive wreath, a white tracksuit with a gold star, a gold medal, and the torch ----
const wreath = () =>
  r(10, -4, 87, 5, '#4D8F3E') +
  [12, 21, 30, 39, 48, 57, 66, 75, 84, 92].map((x, i) => r(x, -9 + (i % 2) * 2, 6, 3.5, i % 3 === 0 ? '#D7B13B' : '#7BB661') + r(x + 1, -6 + (i % 2) * 2, 5, 2, '#4D8F3E')).join('') +
  r(11, 0, 4, 22, '#4D8F3E') + r(92, 0, 4, 22, '#4D8F3E') + [3, 9, 15].map((y) => r(7, y, 5, 3, '#7BB661') + r(95, y, 5, 3, '#7BB661')).join('')
const tracksuit = () =>
  r(11, 34, 85, 32, '#F7F5F0') + r(11, 34, 85, 3, '#E4E0D6') + r(52.5, 37, 2, 29, '#E4E0D6') + r(11, 34, 5, 32, '#0085C7') + r(91, 34, 5, 32, '#DF0024') +
  // a gold star on the chest (our own badge, not any official emblem)
  r(37, 44, 18, 4, '#F4C300') + r(44, 39, 4, 14, '#F4C300') + r(41, 42, 10, 8, '#F4C300') + r(39, 50, 4, 3, '#F4C300') + r(49, 50, 4, 3, '#F4C300') +
  r(46, 34, 2, 7, '#DF0024') + r(59, 34, 2, 7, '#0085C7') + r(49, 56, 10, 9, '#E8B93C') + r(50.5, 57.5, 7, 6, '#F5D060') + r(52, 59, 4, 3, '#C99A2A')
const olympicTorch = () =>
  r(0, 8, 4, 54, '#C99A2A') + r(-4, 2, 12, 8, '#E8B93C') + r(-5, 0, 14, 3, '#F5D060') + r(-2, 10, 1.4, 50, '#F5D060', ' fill-opacity=".7"') +
  loop(r(-3, -20, 10, 20, '#F28A2E') + r(-1, -26, 6, 10, '#F7A33A') + r(0, -16, 4, 14, '#FFE27A') + r(1, -31, 2, 7, '#F7A33A'), 'scale', '1 1;1.12 1.08;1 1', 0.5)

// ---- Extreme cold: a fur trapper hat with icicles, a big puffy parka, and frosty breath ----
const FUR = '#D5CBBE'
const trapperHat = () => {
  const puff = (x, y, size, begin) => pulse(r(x, y, size, size, '#EAF8FF', ' fill-opacity=".85"'), '0;.9;0', 2.2, begin)
  return (
    r(16, -14, 75, 14, '#7C6E62') + r(24, -19, 59, 6, '#7C6E62') + r(10, -3, 87, 8, FUR) + r(6, 5, 13, 25, FUR) + r(88, 5, 13, 25, FUR) + r(6, 28, 13, 3, '#B8AC9C') + r(88, 28, 13, 3, '#B8AC9C') +
    [38, 46, 54, 62].map((x, i) => r(x, 5, 2.2, 5 + (i % 2) * 3, '#CFEFFF') + r(x + 0.5, 10 + (i % 2) * 3, 1.2, 2.4, '#EAF8FF')).join('') +
    puff(57, 32, 4, 0) + puff(62, 28, 5.5, 0.55) + puff(69, 23, 7, 1.1)
  )
}
const parkaBody = () =>
  r(11, 34, 85, 32, '#2F5FA8') + [44, 54].map((y) => r(11, y, 85, 2, '#244B87')).join('') + r(30, 34, 47, 9, FUR) + r(28, 40, 51, 3, '#B8AC9C') + r(52.5, 42, 2, 24, '#C9C4B8') +
  [[18, 38], [76, 46], [28, 58], [84, 60], [64, 40]].map(([x, y]) => r(x, y, 2, 2, '#EAF8FF')).join('')

// ---- A heat wave: a sweatband, shades and sweat drops, a tank top, and a hand fan ----
const heatBand = () => r(22, -2, 63, 5, '#F7F5F0') + r(22, -2, 63, 1.4, '#D8283A') + r(22, 1.6, 63, 1.4, '#D8283A')
// Each drop pops out, runs down and fades on its own odd-length cycle, so they never fall in step
const sweat = () =>
  [[88, 6, 3.1, 0.2], [96, 15, 4.3, 1.7], [12, 8, 3.7, 0.9], [18, 19, 5.3, 2.6], [53, 3, 4.7, 1.3], [34, 5, 3.3, 2.2], [74, 4, 5.9, 0.4], [8, 24, 4.1, 3.1]]
    .map(([x, y, dur, begin]) =>
      `<g>${r(x, y, 2.6, 4, '#6FC8F2') + r(x + 0.4, y - 1.6, 1.6, 2, '#6FC8F2')}` +
      `<animateTransform attributeName="transform" type="translate" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="0 0;0 0;0 11" keyTimes="0;.15;1"/>` +
      `<animate attributeName="opacity" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;.1;.5;.8;1"/></g>`
    ).join('')
// Mirrored aviators: gold frames, lenses fading from orange to pink, with a glint sliding across
const aviators = () => {
  const lens = (x) => r(x, 7, 22, 14, '#C9A13A') + r(x + 2, 9, 18, 5, '#FF8A3D') + r(x + 2, 14, 18, 5, '#F2577E') + r(x + 4, 19, 14, 2, '#C9A13A')
  const glint = (x) => `<g>${r(x + 4, 10, 3, 3, '#FFFFFF')}<animateTransform attributeName="transform" type="translate" dur="2.6s" repeatCount="indefinite" values="0 0;12 4;12 4" keyTimes="0;.3;1"/><animate attributeName="opacity" dur="2.6s" repeatCount="indefinite" values="0;1;0;0" keyTimes="0;.15;.3;1"/></g>`
  return lens(15) + lens(69) + r(37, 10, 32, 2.6, '#C9A13A') + r(9, 10, 6, 2.6, '#C9A13A') + r(91, 10, 6, 2.6, '#C9A13A') + glint(15) + glint(69)
}
// Flushed cheeks, glowing on and off in the heat
const flush = () => pulse(r(13, 24, 12, 5, '#F25C5C', ' fill-opacity=".7"') + r(82, 24, 12, 5, '#F25C5C', ' fill-opacity=".7"'), '.4;.9;.4', 1.6)
// Lots of sweat: drops all over him, plus beads flying off his head
const heavySweat = () => sweat() + [[26, -2, 2.9, 0.5], [64, -3, 3.5, 1.4], [92, 30, 3.2, 0.1], [14, 34, 4.4, 2.0], [44, 30, 3.8, 0.7], [70, 32, 4.9, 2.4]]
  .map(([x, y, dur, begin]) =>
    `<g>${r(x, y, 2.6, 4, '#6FC8F2') + r(x + 0.4, y - 1.6, 1.6, 2, '#6FC8F2')}` +
    `<animateTransform attributeName="transform" type="translate" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="0 0;0 0;0 14" keyTimes="0;.15;1"/>` +
    `<animate attributeName="opacity" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;.1;.5;.8;1"/></g>`
  ).join('')
// Swim shorts: bright red with a white stripe down each side and a drawstring
const swimShorts = () =>
  r(11, 50, 85, 15, '#E23A4E') + r(11, 50, 85, 2.5, '#B82A3C') + r(14, 52, 4, 13, '#F7F5F0') + r(89, 52, 4, 13, '#F7F5F0') + r(51, 52, 2, 6, '#F7F5F0') + r(55, 52, 2, 5, '#F7F5F0') +
  [[28, 57], [40, 60], [66, 56], [76, 60]].map(([x, y]) => r(x, y, 4, 2, '#FFD23F')).join('')
const heatHead = () => sunglasses() + flush() + heavySweat()
// A bright tank top with a big sun on the front, and damp sweat patches
const heatTank = () =>
  r(11, 34, 85, 32, '#2FB5C8') + r(40, 34, 27, 8, '#E2654A') + r(36, 34, 5, 12, '#2499AA') + r(66, 34, 5, 12, '#2499AA') +
  r(46, 46, 15, 12, '#FFC93C') + r(48, 48, 11, 8, '#FFE58A') + [[52, 42], [52, 60], [41, 50], [63, 50]].map(([x, y]) => r(x, y, 3, 3, '#FFC93C')).join('') +
  [[16, 56, 9, 6], [82, 54, 8, 7]].map(([x, y, w, h]) => r(x, y, w, h, '#2499AA')).join('')
// A popsicle melting in his hand: drips run down the stick and fall
const popsicle = () => {
  const drip = (x, begin) => `<g>${r(x, 34, 2.4, 3, '#FF6B6B')}<animateTransform attributeName="transform" type="translate" dur="1.8s" begin="${begin}s" repeatCount="indefinite" values="0 0;0 4;0 26" keyTimes="0;.4;1"/><animate attributeName="opacity" dur="1.8s" begin="${begin}s" repeatCount="indefinite" values="0;1;1;0" keyTimes="0;.1;.8;1"/></g>`
  return r(4, 32, 4, 22, '#D9B27C') + r(-3, 6, 18, 28, '#FF6B6B') + r(-3, 6, 18, 8, '#FF9F43') + r(-3, 14, 18, 9, '#FFD166') + r(-1, 8, 3, 18, '#FFFFFF', ' fill-opacity=".35"') +
    r(-3, 30, 4, 5, '#FF6B6B') + r(9, 31, 4, 4, '#FF6B6B') + drip(-2, 0) + drip(11, 0.9)
}
const handFan = () =>
  r(0, 40, 3.2, 26, '#C99A2A') +
  loop([-54, -36, -18, 0, 18, 36, 54].map((a, i) => `<g transform="rotate(${a} 1.6 42)">${r(-2, 8, 7.2, 34, i % 2 ? '#F7F5F0' : '#D8283A')}</g>`).join(''), 'rotate', '-9 1.6 42;9 1.6 42;-9 1.6 42', 0.55)

// ---- A blizzard: a pulled-down toque and a scarf wrapped over his nose and mouth, in a heavy coat ----
const blizzardHead = () =>
  r(12, -14, 83, 18, '#C8372D') + r(18, -19, 71, 6, '#C8372D') + r(12, -5, 83, 3, '#F7F5F0') + r(48, -29, 12, 12, '#F7F5F0') + [24, 40, 70, 84].map((x) => r(x, -12, 2, 2, '#F7F5F0')).join('') +
  // the scarf, over his lower face, with one end blowing in the wind
  r(11, 28, 85, 13, '#2F6FA8') + r(11, 32, 85, 2, '#F7F5F0') + r(11, 37, 85, 2, '#F7F5F0') + loop(r(86, 38, 9, 22, '#2F6FA8') + r(86, 43, 9, 2, '#F7F5F0') + r(86, 52, 9, 2, '#F7F5F0'), 'rotate', '-7 90 38;9 90 38;-7 90 38', 0.7)
const blizzardCoat = () => r(11, 34, 85, 32, '#5A6475') + r(11, 34, 85, 4, '#444D5D') + r(52.5, 40, 2, 26, '#8A93A3') + [[20, 44, 6, 3], [70, 52, 8, 3], [34, 60, 6, 3]].map(([x, y, w, h]) => r(x, y, w, h, '#F7F5F0', ' fill-opacity=".8"')).join('')

// ---- Black Friday: a black cap with a price tag hanging off it, a black hoodie with a big sale patch, and an armful of shopping bags ----
const saleCap = () =>
  r(24, -10, 59, 11, '#14121C') + r(30, -15, 47, 6, '#14121C') + r(22, -1, 63, 4, '#D8283A')
const saleHoodie = () =>
  r(11, 34, 85, 32, '#1B1B22') + r(11, 34, 85, 3, '#2C2C36') + r(30, 34, 47, 5, '#0F0E14') +
  // a red banner across the chest with a gold starburst on it, strings and a pocket below
  r(11, 41, 85, 13, '#D8283A') + r(11, 41, 85, 1.5, '#F0584A') + r(11, 52.5, 85, 1.5, '#9C1626') +
  digitsSvg('-70%', 12, 44.8, 1.6, '#FFFFFF') +
  r(40, 38, 26, 20, '#F2C230') + r(37, 43, 32, 10, '#F2C230') + r(43, 36, 20, 24, '#F2C230') + r(42, 41, 22, 14, '#FFE27A') +
  digitsSvg('50%', 44.5, 45.4, 1.9, '#D8283A') +
  r(30, 58, 47, 1.4, '#2C2C36') +
  pulse(star(70, 36, 0.7, '#FFE27A') + star(30, 57, 0.6, '#FFFFFF'), '.2;1;.2', 1.1)
const shoppingBags = () => {
  const bag = (x, y, w, h, fill, stripe, logo) =>
    r(x, y, w, h, fill) + r(x, y, w, 3, stripe) + r(x + w * 0.5 - 4, y - 7, 1.4, 8, '#E8E4DA') + r(x + w * 0.5 + 3, y - 7, 1.4, 8, '#E8E4DA') + r(x + w * 0.5 - 4, y - 8, 8.4, 1.4, '#E8E4DA') +
    r(x + w * 0.5 - 3, y + h * 0.45, 6, 6, logo) + r(x + w * 0.5 - 1.5, y + h * 0.45 + 1.5, 3, 3, fill)
  return loop(
    bag(-12, 44, 19, 24, '#D8283A', '#F7F5F0', '#F7F5F0') + bag(3, 49, 17, 19, '#1B1B22', '#F2C230', '#F2C230') + bag(-27, 52, 15, 16, '#F2C230', '#D8283A', '#D8283A') + r(-3, 40, 8, 3, '#E8E4DA') +
    pulse(star(-4, 32, 0.8, '#FFE27A') + star(16, 41, 0.6, '#FFFFFF'), '.1;1;.1', 1.3),
    'rotate', '-3 0 42;3 0 42;-3 0 42', 2.2)
}

// ---- Cyber Monday: a plain black hoodie with the hood up and the white Anonymous mask, and a laptop showing a sale ----
const HOOD = '#0B0B10'
const hoodShell = () =>
  r(8, -14, 91, 14, HOOD) + r(14, -20, 79, 7, HOOD) + r(24, -24, 59, 5, HOOD) + r(8, -2, 9, 36, HOOD) + r(90, -2, 9, 36, HOOD) + r(8, 30, 5, 10, '#2C2C36') + r(94, 30, 5, 10, '#2C2C36')
const maskFace = () =>
  r(17, -2, 73, 35, '#F4F1EA') + r(21, 32, 65, 2, '#F4F1EA') + r(17, -2, 3, 35, '#D9D4C8') + r(87, -2, 3, 35, '#D9D4C8') +
  // rosy cheeks, thin eyebrows, a curled moustache, a thin smile and a pointed goatee
  r(24, 13, 10, 5, '#E0584E') + r(73, 13, 10, 5, '#E0584E') +
  r(22, -1, 6, 2, '#1B1B22') + r(28, -2.5, 10, 2, '#1B1B22') + r(69, -2.5, 10, 2, '#1B1B22') + r(79, -1, 6, 2, '#1B1B22') +
  r(36, 15, 36, 3, '#1B1B22') + r(31, 12.5, 6, 3, '#1B1B22') + r(71, 12.5, 6, 3, '#1B1B22') +
  r(40, 21, 28, 2, '#1B1B22') + r(37, 19, 3, 2, '#1B1B22') + r(68, 19, 3, 2, '#1B1B22') +
  r(50, 25, 8, 4, '#1B1B22') + r(52, 29, 4, 4, '#1B1B22')
const maskEyes = () => r(24, 3, 13, 5, '#14141A') + r(70, 3, 13, 5, '#14141A')
// dizzy: a block X in each eye slit
const maskXEyes = () => [24, 70].map((x) => r(x, 3, 13, 5, '#14141A') + [[2, 3.5], [5, 4.6], [8, 3.5]].map(([dx, y]) => r(x + dx, y, 3, 2, '#F4F1EA')).join('')).join('')
const cyberHead = () => hoodShell() + maskFace() + maskEyes()
const cyberHoodie = () =>
  r(11, 34, 85, 32, HOOD) + r(11, 34, 85, 3, '#1A1A22') + r(30, 34, 47, 6, '#050508') + r(53, 40, 1.2, 26, '#1F1F28') +
  r(41, 40, 1.6, 10, '#C9C4B8') + r(64, 40, 1.6, 10, '#C9C4B8') + r(30, 52, 47, 12, '#14141A') + r(30, 52, 47, 1.2, '#22222C') + r(24, 58, 6, 1.2, '#22222C')
const laptop = () =>
  r(-14, 30, 32, 22, '#1B1B22') + r(-12, 32, 28, 18, '#0E0E12') + digitsSvg('50%', -7, 35, 2.2, '#F4F1EA') + r(-9, 44.5, 22, 1.4, '#8A8A94') +
  r(-18, 52, 40, 5, '#9AA3AF') + r(-18, 52, 40, 1.2, '#CFD4DC') + r(-2, 54, 8, 1.6, '#6B7280')


// ---- Your boyfriend's birthday (the date you set with /krab bf-birthday): a gold crown, a navy shirt with a bow tie, blue balloons; he is in love ----
const birthdayCrown = () =>
  r(28, -4, 51, 5, '#E8B93C') + r(28, -4, 51, 1.2, '#F5D060') + [28, 40, 52, 64, 74].map((x) => r(x, -14, 5, 10, '#E8B93C') + r(x + 1, -17, 3, 3, '#E8B93C')).join('') +
  r(53, -9, 3, 3, '#3A7BE0') + r(41, -8, 3, 3, '#E23A4E') + r(65, -8, 3, 3, '#E23A4E')
const bowTieShirt = () =>
  r(11, 34, 85, 32, '#24335C') + r(11, 34, 85, 2, '#1A2646') + r(40, 34, 27, 8, '#F7F5F0') + r(52, 42, 3, 24, '#1A2646') +
  r(44, 36, 8, 7, '#3A7BE0') + r(55, 36, 8, 7, '#3A7BE0') + r(51, 37, 5, 5, '#2A5FB8') + [48, 56].map((y) => r(52.5, y, 2, 2, '#F7F5F0')).join('')
const blueBalloons = () => giftBalloons([['#3A7BE0', '#B9D2FA'], ['#2FB5C8', '#C8F0F5'], ['#F5D060', '#FFF3B8']])

// ---- Programmers' Day (the 256th day of the year): headphones, a dark hoodie with 256 on it, and a laptop with a blinking prompt ----
const headphones = () =>
  r(16, -10, 75, 5, '#2A2A30') + r(12, -6, 6, 8, '#2A2A30') + r(89, -6, 6, 8, '#2A2A30') + r(4, 4, 12, 20, '#2A2A30') + r(91, 4, 12, 20, '#2A2A30') +
  r(6, 7, 8, 14, '#5BE37D', ' fill-opacity=".85"') + r(93, 7, 8, 14, '#5BE37D', ' fill-opacity=".85"')
const devHoodie = () =>
  r(11, 34, 85, 32, '#20232B') + r(11, 34, 85, 2.5, '#2E323D') + r(36, 34, 4, 12, '#2E323D') + r(67, 34, 4, 12, '#2E323D') + r(41, 60, 25, 6, '#2E323D') +
  digitsSvg('256', 40, 42, 2.4, '#5BE37D')
const devLaptop = () =>
  r(-8, 24, 30, 20, '#3A3A40') + r(-6, 26, 26, 16, '#101318') + r(-4, 29, 3, 2, '#5BE37D') + r(-1, 31, 3, 2, '#5BE37D') + r(-4, 33, 3, 2, '#5BE37D') +
  pulse(r(2, 33, 5, 2, '#5BE37D'), '1;1;0;0', 1.0) + r(-10, 44, 34, 3, '#9AA0A6')

// ---- Diwali: a saffron kurta with a gold collar, a garland of marigolds, and a little clay lamp (a diya) burning in his hand ----
const kurta = () =>
  r(11, 34, 85, 32, '#E8892A') + r(11, 34, 85, 2, '#C96F1A') + r(46, 34, 15, 26, '#F2C230') + r(48, 36, 11, 22, '#E8892A') +
  [38, 44, 50, 56].map((y) => r(52, y, 3, 3, '#F2C230')).join('') + [[18, 46], [84, 46], [24, 58], [78, 58]].map(([x, y]) => r(x, y, 5, 5, '#F2C230') + r(x + 1.5, y + 1.5, 2, 2, '#C8102E')).join('')
const marigoldGarland = () => [16, 26, 36, 46, 56, 66, 76, 86].map((x, i) => r(x, 30 + (i % 2) * 2, 7, 6, i % 2 ? '#F28A2E' : '#F5C23A') + r(x + 2, 32 + (i % 2) * 2, 3, 2, '#C96F1A')).join('')
const diya = () =>
  r(-8, 38, 24, 6, '#B5652D') + r(-6, 44, 20, 3, '#8A4A22') + r(-4, 36, 16, 3, '#C97A3A') + r(-8, 38, 24, 1.5, '#D99050') +
  pulse(r(2, 24, 5, 12, '#F7A33A') + r(3, 28, 3, 8, '#FFE27A'), '.7;1;.8;1;.7', 0.7)

// ---- Hanukkah: a blue and white sweater, a spinning dreidel in his hand, and a menorah beside him with one more candle lit each night ----
const hanukkahSweater = () =>
  r(11, 34, 85, 32, '#2A5FB8') + r(11, 34, 85, 3, '#F7F5F0') + r(11, 62, 85, 4, '#F7F5F0') +
  [14, 26, 38, 50, 62, 74, 86].map((x) => r(x, 40, 5, 5, '#F7F5F0') + r(x + 1.5, 46, 2, 2, '#BBD3F5')).join('') + [20, 44, 68].map((x) => r(x, 52, 14, 3, '#BBD3F5')).join('')
const dreidel = () =>
  loop(r(5, 14, 2, 8, '#8A6A4F') + r(0, 22, 12, 12, '#3A7BE0') + r(2, 34, 8, 3, '#3A7BE0') + r(4, 37, 4, 3, '#3A7BE0') + r(3, 25, 6, 6, '#F7F5F0') + r(5, 26, 2, 4, '#3A7BE0'),
    'rotate', '-12 6 30;12 6 30;-12 6 30', 0.5)

// ---- Eid al-Fitr: an emerald vest with gold trim, and a lantern (a fanous) glowing in his hand ----
const eidVest = () =>
  r(11, 34, 85, 32, '#F7F5F0') + r(11, 34, 30, 32, '#1E7A54') + r(66, 34, 30, 32, '#1E7A54') + r(39, 34, 2, 32, '#E8B93C') + r(66, 34, 2, 32, '#E8B93C') +
  [[18, 42], [80, 42], [18, 54], [80, 54]].map(([x, y]) => r(x, y, 6, 6, '#E8B93C') + r(x + 2, y + 2, 2, 2, '#1E7A54')).join('')
const fanous = () =>
  loop(
    r(9, -8, 2, 8, '#6B4F3A') + r(4, 0, 12, 3, '#C9A13A') + r(2, 3, 16, 3, '#E8B93C') + r(1, 6, 18, 18, '#C9A13A') + r(3, 8, 14, 14, '#F5C23A') +
      pulse(r(5, 10, 10, 10, '#FFF3B0'), '.6;1;.6', 1.2) + r(9.2, 6, 1.6, 18, '#C9A13A') + r(1, 14, 18, 1.6, '#C9A13A') + r(3, 24, 14, 3, '#E8B93C') + r(6, 27, 8, 3, '#C9A13A'),
    'rotate', '-6 10 -8;6 10 -8;-6 10 -8', 2.8)

// ---- Hail: a frying pan worn upside down on his head like a helmet, and hailstones ping off it ----
const fryingPan = () => {
  const ping = (x, begin) => `<g>${r(x, -20, 3.5, 3.5, '#E8F4FF') + r(x + 0.6, -19.4, 1.4, 1.4, '#FFFFFF')}<animateTransform attributeName="transform" type="translate" dur="1.1s" begin="${begin}s" repeatCount="indefinite" values="0 -18;0 0;${x > 50 ? 8 : -8} -10;${x > 50 ? 12 : -12} 4" keyTimes="0;.4;.7;1"/><animate attributeName="opacity" dur="1.1s" begin="${begin}s" repeatCount="indefinite" values="1;1;1;0"/></g>`
  return r(8, -10, 91, 11, '#2B2B2E') + r(14, -14, 79, 5, '#3A3A3F') + r(20, -16, 67, 3, '#45454A') + r(10, -1, 87, 2, '#1B1B1E') + r(99, -7, 28, 5, '#6B4F3A') + r(124, -8, 5, 7, '#6B4F3A') +
    ping(30, 0) + ping(58, 0.55) + ping(44, 0.3)
}

// ---- An ice storm: a toque and scarf, and he slips and wobbles on the glaze ----
const iceToque = () => r(16, -14, 75, 15, '#3A6FB8') + r(22, -19, 63, 6, '#3A6FB8') + r(14, -2, 79, 5, '#F7F5F0') + r(48, -27, 11, 10, '#F7F5F0')
const iceScarf = () => r(11, 34, 85, 9, '#D8283A') + r(11, 37, 85, 2, '#F7F5F0') + r(70, 40, 10, 20, '#D8283A') + r(70, 50, 10, 2, '#F7F5F0')

// ---- A downpour: a yellow rain hood and coat, and an umbrella overhead ----
const rainHood = () => r(8, -12, 91, 14, '#F2C230') + r(4, -2, 12, 32, '#F2C230') + r(91, -2, 12, 32, '#F2C230') + r(8, -12, 91, 3, '#E0AE1C') + r(10, 26, 8, 5, '#E0AE1C') + r(89, 26, 8, 5, '#E0AE1C')
const rainCoat = () => r(11, 34, 85, 32, '#F2C230') + r(52, 34, 3, 32, '#C9971A') + [40, 50, 60].map((y) => r(57, y, 3, 3, '#3A3A37')).join('') + r(11, 34, 85, 3, '#E0AE1C')
const umbrella = () => {
  const canopy = [[-24, 0, 48, 4], [-20, -4, 40, 4], [-14, -8, 28, 4], [-6, -11, 12, 3]].map(([x, y, w, h]) => r(x, y, w, h, '#3A7BE0')).join('') + [-24, -8, 8, 24].map((x) => r(x, 4, 8, 2, '#2A5FB8')).join('')
  const drops = [-22, -2, 18].map((x, i) => `<g>${r(x, 6, 1.4, 4, '#8FB4E3')}<animateTransform attributeName="transform" type="translate" dur="0.7s" begin="${i * 0.23}s" repeatCount="indefinite" values="0 0;0 18"/><animate attributeName="opacity" dur="0.7s" begin="${i * 0.23}s" repeatCount="indefinite" values="1;0"/></g>`).join('')
  return loop(canopy + r(-1, -14, 2, 4, '#2A5FB8') + r(-1, 4, 2.4, 46, '#4A4A4F') + r(-4, 48, 4, 4, '#4A4A4F') + drops, 'rotate', '-4 0 50;4 0 50;-4 0 50', 2.4)
}

// ---- Wildfire smoke: a white face mask over his nose and mouth, with its straps ----
const smokeMask = () => r(28, 25, 51, 17, '#F2F2EE') + r(28, 25, 51, 2, '#DADAD4') + [29, 33, 37].map((y) => r(32, y, 43, 1.2, '#DADAD4')).join('') + r(11, 28, 17, 2, '#DADAD4') + r(79, 28, 17, 2, '#DADAD4') + r(50, 31, 7, 4, '#C9C6BC')

// ---- A strong sun (very high UV): a wide sun hat and a white smear of sunscreen across his nose ----
const sunHat = () => r(-2, -6, 111, 7, '#E8D3A0') + r(20, -22, 67, 17, '#E8D3A0') + r(20, -9, 67, 4, '#D8283A') + r(-2, -6, 111, 2, '#D9C08A')
const sunscreen = () => r(44, 22, 19, 5, '#FFFFFF') + r(46, 21, 6, 2, '#FFFFFF') + r(57, 26, 5, 2, '#F2F2EE')

// ---- Mexican Independence Day (El Grito, Sep 15 to 16): a black charro hat with silver trim, a charro jacket with a
// green, white and red sash across it, and the Mexican flag ----
const charroHat = () =>
  r(-6, -4, 119, 6, '#1B1B22') + r(-6, -4, 119, 1.2, '#C9CDD6') + r(-6, 1, 119, 1, '#C9CDD6') +
  r(32, -14, 43, 11, '#1B1B22') + r(37, -24, 33, 11, '#1B1B22') + r(42, -29, 23, 6, '#1B1B22') +
  r(32, -8, 43, 2.5, '#C9CDD6') + [36, 46, 56, 66].map((x) => r(x, -12.5, 3, 3, '#C9CDD6')).join('')
const charroJacket = () =>
  r(11, 34, 85, 32, '#1B1B22') + r(46, 34, 15, 32, '#F7F5F0') + r(51, 36, 5, 3, MX_RED) + r(49, 39, 9, 2, MX_RED) +
  [40, 47, 54, 61].map((y) => r(42, y, 2.5, 2.5, '#C9CDD6') + r(63, y, 2.5, 2.5, '#C9CDD6')).join('') +
  r(14, 37, 26, 2, '#C9CDD6') + r(67, 37, 26, 2, '#C9CDD6') +
  // the sash, from one shoulder down to the other side, in three stripes
  Array.from({ length: 12 }, (_, i) => r(16 + i * 6.5, 35 + i * 2.5, 7, 3, MX_GREEN) + r(16 + i * 6.5, 38 + i * 2.5, 7, 2.5, '#F7F5F0') + r(16 + i * 6.5, 40.5 + i * 2.5, 7, 3, MX_RED)).join('')

// ---- Holi, the festival of colours: a white kurta splashed with coloured powder, colour on his face, and a bowl of gulal ----
const HOLI = ['#E8338A', '#F7C21E', '#2EB872', '#3F8CE8', '#9B4FD6', '#F2622E']
const holiFace = () =>
  r(8, 2, 6, 5, HOLI[0]) + r(94, 26, 6, 5, HOLI[2]) + r(40, 0, 5, 3, HOLI[1]) + r(70, 28, 7, 4, HOLI[3]) + r(22, 27, 5, 4, HOLI[4]) + r(84, 0, 6, 4, HOLI[5])
const holiKurta = () =>
  r(11, 34, 85, 32, '#F7F5F0') + r(50, 34, 7, 18, '#E4E0D6') + [38, 42, 46].map((y) => r(52.5, y, 2, 2, '#C9A43A')).join('') +
  [[15, 38, 0], [28, 52, 1], [66, 40, 2], [80, 56, 3], [36, 60, 4], [72, 50, 5], [20, 62, 2], [86, 38, 0], [58, 58, 1]]
    .map(([x, y, c]) => r(x, y, 7, 5, HOLI[c]) + r(x + 2, y - 2, 3, 2, HOLI[c]) + r(x + 7, y + 2, 2, 2, HOLI[c])).join('')
const gulalBowl = () =>
  r(0, 30, 26, 4, '#B07A3A') + r(2, 34, 22, 6, '#9A6630') + r(5, 40, 16, 3, '#7E5226') +
  r(3, 25, 7, 6, HOLI[0]) + r(10, 23, 7, 8, HOLI[1]) + r(17, 25, 7, 6, HOLI[2]) +
  pulse(r(6, 14, 4, 4, HOLI[0]) + r(14, 10, 4, 4, HOLI[1]) + r(19, 16, 3, 3, HOLI[2]), '0;1;0', 1.6)

// ---- Nowruz, the Persian New Year at the spring equinox: a green vest with gold trim, and a dish of sabzeh (wheatgrass
// sprouts) tied with a red ribbon, from the haft-sin table ----
const nowruzVest = () =>
  r(11, 34, 85, 32, '#F7F5F0') + r(11, 34, 30, 32, '#2E7D5B') + r(66, 34, 30, 32, '#2E7D5B') +
  r(39, 34, 2, 32, '#D7B13B') + r(66, 34, 2, 32, '#D7B13B') + r(11, 64, 30, 2, '#D7B13B') + r(66, 64, 30, 2, '#D7B13B') +
  [42, 50, 58].map((y) => r(20, y, 4, 4, '#D7B13B') + r(83, y, 4, 4, '#D7B13B')).join('')
const sabzeh = () =>
  r(0, 34, 30, 4, '#E8E4DA') + r(2, 38, 26, 5, '#D6D1C4') + r(0, 32, 30, 3, '#C8372D') + r(13, 30, 4, 7, '#C8372D') +
  loop(Array.from({ length: 13 }, (_, i) => r(1 + i * 2.2, 14 + (i % 3) * 3, 1.4, 18 - (i % 3) * 3, i % 2 ? '#5DBB4A' : '#7BD15E')).join(''), 'skewX', '-4;4;-4', 3)

// ---- Juneteenth: a shirt with the Juneteenth flag's burst on it, and the flag in his hand ----
const J_BLUE = '#1F3F8F'
const J_RED = '#C8283A'
const juneteenthBurst = (x, y) =>
  r(x - 7, y - 1, 14, 2, '#F7F5F0') + r(x - 1, y - 7, 2, 14, '#F7F5F0') + r(x - 5, y - 5, 2, 2, '#F7F5F0') + r(x + 3, y - 5, 2, 2, '#F7F5F0') +
  r(x - 5, y + 3, 2, 2, '#F7F5F0') + r(x + 3, y + 3, 2, 2, '#F7F5F0') + r(x - 3, y - 3, 6, 6, '#F7F5F0')
const juneteenthShirt = () => r(11, 34, 85, 32, J_BLUE) + r(11, 52, 85, 14, J_RED) + r(11, 51, 85, 2, '#F7F5F0') + juneteenthBurst(53, 43)
const juneteenthFlag = () =>
  loop(r(0, 0, 3, 64, '#6B4F3A') + r(3, 0, 42, 13, J_BLUE) + r(3, 13, 42, 13, J_RED) + r(3, 12, 42, 2, '#F7F5F0') + juneteenthBurst(22, 11), 'rotate', '-2 0 64;2 0 64;-2 0 64', 3.4)

// ---- Oktoberfest: a green alpine hat with a feather, a checked shirt with lederhosen braces, and a big soft pretzel ----
const alpineHat = () =>
  r(8, -4, 91, 6, '#2F5A3A') + r(26, -16, 55, 13, '#2F5A3A') + r(32, -21, 43, 6, '#2F5A3A') + r(26, -7, 55, 3, '#8B5E3C') +
  r(76, -26, 3, 18, '#F7F5F0') + r(78, -30, 3, 10, '#B9B9B4') + r(72, -10, 6, 4, '#D7B13B')
const lederhosen = () =>
  r(11, 34, 85, 32, '#F7F5F0') + Array.from({ length: 8 }, (_, i) => r(11 + i * 11, 34, 5, 32, '#9CC3E6')).join('') + [38, 46, 54, 62].map((y) => r(11, y, 85, 2, '#9CC3E6')).join('') +
  r(24, 34, 7, 32, '#6B4A2E') + r(76, 34, 7, 32, '#6B4A2E') + r(24, 46, 59, 7, '#6B4A2E') + r(48, 47, 11, 5, '#B98A55') + r(52, 48, 3, 3, '#6B4A2E')
const pretzel = () =>
  r(4, 14, 6, 18, '#A8632A') + r(28, 14, 6, 18, '#A8632A') + r(8, 8, 22, 6, '#A8632A') + r(8, 32, 22, 6, '#A8632A') +
  r(14, 14, 4, 18, '#A8632A') + r(20, 14, 4, 18, '#A8632A') + r(16, 30, 6, 4, '#A8632A') +
  [[9, 10], [20, 9], [6, 22], [30, 20], [14, 34], [25, 34]].map(([x, y]) => r(x, y, 1.6, 1.6, '#F7F5F0')).join('')

// ---- Towel Day (May 25): a fluffy dressing gown, a striped towel over his shoulder (always know where your towel is),
// and a cup of tea, under a starry galaxy ----
const dressingGown = () =>
  r(11, 34, 85, 32, '#8C6B9E') + r(11, 34, 85, 2, '#A585B6') + r(46, 34, 15, 20, '#6E4F80') + r(11, 52, 85, 3, '#6E4F80') + r(78, 52, 4, 12, '#6E4F80') +
  // the towel over one shoulder, hanging down in front
  r(14, 34, 18, 32, '#F2C230') + [38, 46, 54, 62].map((y) => r(14, y, 18, 3, '#E8338A')).join('') + r(14, 64, 18, 2, '#F7F5F0')
const teacup = () =>
  r(2, 28, 20, 12, '#F7F5F0') + r(22, 30, 5, 2, '#F7F5F0') + r(25, 30, 2, 7, '#F7F5F0') + r(22, 35, 5, 2, '#F7F5F0') + r(0, 40, 24, 2, '#E4E0D6') + r(4, 29, 16, 3, '#8B5E3C') +
  pulse(r(7, 18, 2, 6, '#E8E4DA') + r(13, 14, 2, 8, '#E8E4DA'), '0;.8;0', 2.2)

export const OUTFITS = {
  parka: { name: 'Extreme Cold', date: 'When it feels -30 or colder', head: trapperHat(), body: parkaBody(), props: '', scene: ['frostedglass', 'icicles', 'frost'] },
  heatwave: { name: 'Heat Wave', date: 'When it feels 30 or hotter', skin: '#E86F55', wobble: true, head: heatHead(), limitHead: flush() + heavySweat(), body: swimShorts(), props: `<g transform="translate(108 -22)">${handFan()}</g>`, scene: ['scorcher', 'fire'] },
  hail: { name: 'Hail', date: 'When it hails (from the live weather)', head: fryingPan(), body: '', props: '', scene: ['storm', 'hail'] },
  icestorm: { name: 'Ice Storm', date: 'Freezing rain (from the live weather)', slip: true, head: iceToque(), body: iceScarf(), props: '', scene: ['raincloud', 'freezingrain'] },
  downpour: { name: 'Downpour', date: 'Heavy rain (from the live weather)', head: rainHood(), body: rainCoat(), props: `<g transform="translate(96 -30) rotate(-22 0 50) scale(1.35)">${umbrella()}</g>`, scene: ['storm', 'puddles'] },
  smoke: { name: 'Wildfire Smoke', date: 'When the air quality is unhealthy (from the live air quality)', head: smokeMask(), body: '', props: '', scene: ['smoke'] },
  sunscreen: { name: 'Strong Sun', date: 'A very high UV index on a sunny day (from the live weather)', head: sunHat() + sunscreen(), body: '', props: '', scene: ['sun'] },
  blizzard: { name: 'Blizzard', date: 'Snow with a strong wind', head: blizzardHead(), body: blizzardCoat(), props: '', scene: ['blizzard'] },
  blackfriday: { name: 'Black Friday', date: 'The day after US Thanksgiving', head: saleCap(), body: saleHoodie(), props: `<g transform="translate(108 -22)">${shoppingBags()}</g>`, scene: ['confetti-bf'] },
  cybermonday: { name: 'Cyber Monday', date: 'The Monday after US Thanksgiving', head: cyberHead(), limitHead: hoodShell() + maskFace() + maskXEyes(), body: cyberHoodie(), props: `<g transform="translate(108 -22)">${laptop()}</g>`, scene: ['binary'] },
  worldcup: { name: 'Football Fever', date: 'During the big international tournament', head: fanHat(), get body() { return wcJersey() }, props: `<g transform="translate(108 -22)">${wcTrophy()}</g>`, scene: ['confetti', 'fireworks'] },
  gta6: { name: 'Neon City Launch Day', date: 'Nov 19, 2026', head: gtaCap() + gtaShades(), limitHead: gtaCap() + r(15, 1, 24, 7, '#C23AA8') + r(68, 1, 24, 7, '#C23AA8') + r(39, 3, 29, 2, '#C23AA8') + r(17, 2, 20, 5, '#1B1030') + r(70, 2, 20, 5, '#1B1030'), body: gtaShirt(), props: `<g transform="translate(108 -20)">${gtaController()}</g>`, scene: ['vicecity'] },
  superbowl: { name: 'Big Game Sunday', date: '2nd Sunday of February', head: footballHelmet('#1B2A66', '#F2C230'), get body() { return sbJersey() }, props: `<g transform="translate(108 -22)">${foamFinger()}</g>`, scene: ['confetti', 'fireworks'] },
  greycup: { name: 'Football Final Sunday', date: '3rd Sunday of November', head: footballHelmet('#0A2A66', '#F2C230'), body: greyCupBody(), props: `<g transform="translate(108 -22)">${greyCup()}</g>`, scene: ['confetti-gold', 'leaves'] },
  olympics: { name: 'The Games', date: 'During the summer and winter Games', head: wreath(), body: tracksuit(), props: `<g transform="translate(108 -22)">${olympicTorch()}</g>`, scene: ['confetti', 'fireworks'] },
  friday13: { name: 'Friday the 13th', date: 'Any Friday the 13th', head: hockeyMask(), body: tatteredShirt(), props: '', scene: ['night', 'bats'] },
  anniversary: { name: 'Your Anniversary', date: 'Set with /krab anniversary', heartEyes: true, head: anniversaryHat(), body: tuxedo(), props: `<g transform="translate(108 -12)">${redBouquet()}</g>`, scene: ['hearts', 'rose-petals'] },
  hisbirthday: { name: "Boyfriend's Birthday", date: 'Set with /krab bf-birthday', heartEyes: true, head: birthdayCrown(), body: bowTieShirt(), props: `<g transform="translate(108 -22)">${blueBalloons()}</g>`, scene: ['hearts', 'party'] },
  programmers: { name: "Programmers' Day", date: 'The 256th day of the year (Sep 13, or the day before in a leap year)', head: headphones(), body: devHoodie(), props: `<g transform="translate(108 -10)">${devLaptop()}</g>`, scene: ['binary'] },
  diwali: { name: 'Diwali', date: 'The day of Diwali and the day after', head: '', body: kurta() + marigoldGarland(), props: `<g transform="translate(108 -8)">${diya()}</g>`, scene: ['diyas', 'fireworks-diwali'] },
  hanukkah: { name: 'Hanukkah', date: 'The eight nights of Hanukkah', head: '', body: hanukkahSweater(), props: `<g transform="translate(108 -12)">${dreidel()}</g>`, get scene() { return [`menorah-${hanukkahNight(new Date(Date.now())) || 8}`, 'snow'] } },
  eid: { name: 'Eid al-Fitr', date: 'Eid al-Fitr and the day after', head: '', body: eidVest(), props: `<g transform="translate(108 -12)">${fanous()}</g>`, scene: ['crescent', 'lanterns-eid'] },
  earthhour: { name: 'Earth Hour', date: 'Earth Hour night, 8:30 to 9:30 pm', head: '', body: '', props: `<g transform="translate(108 -18)">${candle()}</g>`, scene: ['blackout'] },
  herbirthday: { name: "Girlfriend's Birthday", date: 'Set with /krab gf-birthday', heartEyes: true, head: tiara(), body: pinkTop(), props: `<g transform="translate(108 -22)">${giftBalloons()}</g>`, scene: ['hearts', 'party'] },
  veterans: { name: 'Veterans Day (US)', date: 'Nov 11', head: garrisonCap(), body: veteranJacket(), props: `<g transform="translate(108 -22)">${usFlag()}</g>`, scene: ['stars-usa'] },
  usthanksgiving: { name: 'US Thanksgiving', date: 'Thursday to Sunday of the 4th week of November', head: turkeyFeathers(), body: creamSweater(), props: `<g transform="translate(108 -14)">${turkeyPlatter()}</g>`, scene: ['leaves'] },
  voyageur: { name: 'Festival du Voyageur', date: 'Mid-February (10 days)', head: voyageurTuque(), body: voyageurBody(), props: `<g transform="translate(108 -22)">${paddle()}</g>`, scene: ['snow'] },
  terryfox: { name: 'Terry Fox Run', date: '2nd Sunday after Labour Day', head: foxHeadband(), body: foxShirt(), props: '', scene: ['maple', 'hearts'] },
  aprilfools: { name: "April Fools' Day", date: 'Apr 1', head: jesterHat(), body: jesterBody(), props: `<g transform="translate(108 -14)">${rubberChicken()}</g>`, scene: ['confetti'] },
  movember: { name: 'Movember', date: 'Nov 1', head: moustache(), body: movemberRibbon(), props: '', scene: ['leaves'] },
  dayofdead: { name: 'Day of the Dead', date: 'Nov 2', head: sugarSkullFace() + dotdCrown(), body: skeletonShirt(), props: `<g transform="translate(108 -14)">${candle()}</g>`, scene: ['papel-picado', 'marigolds'] },
  orangeshirt: { name: 'Truth and Reconciliation (Orange Shirt Day)', date: 'Sep 30', head: '', body: orangeShirt(), props: '', scene: ['leaves'] },
  boxingday: { name: 'Boxing Day', date: 'Dec 26', head: boxingHeadband(), body: championBelt(), sleeve: (side) => (side === 'left' ? glove(-2) : glove(85)), props: '', scene: ['snow'] },
  thanksgiving: { name: 'Thanksgiving', date: 'Friday to the 2nd Monday of October', head: pilgrimHat(), body: pilgrimCollar(), props: `<g transform="translate(108 -14)">${pumpkinPie()}</g>`, scene: ['leaves'] },
  newyear: {
    name: "New Year's Eve",
    date: 'Dec 31',
    get head() {
      return newYearHat()
    },
    body: '',
    props: `<g transform="translate(108 -22)">${sparkler()}</g>`,
    scene: ['fireworks-ny', 'confetti-gold'],
  },
  newyearsday: { name: "New Year's Day", date: 'Jan 1', head: newYearsDayHat(), get body() { return newYearsDayBody() }, props: `<g transform="translate(108 -10)">${bubbly()}</g>`, scene: ['balloons', 'confetti-gold'] },
  piday: { name: 'Pi Day', date: 'Mar 14', head: piBeanie(), body: piShirt(), props: `<g transform="translate(108 -14)">${piPie()}</g>`, scene: ['pi'] },
  groundhog: { name: 'Groundhog Day', date: 'Feb 2', head: groundhogHat(), body: '', props: '', scene: ['burrow', 'snow'] },
  mothersday: { name: "Mother's Day", date: 'Second Sunday of May', head: mumHead(), body: mumBody(), props: `<g transform="translate(108 -12)">${bouquet()}</g>`, scene: ['hearts', 'flowers'] },
  fathersday: { name: "Father's Day", date: 'Third Sunday of June', head: dadCap(), body: dadBody(), props: `<g transform="translate(108 -14)">${dadMug()}</g>`, scene: ['confetti-dad'] },
  earth: { name: 'Earth Day', date: 'Apr 22', head: leafCrown(), body: earthShirt(), props: `<g transform="translate(108 -8)">${sapling()}</g>`, scene: ['flowers', 'leaves-green'] },
  birthday: { name: 'Your Birthday', date: 'Set with /krab birthday', head: partyHat(), body: '', props: `<g transform="translate(108 -14)">${cake()}</g>`, scene: ['balloons', 'party'] },
  cinco: { name: 'Cinco de Mayo', date: 'May 5', head: sombrero(), body: serape(), props: `<g transform="translate(108 -22)">${mexFlag()}</g>`, scene: ['confetti-mx', 'fireworks-mx'] },
  maythe4th: { name: 'May the Fourth', date: 'May 4', head: '', body: jediRobe(), props: `<g transform="translate(108 -22)">${lightsaber()}</g>`, scene: ['galaxy'] },
  usa: { name: 'Fourth of July', date: 'Jul 4', head: usHat(), body: usShirt(), props: `<g transform="translate(108 -22)">${usFlag()}</g>`, scene: ['fireworks-usa'] },
  chinese: { name: 'Chinese New Year', date: '3 days before to 3 days after', head: cnyCap(), body: tangJacket(), props: `<g transform="translate(108 -2)">${lantern()}</g>`, scene: ['lanterns', 'fireworks-cny'] },
  graduation: { name: 'Graduation', date: 'Jun 1 to Jun 14', head: gradCap(), body: gown(), props: '', scene: ['confetti', 'caps'] },
  chile: { name: "Chile's Independence Day", date: 'Sep 18 and 19', head: huasoHat(), body: poncho(), props: `<g transform="translate(108 -22)">${chileanFlag()}</g>`, scene: ['cordillera', 'fireworks-chile'] },
  valentines: { name: "Valentine's Day", date: 'Feb 7 to Feb 14', heartEyes: true, head: '', body: blush(), props: `<g transform="translate(107 -4)">${rose()}</g>`, scene: ['hearts'] },
  halloween: {
    name: 'Halloween',
    date: 'Oct 21 to Oct 31, a new costume each day',
    get alarmX() {
      return costumeToday().alarmX
    },
    get head() {
      return costumeToday().head
    },
    get body() {
      return costumeToday().body
    },
    get props() {
      return costumeToday().props ?? ''
    },
    get limitHead() {
      return costumeToday().limitHead
    },
    get sleeve() {
      return costumeToday().sleeve
    },
    get scene() {
      return costumeToday().scene
    },
  },
  witch: halloweenCostume('witch'),
  ghost: halloweenCostume('ghost'),
  pumpkin: halloweenCostume('pumpkin'),
  vampire: halloweenCostume('vampire'),
  mummy: halloweenCostume('mummy'),
  skeleton: halloweenCostume('skeleton'),
  frankenstein: halloweenCostume('frankenstein'),
  werewolf: halloweenCostume('werewolf'),
  zombie: halloweenCostume('zombie'),
  pirate: halloweenCostume('pirate'),
  ghostbuster: halloweenCostume('ghostbuster'),
  remembrance: { name: 'Remembrance Day', date: 'Nov 11', head: armyHelmet(), body: poppy(), props: '', scene: ['poppies'] },
  christmas: { name: 'Christmas', date: 'Dec 1 to Dec 26', head: santaHat(), body: scarf(), props: '', scene: ['snow', 'presents', 'tree'] },
  riel: { name: 'Louis Riel Day', date: 'Friday to 3rd Monday of February', head: '', body: sash(), props: `<g transform="translate(108 -22)">${metisFlag()}</g>`, scene: ['snow'] },
  stpatricks: { name: "St Patrick's Day", date: 'Mar 10 to Mar 17', head: leprechaunHat(), body: '', props: '', scene: ['shamrocks'] },
  pride: { name: 'Pride', date: 'Friday to Sunday of the first Sunday in June', head: prideBand(), body: prideShirt(), props: `<g transform="translate(108 -22)">${prideFlag()}</g>`, scene: ['confetti'] },
  leapday: { name: 'Leap Day', date: 'Feb 29', hop: true, head: frogEyes(), body: frogBody(), props: '', scene: ['clouds'] },
  goodfriday: { name: 'Good Friday', date: 'The Friday before Easter Sunday', head: goodFridayHead(), body: simpleRobe(), props: `<g transform="translate(104 -4)">${woodenCross()}</g>`, scene: ['clouds'] },
  easter: { name: 'Easter', date: 'The week before Easter Sunday', head: bunnyEars(), body: '', props: '', scene: ['flowers', 'eggs'] },
  victoria: { name: 'Victoria Day', date: 'Friday to the Monday before May 25', head: crown(), body: ermine(), props: '', scene: ['fireworks', 'flowers'] },
  canada: {
    name: 'Canada Day',
    date: 'Jul 1',
    skin: RED,
    dark: '#A81A20',
    // For the recorded gym routine: the white middle is worked out from his own body in every frame, and the leaf sits on it
    stripe: { x: 32, width: 43, color: WHITE },
    leaf: flagLeaf(),
    head: '',
    body: flagBody(),
    props: `<g transform="translate(108 -22)">${canadianFlag()}</g>`,
    scene: ['fireworks-canada', 'maple'],
  },
  summer: { name: 'Summer', date: 'Jun 21 to Sep 22', head: strawHat() + sunglasses(), limitHead: strawHat() + r(15, 1, 24, 7, '#1B1B1B') + r(69, 1, 24, 7, '#1B1B1B') + r(39, 3, 30, 2, '#1B1B1B'), body: '', props: '', scene: ['summer'] },
  labour: { name: 'Labour Day', date: 'Friday to the 1st Monday of September', head: hardHat(), body: toolBelt(), props: `<g transform="translate(108 14)">${hammer()}</g>`, scene: ['leaves'] },
  mexico: { name: 'Mexican Independence Day', date: 'Sep 15 to 16', head: charroHat(), body: charroJacket(), props: `<g transform="translate(108 -22)">${mexFlag()}</g>`, scene: ['papel-picado', 'fireworks-mx'] },
  holi: { name: 'Holi', date: 'The day of Holi (moves each year)', head: holiFace(), body: holiKurta(), props: `<g transform="translate(106 10)">${gulalBowl()}</g>`, scene: ['holi'] },
  nowruz: { name: 'Nowruz', date: 'Mar 20 to 21', head: '', body: nowruzVest(), props: `<g transform="translate(106 12)">${sabzeh()}</g>`, scene: ['flowers', 'blossoms'] },
  juneteenth: { name: 'Juneteenth', date: 'Jun 19', head: '', body: juneteenthShirt(), props: `<g transform="translate(108 -22)">${juneteenthFlag()}</g>`, scene: ['fireworks'] },
  oktoberfest: { name: 'Oktoberfest', date: 'Mid-September to the first Sunday of October', head: alpineHat(), body: lederhosen(), props: `<g transform="translate(106 12)">${pretzel()}</g>`, scene: ['bunting', 'leaves'] },
  pirateday: { name: 'Talk Like a Pirate Day', date: 'Sep 19', head: pirateHead(), body: pirateBody(), props: `<g transform="translate(104 -10)">${cutlass()}</g>`, scene: ['clouds'] },
  towelday: { name: 'Towel Day', date: 'May 25', head: '', body: dressingGown(), props: `<g transform="translate(106 12)">${teacup()}</g>`, scene: ['night'] },
}

export const OUTFIT_IDS = Object.keys(OUTFITS)
