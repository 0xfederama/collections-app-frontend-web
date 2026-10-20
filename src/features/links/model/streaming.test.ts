import { describe, expect, it } from 'vitest'
import { normalizePlatform, streamingSearchLink } from './streaming'

describe('F020-W1 streaming search links', () => {
  // Ports of backend internal/streamlinks TestNormalize.
  it.each([
    ['Netflix', 'netflix'],
    ['Disney+', 'disneyplus'],
    ['Disney Plus', 'disneyplus'],
    ['Apple TV+', 'appletvplus'],
    [' Prime  Video ', 'primevideo'],
    ['Infinity+', 'infinityplus'],
    ['', ''],
  ])('normalizes %j to %j', (input, want) => {
    expect(normalizePlatform(input)).toBe(want)
  })

  // Ports of backend TestLink, plus the prefix variants and title edge cases.
  it.each([
    ['netflix', 'Netflix', 'The Matrix', 'https://www.netflix.com/search?q=The+Matrix'],
    [
      'netflix ads variant',
      'Netflix basic with Ads',
      'Dune',
      'https://www.netflix.com/search?q=Dune',
    ],
    [
      'amazon prime video',
      'Amazon Prime Video',
      'Dune',
      'https://www.primevideo.com/search/?phrase=Dune',
    ],
    ['prime video', 'Prime Video', 'Dune', 'https://www.primevideo.com/search/?phrase=Dune'],
    [
      'prime video with ads',
      'Amazon Prime Video with Ads',
      'Dune',
      'https://www.primevideo.com/search/?phrase=Dune',
    ],
    ['disney plus', 'Disney Plus', 'Dune', 'https://www.disneyplus.com/search?q=Dune'],
    ['disney+', 'Disney+', 'Dune', 'https://www.disneyplus.com/search?q=Dune'],
    ['apple tv', 'Apple TV', 'Dune', 'https://tv.apple.com/search?term=Dune'],
    ['apple tv plus', 'Apple TV Plus', 'Dune', 'https://tv.apple.com/search?term=Dune'],
    ['apple tv+', 'Apple TV+', 'Dune', 'https://tv.apple.com/search?term=Dune'],
    ['max', 'Max', 'Dune', 'https://play.max.com/search?q=Dune'],
    ['hbo max', 'HBO Max', 'Dune', 'https://play.max.com/search?q=Dune'],
    ['paramount plus', 'Paramount Plus', 'Dune', 'https://www.paramountplus.com/search/?q=Dune'],
    ['paramount+', 'Paramount+', 'Dune', 'https://www.paramountplus.com/search/?q=Dune'],
    ['hulu', 'Hulu', 'Dune', 'https://www.hulu.com/search?q=Dune'],
    ['peacock', 'Peacock', 'Dune', 'https://www.peacocktv.com/search?q=Dune'],
    ['peacock premium', 'Peacock Premium', 'Dune', 'https://www.peacocktv.com/search?q=Dune'],
    ['youtube', 'YouTube', 'Dune', 'https://www.youtube.com/results?search_query=Dune'],
    ['crunchyroll', 'Crunchyroll', 'Dune', 'https://www.crunchyroll.com/search?q=Dune'],
    ['mubi', 'MUBI', 'Dune', 'https://mubi.com/search/films?query=Dune'],
    [
      'title is escaped',
      'Netflix',
      'Tom & Jerry: 100% #1',
      'https://www.netflix.com/search?q=Tom+%26+Jerry%3A+100%25+%231',
    ],
    ['title is trimmed', 'Netflix', '  Dune  ', 'https://www.netflix.com/search?q=Dune'],
    ['non-ascii title', 'Netflix', 'Amélie', 'https://www.netflix.com/search?q=Am%C3%A9lie'],
    ['ampersand', 'Netflix', 'Rock & Roll', 'https://www.netflix.com/search?q=Rock+%26+Roll'],
    ['hash', 'Netflix', 'Column #9', 'https://www.netflix.com/search?q=Column+%239'],
    [
      'single quotes',
      'Netflix',
      "Rock 'n' Roll",
      'https://www.netflix.com/search?q=Rock+%27n%27+Roll',
    ],
    ['double quotes', 'Netflix', 'The "Best"', 'https://www.netflix.com/search?q=The+%22Best%22'],
    [
      'parentheses and asterisk',
      'Netflix',
      'Ok (*)!',
      'https://www.netflix.com/search?q=Ok+%28%2A%29%21',
    ],
    ['accented capital', 'Netflix', 'Ça va', 'https://www.netflix.com/search?q=%C3%87a+va'],
    ['tilde stays', 'Netflix', 'a~b', 'https://www.netflix.com/search?q=a~b'],
    ['plus sign is escaped', 'Netflix', 'C++', 'https://www.netflix.com/search?q=C%2B%2B'],
  ])('%s', (_name, platform, title, want) => {
    expect(streamingSearchLink(platform, title)).toBe(want)
  })

  it.each([
    ['empty title', 'Netflix', ''],
    ['whitespace title', 'Netflix', '   '],
    ['unknown platform', 'RaiPlay', 'Dune'],
    ['similar name is not a match', 'Maxdome', 'Dune'],
    ['empty platform', '', 'Dune'],
  ])('returns null for %s', (_name, platform, title) => {
    expect(streamingSearchLink(platform, title)).toBeNull()
  })
})
