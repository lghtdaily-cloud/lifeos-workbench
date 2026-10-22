#!/usr/bin/env node
/**
 * build.js —— 把 lifeos/src/* 拼成单文件 lifeos/index.html
 * 顺序固定：00-head(HTML+CSS) → 10-body(markup) → 20-core → 30-views → 40-actions → 50-boot
 * 拼完做语法自检：抽出 <script> 用 new Function 验一遍
 */
const fs = require('fs')
const path = require('path')

const DIR = __dirname
const SRC = path.join(DIR, 'src')
const DIST = path.join(DIR, 'dist')
const OUT = path.join(DIST, 'index.html')
if(!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true })

const ORDER = ['00-head.html','10-body.html','20-core.js','30-views.js','40-actions.js','50-boot.js']

let out = ''
ORDER.forEach(f => {
  const p = path.join(SRC, f)
  if(!fs.existsSync(p)){ console.error('缺文件: '+f); process.exit(1) }
  const t = fs.readFileSync(p,'utf8')
  out += t
  if(!t.endsWith('\n')) out += '\n'
})
out += '\n</script>\n</body>\n</html>\n'

fs.writeFileSync(OUT, out, 'utf8')
console.log('构建完成: '+OUT)
console.log('长度: '+out.length+' 字符')

// —— 语法自检 ——
const m = out.match(/<script>([\s\S]*?)<\/script>/)
if(!m){ console.error('未找到 script 块'); process.exit(1) }
try{
  new Function(m[1])
  console.log('✓ 内联脚本语法通过')
}catch(e){
  console.error('✗ 语法错误: '+e.message)
  process.exit(1)
}

// —— 结构自检 ——
const checks = [
  ['DOCTYPE', '<!DOCTYPE html>'],
  ['</html> 闭合', '</html>'],
  ['viewToday', 'function viewToday'],
  ['viewLib', 'function viewLib'],
  ['viewTodo', 'function viewTodo'],
  ['viewCal', 'function viewCal'],
  ['viewReview', 'function viewReview'],
  ['viewNote', 'function viewNote'],
  ['viewChain', 'function viewChain'],
  ['viewPicks', 'function viewPicks'],
  ['链接解析器', 'function parseLink'],
  ['冲突检测', 'function conflictsFor'],
  ['邮件报名', 'function openMail'],
  ['需求洞察', 'function openInsight'],
  ['语音识别', 'function toggleRec'],
  ['备份导入导出', 'function openBackup'],
  ['主题切换', 'function toggleTheme'],
  ['示例数据', 'function seedDemo'],
]
let fail = 0
checks.forEach(([n,s])=>{
  const ok = out.includes(s)
  console.log('  '+(ok?'✓':'✗')+' '+n)
  if(!ok) fail++
})
console.log(fail ? '\n❌ '+fail+' 项缺失' : '\n✅ 全部通过')
process.exit(fail?1:0)
