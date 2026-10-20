import { ESLint } from 'eslint'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import baseline from '../eslint.boundaries.baseline.js'

// Lints in-memory code against the repo's eslint.config.js (F020 boundaries). The probe files
// need not exist: only the path decides which config block applies.
const eslint = new ESLint({ cwd: resolve(import.meta.dirname, '..') })

async function reports(filePath: string, code: string): Promise<boolean> {
  const [result] = await eslint.lintText(code, { filePath })
  return result!.messages.some((message) => message.ruleId === 'no-restricted-imports')
}

describe('F020-W2 import boundaries', () => {
  it('B: a feature may not import another feature deep', async () => {
    expect(await reports('src/features/trash/__probe.ts', "import { x } from '../tree/api'")).toBe(
      true,
    )
  })

  it('B: a feature may import another feature through its index', async () => {
    expect(await reports('src/features/trash/__probe.ts', "import { x } from '../tree'")).toBe(
      false,
    )
  })

  it('B: a feature may import another feature test kit (testing) deep', async () => {
    expect(
      await reports('src/features/trash/__probe.ts', "import { x } from '../tree/testing'"),
    ).toBe(false)
  })

  it('B: a feature may import another feature screens module deep', async () => {
    expect(
      await reports('src/features/trash/__probe.ts', "import { x } from '../lists/screens'"),
    ).toBe(false)
  })

  it('B: a feature may not import another feature list view deep', async () => {
    expect(
      await reports('src/features/trash/__probe.ts', "import { x } from '../lists/ListView'"),
    ).toBe(true)
  })

  it('B: a feature may import its own internals', async () => {
    expect(await reports('src/features/tree/__probe.ts', "import { x } from '../tree/api'")).toBe(
      false,
    )
  })

  it('B: files directly in src/features are shared and not restricted', async () => {
    expect(await reports('src/features/__probe.ts', "import { x } from './tree/api'")).toBe(false)
  })

  it('A: components may not import features', async () => {
    expect(
      await reports('src/components/ui/__probe.tsx', "import { x } from '../../features/links'"),
    ).toBe(true)
  })

  it('A: components may import lib', async () => {
    expect(
      await reports('src/components/ui/__probe.tsx', "import { x } from '../../lib/breakpoints'"),
    ).toBe(false)
  })

  it('A: lib may not import features or mocks', async () => {
    expect(await reports('src/lib/__probe.ts', "import { x } from '../features/links'")).toBe(true)
    expect(await reports('src/lib/__probe.ts', "import { x } from '../mocks/server'")).toBe(true)
  })

  it('C: outside features, a deep feature import is forbidden', async () => {
    expect(await reports('src/app/__probe.tsx', "import { x } from '../features/tree/api'")).toBe(
      true,
    )
  })

  it('C: outside features, a feature index import is allowed', async () => {
    expect(await reports('src/app/__probe.tsx', "import { x } from '../features/links'")).toBe(
      false,
    )
  })

  it('C: outside features, a feature test kit (testing) import is allowed', async () => {
    expect(
      await reports('src/app/__probe.tsx', "import { x } from '../features/tree/testing'"),
    ).toBe(false)
  })

  it('C: routes may import a feature screens module deep', async () => {
    expect(
      await reports('src/routes/__probe.tsx', "import { x } from '../features/settings/screens'"),
    ).toBe(false)
  })

  it('C: routes may not import a feature list view deep', async () => {
    expect(
      await reports('src/routes/__probe.tsx', "import { x } from '../features/lists/ListView'"),
    ).toBe(true)
  })

  it('legacy: a baseline file is exempt (the same import in a non-baseline sibling reports)', async () => {
    const legacy = baseline.find((file) => file.startsWith('src/features/'))
    expect(legacy).toBeDefined()
    const sibling = legacy!.replace(/[^/]+$/, '__probe.tsx')
    const code = "import { x } from '../tree/api'"
    expect(await reports(legacy!, code)).toBe(false)
    expect(await reports(sibling, code)).toBe(true)
  })
})
