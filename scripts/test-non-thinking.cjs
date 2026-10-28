const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText, filename)
const originalLoad = Module._load
Module._load = function (id, parent, ...rest) {
  if (id === './llmFetchBaseUrl') return { resolveLlmFetchBaseUrl: value => value, llmUpstreamHeaders: () => ({}) }
  return originalLoad.call(this, id, parent, ...rest)
}
const { chatCompletion, streamChatCompletion } = require('../src/lib/llmOpenAI.ts')
async function main() {
  for (const model of ['qwen3.5-plus', 'qwen3.5-flash', 'deepseek-v4-pro']) {
    for (const stream of [false, true]) {
      global.fetch = async (_url, options) => {
        const body = JSON.parse(options.body)
        assert.equal(body.enable_thinking, false)
        assert.equal(body.stream, stream)
        if (model.includes('deepseek')) assert.deepEqual(body.thinking, { type: 'disabled' })
        else assert.equal(body.thinking, undefined)
        return stream
          ? new Response('data: {"choices":[{"delta":{"content":"完成"}}]}\n\ndata: [DONE]\n\n')
          : new Response(JSON.stringify({ choices: [{ message: { content: '完成' } }] }))
      }
      const options = { baseUrl: 'https://example.invalid/v1', apiKey: 'test', model, messages: [{ role: 'user', content: '总结' }] }
      if (stream) {
        let result = ''
        await streamChatCompletion({ ...options, onDelta: text => { result += text } })
        assert.equal(result, '完成')
      } else assert.equal(await chatCompletion(options), '完成')
    }
  }
  const mainSource = fs.readFileSync('electron/main.cjs', 'utf8')
  assert.ok(mainSource.includes("title: '干啥了',"))
  console.log('PASS: all three models disable thinking in streaming/non-streaming requests; title is product name only')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
