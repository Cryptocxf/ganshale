const { fork } = require('node:child_process')
const path = require('node:path')

function createForegroundSampler({ timeoutMs = 8000, forkProcess = fork } = {}) {
  let child = null
  let pending = null
  let sequence = 0
  const stop = () => {
    const previous = child
    child = null
    if (pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Foreground sampler stopped'))
      pending = null
    }
    if (previous) previous.kill()
  }
  const sample = () => {
    if (pending) return pending.promise
    if (!child) {
      const worker = forkProcess(path.join(__dirname, 'foreground-sampler-worker.cjs'), [], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        windowsHide: true,
        silent: true,
      })
      child = worker
      worker.stdout?.resume()
      worker.stderr?.resume()
      worker.on('message', (message) => {
        if (child !== worker || pending?.id !== message.id) return
        const current = pending
        pending = null
        clearTimeout(current.timer)
        if (message.error) current.reject(new Error(message.error))
        else current.resolve(message.result)
      })
      const failed = () => { if (child === worker) stop() }
      worker.on('error', failed)
      worker.on('exit', failed)
    }
    const id = ++sequence
    let resolve, reject
    const promise = new Promise((yes, no) => { resolve = yes; reject = no })
    const timer = setTimeout(() => {
      if (pending?.id !== id) return
      const current = pending
      pending = null
      current.reject(new Error(`Foreground query timed out after ${timeoutMs}ms`))
      stop()
    }, timeoutMs)
    pending = { id, resolve, reject, timer, promise }
    try { child.send({ id }) } catch (error) { stop() }
    return promise
  }
  return { sample, stop }
}

module.exports = { createForegroundSampler }
