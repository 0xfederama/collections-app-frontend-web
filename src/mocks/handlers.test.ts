import { describe, expect, it } from 'vitest'
import { exampleResponses } from './fixtures'
import { mockTypes } from './types'

const UUID = '0b9f2b6e-6c1c-4d58-9a55-3f1d3a0e2a11'

const fill = (path: string) => path.replace(/\{version\}/g, '2').replace(/\{(id|batch_id)\}/g, UUID)

describe('default MSW handlers', () => {
  it('listTypes answers with the built-in type definitions (the spec has no example body)', async () => {
    const res = await fetch(`${location.origin}${exampleResponses.listTypes.path}`)
    expect(res.status).toBe(exampleResponses.listTypes.status)
    expect(await res.json()).toEqual(mockTypes)
  })

  it.each(Object.entries(exampleResponses).filter(([op]) => op !== 'listTypes'))(
    '%s answers with its documented example',
    async (_op, ex) => {
      const method = ex.method.toUpperCase()
      const res = await fetch(`${location.origin}${fill(ex.path)}`, {
        method,
        ...(method === 'GET'
          ? {}
          : { headers: { 'Content-Type': 'application/json' }, body: '{}' }),
      })
      expect(res.status).toBe(ex.status)

      if (ex.contentType?.startsWith('image/')) {
        expect(res.headers.get('Content-Type')).toMatch(/^image\//)
      } else if (ex.status === 204 || ex.body === undefined) {
        expect(await res.text()).toBe('')
      } else if (ex.contentType === 'application/json') {
        expect(res.headers.get('Content-Type')).toContain('application/json')
        expect(await res.json()).toEqual(ex.body)
      } else {
        expect(await res.text()).toBe(ex.body)
      }
    },
  )

  it('covers image endpoints', () => {
    const images = Object.values(exampleResponses).filter((e) =>
      e.contentType?.startsWith('image/'),
    )
    expect(images).toHaveLength(2)
  })

  it('rejects an unhandled URL', async () => {
    await expect(fetch(`${location.origin}/api/v1/nope`)).rejects.toThrow()
  })
})
