# Service, store and link icons (F-017)

Every icon is a local SVG with a square viewBox, listed in `src/components/serviceIcons/registry.ts` (a unit test fails
when a file has no entry or an entry has no file). Nothing is fetched at runtime. Trademarks and logos belong to their
owners and are used for identification only. Sourced on 2026-10-30, in the order of the F-017 brief.

Kinds: **path** = a single-colour vector path with the brand colour as `fill`; **wrapped** = the brand's official raster,
base64-embedded unmodified in a 100x100 SVG (no redrawing, no resampling); **vector** = an SVG taken as published.

| File                 | Kind    | Source                                                                                                                              | Licence / note                                                              |
| -------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `google.svg`         | vector  | gilbarbara/logos `logos/google-icon.svg` (the four-colour G, https://github.com/gilbarbara/logos, fetched 2026-10-30)                | CC0 (pack); trademark of Google                                             |
| `imdb.svg`           | path    | Simple Icons `imdb`, `#F5C518`                                                                                                      | CC0; trademark of IMDb.com                                                  |
| `letterboxd.svg`     | path    | Simple Icons `letterboxd`, `#202830`                                                                                                | CC0; trademark of Letterboxd                                                |
| `reddit.svg`         | path    | Simple Icons `reddit`, `#FF4500`                                                                                                    | CC0; trademark of Reddit                                                    |
| `goodreads.svg`      | path    | Simple Icons `goodreads`, `#1E1914`                                                                                                 | CC0; trademark of Goodreads                                                 |
| `netflix.svg`        | path    | Simple Icons `netflix`, `#E50914`                                                                                                   | CC0; trademark of Netflix                                                   |
| `apple-tv.svg`       | path    | Simple Icons `appletv`, `#000000`                                                                                                   | CC0; trademark of Apple                                                     |
| `youtube.svg`        | path    | Simple Icons `youtube`, `#FF0000`                                                                                                   | CC0; trademark of Google                                                    |
| `google-play.svg`    | path    | Simple Icons `googleplay`, `#414141` (also used for Google Play Books)                                                              | CC0; trademark of Google                                                    |
| `paramount-plus.svg` | path    | Simple Icons `paramountplus`, `#0064FF`                                                                                             | CC0; trademark of Paramount                                                 |
| `hbo-max.svg`        | path    | Simple Icons `hbomax`, `#000000`                                                                                                    | CC0; trademark of Warner Bros. Discovery                                    |
| `now.svg`            | path    | Simple Icons `now`, `#001211`                                                                                                       | CC0; trademark of Sky                                                       |
| `sky.svg`            | path    | Simple Icons `sky`, `#0072C9`                                                                                                       | CC0; trademark of Sky                                                       |
| `mubi.svg`           | path    | Simple Icons `mubi`, `#000000`                                                                                                      | CC0; trademark of MUBI                                                      |
| `crunchyroll.svg`    | path    | Simple Icons `crunchyroll`, `#FF5E00`                                                                                               | CC0; trademark of Crunchyroll                                               |
| `open-library.svg`   | vector  | https://raw.githubusercontent.com/internetarchive/openlibrary/master/static/images/openlibrary-icon.svg (the site's own icon)       | Open Library repository (AGPL-3.0 code); Internet Archive mark              |
| `hulu.svg`           | vector  | svgl https://github.com/pheralb/svgl `static/library/hulu.svg` (wordmark)                                                           | svgl is MIT; the artwork is Hulu's trademark                                |
| `amazon.svg`         | vector  | Wikimedia Commons `File:Amazon icon.svg`                                                                                            | Public domain in the US (simple shapes, `PD-textlogo`); trademark of Amazon |
| `apple-books.svg`    | vector  | Wikimedia Commons `File:Apple Books (macOS).svg`                                                                                    | Licence tag on the Commons file page; trademark of Apple                    |
| `prime-video.svg`    | wrapped | https://m.media-amazon.com/images/G/01/digital/video/DVUI/favicons/apple-touch-icon-152x152.png (152 px)                            | Brand's own touch icon; trademark of Amazon                                 |
| `disney-plus.svg`    | wrapped | https://static-assets.bamgrid.com/product/disneyplus/favicons/disPlus-favicon-180x180.7d56f648dc95f591721935193bc827cb.png (180 px) | Brand's own touch icon; trademark of Disney                                 |
| `infinity.svg`       | wrapped | `apple-touch-icon` (192 px) linked from https://www.mediasetinfinity.mediaset.it                                                    | Brand's own touch icon; trademark of Mediaset                               |
| `raiplay.svg`        | wrapped | https://www.raiplay.it/dl/components/img/logo-app.png (167 px)                                                                      | Brand's own app icon; trademark of RAI                                      |
| `kobo.svg`           | wrapped | https://maint.kobo.com/kobo-maintenance/android-chrome-192x192.png (192 px, linked from https://www.kobo.com)                       | Brand's own icon; trademark of Rakuten Kobo                                 |
| `bookshop.svg`       | wrapped | https://bookshop.org/apple-touch-icon.png (180 px)                                                                                  | Brand's own touch icon; trademark of Bookshop.org                           |
| `discovery-plus.svg` | wrapped | https://www.discoveryplus.com/dotcom/img/dplus/apple-touch-icon.png (180 px)                                                        | Brand's own touch icon; trademark of Warner Bros. Discovery                 |
| `peacock.svg`        | wrapped | https://www.peacocktv.com/static/peacock-toolkit/53.4.0/peacock/favicons/apple-touch-icon_180x180.png (180 px)                      | Brand's own touch icon; trademark of NBCUniversal                           |
| `timvision.svg`      | wrapped | https://www.timvision.it/apple-touch-icon-180x180.png, downloaded 2026-10-15 and kept at 96 px (the URL now answers with JSON)      | Brand's own touch icon; trademark of TIM                                    |
| `rakuten-tv.svg`     | wrapped | https://prod-kuato.rakuten.tv/favicon.ico (64 px entry, the only icon the site publishes; named in its manifest.json)               | Brand's own favicon; trademark of Rakuten                                   |

## Decisions and caveats

- **Simple Icons does not cover everything** (checked 2026-10-30 against 16.36.0), so there is no single pack: Amazon,
  Prime Video, Disney+, Kobo, Bookshop.org, Open Library, Apple Books, TIMvision, Mediaset Infinity, RaiPlay, Rakuten TV,
  Hulu, Peacock and Discovery+ are missing there. Each of those comes from the next source in the brief's order.
- **Wrapped rasters** are the largest clean official icon each brand serves (64–192 px), embedded as published. They
  are sharp at the largest tile (36 px), except TIMvision (96 px) and Rakuten TV (64 px), which are the best that exist.
- **Tiles** (registry `tile` / `fit`): `inset` marks sit in the shared 18 % padding; `bleed` icons carry their own
  background and fill the tile. Dark marks (`tile: 'light'`) get a theme-independent light tile so they read in both themes.
- Website links have no file: the neutral globe is drawn in the tile. Unknown services get the letter tile.
- Not used: TMDB provider logos (runtime fetching, D-089 retention rules).
- To add an icon: drop the SVG here, add a row above and an entry in the registry; the registry test enforces both.
