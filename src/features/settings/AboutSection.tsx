import tmdbLogo from '../../assets/tmdb-logo.svg'
import { useState } from 'react'
import openLibraryLogo from '../../assets/services/open-library.svg'
import { focusDebugEnabled, setFocusDebug } from '../../lib/focusDebug'

const externalLink =
  'text-accent underline decoration-border-strong underline-offset-4 hover:text-accent-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring'

const logoTile = 'size-12 shrink-0 overflow-hidden rounded-sm bg-fill p-1.5'

export function AboutSection() {
  const [focusDebug, setFocusDebugState] = useState(focusDebugEnabled)
  return (
    <div className="flex flex-col gap-5 text-ui leading-6">
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
          , an open project of the Internet Archive. Missing details are filled in from{' '}
          <a
            className={`${externalLink} font-semibold`}
            href="https://hardcover.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Hardcover
          </a>
          .
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
      {/* Roadmap 28: on-screen focus log to find where the iOS keyboard closes on a real phone. */}
      <label className="flex items-center gap-2 text-secondary text-text-muted">
        <input
          type="checkbox"
          checked={focusDebug}
          onChange={(event) => {
            setFocusDebug(event.target.checked)
            setFocusDebugState(event.target.checked)
          }}
          className="size-4 accent-accent"
        />
        Show keyboard and focus diagnostics
      </label>
    </div>
  )
}
