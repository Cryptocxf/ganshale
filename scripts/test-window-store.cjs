const fs = require('node:fs')
const path = require('node:path')
const root = path.join(__dirname, '..')
if (!process.versions.electron) {
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const result = require('node:child_process').spawnSync(require('electron'), [__filename], { env, encoding: 'utf8', windowsHide: true, timeout: 60000 })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  process.exit(result.status ?? 1)
}
const { app, BrowserWindow } = require('electron')
const ts = require('typescript')
const profile = path.join(root, '.private', 'window-store-test')
fs.mkdirSync(profile, { recursive: true })
app.setPath('userData', profile)
const compile = (file) => ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } })
  await win.loadFile(path.join(__dirname, 'fixtures', 'window-store.html'))
  const result = await win.webContents.executeJavaScript(`(async () => {
    const clock = { exports: {} }, store = { exports: {} };
    new Function('exports', ${JSON.stringify(compile('src/lib/timeutil.ts'))})(clock.exports);
    new Function('exports', 'require', ${JSON.stringify(compile('src/lib/idbStore.ts'))})(store.exports, () => clock.exports);
    await store.exports.getAllBuckets();
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('ganshale_aw', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const first = new Date(2026, 9, 25).getTime();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite'), events = tx.objectStore('events');
      events.clear();
      for (let day = 0; day < 3; day++) for (let i = 0; i < 4000; i++) events.put({ id: day + '-' + i, bucket_id: 'window', timestamp: new Date(first + day * 86400000 + i * 1000).toISOString(), duration: 1, data: { app: 'Code.exe', title: 'test-' + i } });
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    let visited = 0;
    const original = IDBCursor.prototype.continue;
    IDBCursor.prototype.continue = function (...args) { visited++; return original.apply(this, args); };
    const start = performance.now();
    const days = await store.exports.getDistinctWindowEventLocalDays('window');
    const metadataMs = performance.now() - start;
    IDBCursor.prototype.continue = original;
    if (days.size !== 3 || visited !== 3) throw Error('Expected one cursor jump per day, got ' + visited);
    const rangeStart = new Date(first + 86400000).toISOString(), rangeEnd = new Date(first + 2 * 86400000 - 1).toISOString();
    const rows = await store.exports.getEventsInRange('window', rangeStart, rangeEnd);
    if (rows.length !== 4000 || rows.some(row => !row.id.startsWith('1-'))) throw Error('Date range lost or leaked events');
    await store.exports.putEvent({ id: 'new-app', bucket_id: 'window', timestamp: new Date(first + 86400000 + 5000000).toISOString(), duration: 0, data: { app: 'NewApp.exe', title: 'new-window' } });
    const updated = await store.exports.getEventsInRange('window', rangeStart, rangeEnd);
    if (updated.length !== 4001 || !updated.some(row => row.id === 'new-app')) throw Error('Fresh sample not visible');
    db.close();
    return { seededRecords: 12000, metadataCursorSteps: visited, metadataMs: Math.round(metadataMs), selectedDayRecords: rows.length, newWindowVisible: true };
  })()`)
  console.log('PASS: isolated IndexedDB integration', JSON.stringify(result))
  win.destroy()
  app.quit()
}).catch((error) => { console.error(error.message); app.exit(1) })
