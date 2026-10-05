# Krab Koder

A little pixel-art crab who lives above your prompt in Claude Code. He reacts to what Claude is doing, shows how full your context and plan limits are, and dresses up by himself for holidays, your own special days, the weather and the sky.

**See him in action, and try every outfit and reaction in your browser:** https://danielmejia.dev/projects/clawd-walker

> **Unofficial fan project.** Krab Koder is not made by, endorsed by or affiliated with Anthropic. Clawd, Claude and the Claude logo belong to Anthropic. Other characters and names that appear in outfits belong to their owners.

## What he does

- **Reacts to Claude's work:** thinking, writing files, running commands, reading, permission questions, failed commands, tests passing (he cheers) or failing (he facepalms), commits, pushes, web searches, helper agents, model and effort changes, and more. There are 51 reactions.
- **Shows your usage** as small pills: context, 5-hour and weekly limits, and cost. He gets tired as the context fills up, and checks his watch as a limit gets close.
- **Dresses for the day:** around 80 outfits for holidays around the world, plus your birthday, a partner's birthday and your anniversary once you set them.
- **Follows your weather and sky:** live weather (snow, storms, extreme cold and heat, wildfire smoke and more), the real moon phase, eclipses, meteor showers and the northern lights.
- **Keeps himself busy:** birds, butterflies and fireflies in the background, and the odd yo-yo or juggle when things go quiet.

## Install

You need Claude Code with plugin support. In a terminal:

```bash
claude plugin marketplace add CursedChair/krab-koder
```

```bash
claude plugin install krab-koder@krab-koder
```

Then restart Claude Code. He appears above the prompt.

## Set him up

All of these are optional. Type them in Claude Code:

| Command | What it does |
| --- | --- |
| `/krab settings` | Show your current settings |
| `/krab location <city>` | Use your local weather and time of year (or type `latitude, longitude`) |
| `/krab holidays <codes>` | Which holidays to follow, such as `CA`, `US`, `MX`, `GB` or `CA-MB` for a province |
| `/krab birthday <date>` | Your birthday, such as `Jan 15` |
| `/krab gf-birthday`, `bf-birthday`, `anniversary <date>` | Other days that matter to you |
| `/krab on`, `off` | Show or hide him |
| `/krab small`, `normal`, `big` | Change his size |
| `/krab outfit auto`, `off` or a name | Follow the date, take the outfit off, or try one |
| `/krab weather auto`, `off` or a kind | Use live weather, turn it off, or try one like `snow` or `heat` |
| `/krab sky auto` or an event | Follow the real sky, or try `aurora`, `meteors`, `bloodmoon`, `ufo`, `comet` or `eclipse` |
| `/krab time auto` or a time | Follow the clock, or try `night`, `sunrise`, `sunset` or `day` |

## Privacy

- **Nothing about you is sent to me.** There are no accounts, no analytics and no tracking.
- **Your settings stay on your computer,** in Claude Code's own plugin storage: your days, location and holidays.
- **Live weather** is fetched from [Open-Meteo](https://open-meteo.com) every 15 minutes (forecast and air quality). They receive your saved coordinates and, like any website, your internet address. When you set your location by name, the name you type is sent to Open-Meteo's city search.
- **The northern lights** check [NOAA's space weather feed](https://www.swpc.noaa.gov). They receive nothing about you beyond your internet address.
- Nothing is fetched at all until you set a location with `/krab location`, and `/krab weather off` stops all of it.

## Support

Krab Koder is free. If he makes your day a little better, you can buy me a coffee on [Ko-fi](https://ko-fi.com/cursedchair).

## Contact

Found a bug, have an idea, or own something that appears here and want it changed? [Open an issue](https://github.com/CursedChair/krab-koder/issues). For security problems, see [SECURITY.md](SECURITY.md).

## Development

The mod is plain JavaScript with no dependencies. Run the tests with:

```bash
node --test tests/*.test.mjs
```

## License

[MIT](LICENSE) for the code. The license covers my own work only. It grants no rights to Anthropic's Clawd character, the Claude name or logo, or any other company's characters or trademarks.
