# Service and link icons

Downloaded once on 2026-10-15 and resized to 96x96 WebP (`sips` + `cwebp -q 80`). They are never fetched at runtime.
Trademarks of their owners, used for identification only.

| File                | Source URL                                                                                                                 | Date       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `netflix.webp`      | https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png                                                       | 2026-10-15 |
| `prime-video.webp`  | https://m.media-amazon.com/images/G/01/digital/video/DVUI/favicons/apple-touch-icon-152x152.png                            | 2026-10-15 |
| `disney-plus.webp`  | https://static-assets.bamgrid.com/product/disneyplus/favicons/disPlus-favicon-180x180.7d56f648dc95f591721935193bc827cb.png | 2026-10-15 |
| `apple-tv.webp`     | https://tv.apple.com/apple-touch-icon.png                                                                                  | 2026-10-15 |
| `youtube.webp`      | https://www.youtube.com/s/desktop/f51d9955/img/favicon_144x144.png                                                         | 2026-10-15 |
| `timvision.webp`    | https://www.timvision.it/apple-touch-icon-180x180.png (180x151, padded to a white square)                                  | 2026-10-15 |
| `infinity.webp`     | apple-touch-icon (192px) linked from https://www.mediasetinfinity.mediaset.it                                              | 2026-10-15 |
| `letterboxd.webp`   | https://letterboxd.com/favicon.ico (64px entry)                                                                            | 2026-10-15 |
| `reddit.webp`       | https://www.redditstatic.com/shreddit/assets/favicon/192x192.png                                                           | 2026-10-15 |
| `google.svg`        | Simple Icons `google` path (https://github.com/simple-icons/simple-icons, CC0 1.0), v16.35.0, brand colour `#4285F4`       | 2026-10-15 |
| `imdb.svg`          | Simple Icons `imdb` path (same package and licence), brand colour `#F5C518`                                                | 2026-10-15 |
| `open-library.webp` | https://openlibrary.org/static/images/openlibrary-192x192.png (resized to 96x96, About section)                            | 2026-10-20 |

Google (32 px) and IMDb (32 px) favicons are under 48 px, so their marks are the Simple Icons SVGs (F008-W11). Website
links have no file: a neutral globe symbol is drawn in the tile (`ServiceIcon.tsx`). No 1.x SVGs existed to restore.

F009-W5: the two SVGs no longer carry the white 24x24 background and the 0.6 inner scale F008-W11 added to match the
full-bleed WebP tiles. The tile now owns the padding: every mark (logo, symbol, letter) sits in the same 18% inset and is
contained, never cropped, so a white square would show against the neutral tile in the dark theme. The WebP favicons keep
their own artwork as downloaded.
