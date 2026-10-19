import { describe, expect, it } from 'vitest'
import { exampleResponses } from '../generated/examples'
import { mockKinds } from './kinds'

const UUID = '0b9f2b6e-6c1c-4d58-9a55-3f1d3a0e2a11'

const fill = (path: string) => path.replace(/\{version\}/g, '2').replace(/\{(id|batch_id)\}/g, UUID)

describe('default MSW handlers', () => {
  it('listKinds answers with the built-in kind definitions (the spec has no example body)', async () => {
    const res = await fetch(`${location.origin}${exampleResponses.listKinds.path}`)
    expect(res.status).toBe(exampleResponses.listKinds.status)
    expect(await res.json()).toEqual(mockKinds)
  })

  it.each(Object.entries(exampleResponses).filter(([op]) => op !== 'listKinds'))(
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
