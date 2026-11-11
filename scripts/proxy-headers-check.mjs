// D-150: runs the built web image against a tiny echo upstream and checks that a LAN-style request
// (Host raspberrypi.local) is proxied, not redirected, and that Cf-Ray, Cf-Connecting-Ip and
// Cf-Access-Jwt-Assertion reach the API byte for byte. Usage: node scripts/proxy-headers-check.mjs [image-tag]
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { request } from 'node:http'

const tag = process.argv[2] ?? 'collections-web:check'
const sent = {
  'cf-ray': '8f1e2d3c4b5a6978-MXP',
  'cf-connecting-ip': '203.0.113.7',
  'cf-access-jwt-assertion': 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ4In0.c2ln',
}

const upstream = createServer((req, res) => {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(req.headers))
})
await new Promise((ok) => upstream.listen(0, '0.0.0.0', ok))
const upstreamPort = upstream.address().port

const name = `collections-web-proxycheck-${process.pid}`
const run = spawnSync(
  'docker',
  [
    'run',
    '-d',
    '--rm',
    '--name',
    name,
    '--add-host',
    'host.docker.internal:host-gateway',
    '-e',
    `API_UPSTREAM=host.docker.internal:${upstreamPort}`,
    '-p',
    '127.0.0.1::8080',
    tag,
  ],
  { encoding: 'utf8' },
)
const stop = () => spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' })
const fail = (message) => {
  console.error(`\nproxy-headers-check failed: ${message}\n`)
  stop()
  upstream.close()
  process.exit(1)
}
if (run.status !== 0) fail(run.stderr)

const port = spawnSync('docker', ['port', name, '8080'], { encoding: 'utf8' })
  .stdout.trim()
  .split(':')
  .pop()

const get = (path, headers) =>
  new Promise((ok, ko) => {
    const req = request({ host: '127.0.0.1', port, path, headers }, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => ok({ status: res.statusCode, body }))
    })
    req.on('error', ko)
    req.end()
  })

let answer
for (let attempt = 0; attempt < 50; attempt++) {
  answer = await get('/api/v1/me', { host: 'raspberrypi.local', ...sent }).catch(() => undefined)
  if (answer && answer.status !== 502) break
  await new Promise((ok) => setTimeout(ok, 200))
}
if (!answer) fail('the container never answered')
if (answer.status !== 200)
  fail(
    `/api/v1/me with Host raspberrypi.local answered ${answer.status}, expected 200 (proxied, no redirect)`,
  )
const received = JSON.parse(answer.body)
for (const [key, value] of Object.entries(sent)) {
  if (received[key] !== value)
    fail(
      `${key} reached the API as ${JSON.stringify(received[key])}, expected ${JSON.stringify(value)}`,
    )
}
const page = await get('/lists/x', { host: 'raspberrypi.local' })
if (page.status !== 200)
  fail(`/lists/x with Host raspberrypi.local answered ${page.status}, expected 200`)

console.log(
  'proxy-headers-check: LAN host served, Cf-Ray / Cf-Connecting-Ip / Cf-Access-Jwt-Assertion passed through unchanged',
)
stop()
upstream.close()
