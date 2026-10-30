import tmdbLogo from '../../assets/tmdb-logo.svg'
import openLibraryLogo from '../../assets/services/open-library.svg'

const externalLink =
  'text-accent underline decoration-border-strong underline-offset-4 hover:text-accent-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring'

const logoTile = 'size-12 shrink-0 overflow-hidden rounded-md bg-fill p-1.5'

export function AboutSection() {
  return (
    <div className="flex flex-col gap-5 text-sm leading-6">
      <div className="flex items-start gap-3">
        <span className={logoTile}>
          <img src={tmdbLogo} alt="TMDB" className="size-full object-contain" />
        </span>
        <p>
          Movie and TV details come from{' '}
          <a
            className={`${externalLink} font-semibold`}
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            TMDB
          </a>
          , and streaming availability from{' '}
          <a
            className={externalLink}
            href="https://www.justwatch.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            JustWatch
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <span className={logoTile}>
          <img src={openLibraryLogo} alt="Open Library" className="size-full object-contain" />
        </span>
        <p>
          Book details and covers come from{' '}
          <a
            className={`${externalLink} font-semibold`}
            href="https://openlibrary.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Library
          </a>
          , an open project of the Internet Archive.
        </p>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <a
          className={externalLink}
          href="https://github.com/0xfederama/collections-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub repository
        </a>
        <a
          className={externalLink}
          href="https://github.com/0xfederama"
          target="_blank"
          rel="noopener noreferrer"
        >
          Author profile
        </a>
      </div>
    </div>
  )
}
