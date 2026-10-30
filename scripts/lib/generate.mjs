// Turns the vendored OpenAPI spec into the files under src/generated/.
// Shared by api-sync.mjs (writes them) and api-check.mjs (compares them), so both always agree.
import { createHash } from 'node:crypto'
import openapiTS, { astToString } from 'openapi-typescript'
import yaml from 'js-yaml'

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

// Returns { 'schema.d.ts': string }, ready to write byte for byte.
export async function generate(specBytes) {
  const spec = yaml.load(Buffer.from(specBytes).toString('utf8'))

  const schema = astToString(await openapiTS(spec))

  return { 'schema.d.ts': schema }
}
