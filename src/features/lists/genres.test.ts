import { describe, expect, it } from 'vitest'
import { GENRE_PARAM, parseGenres, toggleGenre, withGenres } from './genres'

describe('F-028 W3 parseGenres', () => {
  it.each([
    ['no values', [], undefined, []],
    ['keeps URL order', ['Drama', 'Comedy'], undefined, ['Drama', 'Comedy']],
    ['trims spaces', ['  Drama  '], undefined, ['Drama']],
    ['drops blanks and spaces only', ['', '   ', 'Drama'], undefined, ['Drama']],
    ['drops duplicates', ['Drama', 'Drama', 'Comedy'], undefined, ['Drama', 'Comedy']],
    ['drops a value over 100 characters', ['x'.repeat(101), 'Drama'], undefined, ['Drama']],
    ['keeps a value of exactly 100 characters', ['x'.repeat(100)], undefined, ['x'.repeat(100)]],
    ['keeps every value while the list genres are unknown', ['Nope'], undefined, ['Nope']],
    ['drops a genre the list does not have', ['Drama', 'Nope'], ['Drama', 'Comedy'], ['Drama']],
    ['drops everything when the list has no genres', ['Drama'], [], []],
    ['match is exact (case sensitive)', ['drama'], ['Drama'], []],
  ])('%s', (_name, values, known, expected) => {
    expect(parseGenres(values, known)).toEqual(expected)
  })
})

describe('F-028 W3 withGenres', () => {
  it.each([
    ['sets repeated genre parameters', '', ['Drama', 'Comedy'], 'genre=Drama&genre=Comedy'],
    ['replaces the old genre parameters', 'genre=Drama', ['Comedy'], 'genre=Comedy'],
    ['clears them with no genres', 'genre=Drama', [], ''],
    [
      'keeps other parameters',
      'q=dune&genre=Drama&sort=title',
      ['Comedy'],
      'q=dune&sort=title&genre=Comedy',
    ],
  ])('%s', (_name, search, genres, expected) => {
    expect(withGenres(new URLSearchParams(search), genres).toString()).toBe(expected)
  })

  it('uses the genre parameter name of the URL', () => {
    expect(GENRE_PARAM).toBe('genre')
  })

  it('does not change the URLSearchParams it was given', () => {
    const params = new URLSearchParams('genre=Drama')
    withGenres(params, ['Comedy'])
    expect(params.toString()).toBe('genre=Drama')
  })
})

describe('F-028 W3 toggleGenre', () => {
  it.each([
    ['adds a genre that is not chosen', ['Drama'], 'Comedy', ['Drama', 'Comedy']],
    ['removes a chosen genre', ['Drama', 'Comedy'], 'Drama', ['Comedy']],
    ['adds to an empty selection', [], 'Drama', ['Drama']],
  ])('%s', (_name, selected, genre, expected) => {
    expect(toggleGenre(selected, genre)).toEqual(expected)
  })
})
