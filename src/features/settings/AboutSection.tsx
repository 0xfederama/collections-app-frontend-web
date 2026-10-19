import { BookOpen } from '../../components/ui/icons'
import tmdbLogo from '../../assets/tmdb-logo.svg'

const externalLink =
  'text-accent underline decoration-border-strong underline-offset-4 hover:text-accent-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring'

export function AboutSection() {
  return (
    <div className="flex flex-col gap-5 text-sm leading-6">
      <div className="flex flex-col items-start gap-3">
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
          <img src={tmdbLogo} alt="TMDB" className="h-10 w-auto" />
        </a>
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </div>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-md bg-fill text-text"
        >
          <BookOpen className="size-5" />
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
          , an open project of the Internet Archive. Thank you to everyone who builds and keeps it
          free.
        </p>
      </div>
      <p>
        Streaming availability data is provided by{' '}
        <a
          className={externalLink}
          href="https://www.justwatch.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          JustWatch
        </a>
        .
      </p>
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
