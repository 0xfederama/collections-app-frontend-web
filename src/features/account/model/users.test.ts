import { describe, expect, it } from 'vitest'
import { findUser, userLabel } from './users'

const ana = { id: 'a', email: 'ana@x.test', name: 'Ana', avatar_url: null }
const bob = { id: 'b', email: 'bob@x.test', name: null, avatar_url: null }

describe('F-027 W1 userLabel', () => {
  it.each([
    [ana, 'Ana'],
    [bob, 'bob@x.test'],
    [{ name: '', email: 'c@x.test' }, 'c@x.test'],
    [{ name: '   ', email: 'c@x.test' }, 'c@x.test'],
    [{ name: ' Dee ', email: 'd@x.test' }, 'Dee'],
  ])('%j -> %s', (user, expected) => {
    expect(userLabel(user)).toBe(expected)
  })
})

describe('F-027 W1 findUser', () => {
  it.each([
    [[ana, bob], 'b', bob],
    [[ana, bob], 'a', ana],
    [[ana, bob], 'zzz', undefined],
    [[ana, bob], null, undefined],
    [[ana, bob], undefined, undefined],
    [undefined, 'a', undefined],
    [[], 'a', undefined],
  ])('%j / %s', (users, id, expected) => {
    expect(findUser(users, id)).toBe(expected)
  })
})
