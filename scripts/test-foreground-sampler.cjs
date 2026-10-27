const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { createForegroundSampler } = require('../electron/foregroundSampler.cjs')

async function main() {
  const workers = []
  const sampler = createForegroundSampler({
    timeoutMs: 20,
    forkProcess: () => {
      const child = new EventEmitter()
      child.kill = () => { child.killed = true; child.emit('exit') }
      child.send = ({ id }) => {
        if (workers.length > 1) setImmediate(() => child.emit('message', { id, result: { title: 'recovered' } }))
      }
      workers.push(child)
      return child
    },
  })
  const pending = sampler.sample()
  assert.equal(sampler.sample(), pending, 'concurrent polls share one request')
  await assert.rejects(pending, /timed out/)
  assert.ok(workers[0].killed, 'blocked worker is terminated')
  assert.equal((await sampler.sample()).title, 'recovered', 'next poll recovers in new process')
  sampler.stop()
  assert.ok(workers[1].killed)
  console.log('PASS: concurrent sampling, timeout termination, fresh-process recovery and shutdown')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
