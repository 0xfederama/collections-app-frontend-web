import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api'
import { classifyError, shouldRefreshTree } from './errors'

const apiError = (status: number, code: string) =>
  new ApiError({ status, code, title: code, raw: null })

describe('web 3.3.0 move failures: classifyError', () => {
  it.each([
    {
      name: '422 invalid_before_id says the tree changed and was refreshed',
      error: apiError(422, 'invalid_before_id'),
      kind: 'stale',
      message: 'The folders and lists changed. They were refreshed; please try again.',
    },
    {
      name: '409 destination_unavailable',
      error: apiError(409, 'destination_unavailable'),
      kind: 'unavailable',
      message: 'That place is no longer available. Pick another one.',
    },
    {
      name: '409 folder_shared',
      error: apiError(409, 'folder_shared'),
      kind: 'shared',
      message: 'A shared folder can’t go inside another folder.',
    },
    {
      name: '403 forbidden names the item',
      error: apiError(403, 'forbidden'),
      kind: 'forbidden',
      message: 'Only the owner of ‘Gear’ can do that.',
    },
    {
      name: '409 cycle_detected',
      error: apiError(409, 'cycle_detected'),
      kind: 'cycle',
      message: 'A folder can’t be moved into itself or one of its own subfolders.',
    },
    {
      name: '412 is a conflict, not a stale place',
      error: apiError(412, 'version_conflict'),
      kind: 'conflict',
      message:
        'Someone else changed this folder while you were editing. Your changes have not been saved.',
    },
    {
      name: 'any other 422 stays a validation failure',
      error: apiError(422, 'validation_failed'),
      kind: 'validation',
      message: 'Please check the highlighted field.',
    },
  ])('$name', ({ error, kind, message }) => {
    const failure = classifyError(error, 'folder', 'Gear')
    expect(failure.kind).toBe(kind)
    expect(failure.message).toBe(message)
  })
})

describe('web 3.3.0 move failures: shouldRefreshTree', () => {
  it.each([
    ['404', apiError(404, 'not_found'), true],
    ['409 of any code', apiError(409, 'folder_shared'), true],
    ['422 invalid_before_id', apiError(422, 'invalid_before_id'), true],
    ['422 validation', apiError(422, 'validation_failed'), false],
    ['412: the dialog keeps the draft', apiError(412, 'version_conflict'), false],
    ['500', apiError(500, 'internal'), false],
    ['a plain Error', new Error('boom'), false],
  ])('%s refetches the tree: %s', (_label, error, expected) => {
    expect(shouldRefreshTree(error)).toBe(expected)
  })
})
