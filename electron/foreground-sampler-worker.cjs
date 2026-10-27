// Windows native foreground queries may block synchronously. Keep them out of Electron's main process.
process.on('message', async ({ id }) => {
  try {
    const module = await import('active-win')
    const query = module.activeWindow ?? module.default
    const result = await query()
    if (process.connected) process.send({ id, result: result ?? null })
  } catch (error) {
    if (process.connected) process.send({ id, error: error instanceof Error ? error.message : String(error) })
  }
})
process.on('disconnect', () => process.exit(0))
