const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText, filename)
const config = require('../src/lib/llmUserConfig.ts')
const monthly = config.DEFAULT_MONTHLY_REPORT_GENERATION_PROMPT
assert.ok(monthly.includes('# 月报 YYYY-MM'))
assert.ok(monthly.includes('以本月各周周报为主要依据'))
assert.ok(monthly.includes('严格不超过200字'))
assert.ok(!monthly.includes('无任何200字上限要求'))
assert.ok(!monthly.includes('正文不设字数上限'))
for (const rule of [
  '说明需求与问题背景、研发目标、实施动作、关键技术与方案、开发或联调过程、测试验证、问题定位与解决、阶段进展、交付产出及实际价值',
  '保留具体项目、模块、接口、模型、文档和已有指标',
  '不得编造技术实现、测试结论、性能提升、量化成果或完成状态',
  '“序号”“工作板块”“工作内容”',
]) {
  assert.ok(config.DEFAULT_WEEKLY_REPORT_GENERATION_PROMPT.includes(rule))
  assert.ok(monthly.includes(rule), `monthly must preserve weekly rule: ${rule}`)
}
// Capture the exact prior shipped default to verify upgrades, without touching localStorage.
const source = fs.readFileSync(require.resolve('../src/lib/llmUserConfig.ts'), 'utf8')
const oldBlock = source.match(/const PREVIOUS_RD_MONTHLY_REPORT_GENERATION_PROMPT = (\[[\s\S]*?\]\.join\('\\n'\))/)[1]
const oldDefault = Function(`return ${oldBlock}`)()
assert.equal(config.normalizeStoredMonthlyReportPrompt(oldDefault), monthly)
assert.equal(config.normalizeStoredMonthlyReportPrompt('我的自定义月报提示词'), '我的自定义月报提示词')
console.log('PASS: monthly preserves weekly writing rules, adds length limits, migrates old default and preserves custom prompts')
