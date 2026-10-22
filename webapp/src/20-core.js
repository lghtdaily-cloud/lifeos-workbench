/* ============================================================
   1. 常量与体系
   ============================================================ */
const APP_KEY = 'lifeos.v1'
const TODAY = new Date()
const iso = d => {
  const x = d instanceof Date ? d : new Date(d)
  return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0')
}
const todayISO = () => iso(TODAY)
const dayOffset = n => { const d = new Date(TODAY); d.setDate(d.getDate()+n); return iso(d) }
const d2 = n => String(n).padStart(2,'0')
const nowTime = () => { const d=new Date(); return d2(d.getHours())+':'+d2(d.getMinutes()) }

/* 人生链条：四大线索 */
const CHAINS = [
  {k:'culture', n:'文化服务', c:'#6B7A63', d:'为他人提供与文化艺术相关的实际服务：教学、讲解、策展执行、社区工作坊'},
  {k:'world',   n:'见识世界', c:'#6B7488', d:'扩大自己的认知边界：展览、驻留、调研、跨地域的学习与交流'},
  {k:'people',  n:'人际合作', c:'#B0826A', d:'与他人建立真实连接：团队项目、同行交流、志愿协作、甲方合作'},
  {k:'temper',  n:'性情修养', c:'#8A7280', d:'塑造自己的长期状态：身体、阅读、写作、独处与情绪的整理'}
]

/* 项目状态 */
const PSTATUS = {
  candidate:{n:'候选', c:'tag'},
  signed:   {n:'已报名', c:'tag p'},
  done:     {n:'已完成', c:'tag a'},
  dropped:  {n:'已放弃', c:'tag x'}
}

/* 甲方类型 —— 用于需求洞察 */
const ORG_TYPES = {
  school:'高校院系', museum:'博物馆/美术馆', assoc:'行业协会/基金会',
  enterprise:'企业/品牌', media:'媒体/平台', gov:'政府/事业单位',
  festival:'艺术节/双年展', community:'社区/民间团体', unknown:'待确认'
}

/* ============================================================
   2. 存储层
   ============================================================ */
const DEFAULT_DB = {
  projects: [],     // 活动库
  todos: [],        // 待办库
  reviews: [],      // 复盘记录
  notes: [],        // 语音/文字笔记
  picks: [],        // 每周推荐（待我筛选）
  chains: {},       // 链条进度 {culture:{goal,notes}}
  myProfile: {      // 我的资料 / 简历（自动带进邮件报名）
    name:'', school:'四川美术学院', major:'', grade:'', phone:'', email:'',
    oneLiner:'', resumeText:'', resumeName:'', updatedAt:0
  },
  meta: { lastWeekPick:'', createdAt:Date.now(), theme:'' },
  removed: []       // 已删除项目 id（持久化，自动化不得再加回）
}

/* 深拷贝：structuredClone 在部分 WebView（含旧版微信 X5）不可用，降级到 JSON */
const deepClone = (typeof structuredClone === 'function')
  ? structuredClone
  : o => JSON.parse(JSON.stringify(o))

let DB = load()

function load(){
  try{
    const raw = localStorage.getItem(APP_KEY)
    if(!raw) return deepClone(DEFAULT_DB)
    const d = JSON.parse(raw)
    return Object.assign(deepClone(DEFAULT_DB), d, {
      meta: Object.assign({}, DEFAULT_DB.meta, d.meta||{}),
      chains: Object.assign({}, DEFAULT_DB.chains, d.chains||{})
    })
  }catch(e){ return deepClone(DEFAULT_DB) }
}
let saveTimer = null
function save(){
  clearTimeout(saveTimer)
  saveTimer = setTimeout(()=>{
    try{ localStorage.setItem(APP_KEY, JSON.stringify(DB)) }
    catch(e){ toast('保存失败：存储空间可能已满') }
  }, 180)
}
function saveNow(){ clearTimeout(saveTimer); try{ localStorage.setItem(APP_KEY, JSON.stringify(DB)) }catch(e){} }

/* ============================================================
   3. 工具
   ============================================================ */
function $(s, r){ return (r||document).querySelector(s) }
function $$(s, r){ return Array.from((r||document).querySelectorAll(s)) }
function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c => (
    {'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]
  ))
}
let toastT = null
function toast(msg){
  const el = $('#toast')
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(toastT)
  toastT = setTimeout(()=>el.classList.remove('show'), 2400)
}
const uid = () => 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7)
const clamp = (v,a,b) => Math.max(a, Math.min(b, v))
function daysLeft(dateStr){
  if(!dateStr) return null
  const d = new Date(dateStr + 'T23:59:59')
  if(isNaN(d)) return null
  return Math.round((d - TODAY) / 86400000)
}
function fmtDate(d){
  if(!d) return ''
  const dt = new Date(d)
  if(isNaN(dt)) return d
  const t = iso(dt)
  if(t === todayISO()) return '今天'
  if(t === dayOffset(1)) return '明天'
  if(t === dayOffset(-1)) return '昨天'
  if(t === dayOffset(2)) return '后天'
  return t.slice(5).replace('-','/')
}
function fmtDateFull(d){ return d ? String(d).slice(0,10) : '未设' }
function relDeadline(dl){
  const d = daysLeft(dl)
  if(d === null) return {txt:'', cls:''}
  if(d < 0) return {txt:'已过 '+(-d)+' 天', cls:'x'}
  if(d === 0) return {txt:'今天截止', cls:'o'}
  if(d <= 3) return {txt:'剩 '+d+' 天', cls:'o'}
  if(d <= 7) return {txt:'剩 '+d+' 天', cls:'p'}
  return {txt:'剩 '+d+' 天', cls:''}
}
function copyText(txt){
  const done = () => toast('已复制：'+String(txt).slice(0,28)+(String(txt).length>28?'…':''))
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(txt).then(done).catch(()=>fallbackCopy(txt,done))
  } else fallbackCopy(txt,done)
}
function fallbackCopy(txt, cb){
  const ta = document.createElement('textarea')
  ta.value = txt
  ta.style.cssText = 'position:fixed;left:-9999px;top:0'
  document.body.appendChild(ta)
  ta.select()
  try{ document.execCommand('copy'); cb() }catch(e){ toast('复制失败，请手动选择') }
  document.body.removeChild(ta)
}

/* ============================================================
   4. 链接 → 结构化事件卡 解析器
   规则优先：先按标签拆字段，再按正则兜底抓取
   ============================================================ */
const RX = {
  time: /(20\d{2})[年\-/.](\d{1,2})[月\-/.](\d{1,2})日?|(\d{1,2})月(\d{1,2})[日号]/,
  timeRange: /(\d{1,2})[:：](\d{2})\s*[-–~至到]\s*(\d{1,2})[:：](\d{2})/,
  place: /(?:地点|地址|场地|举办地点|活动地点)[:：]\s*([^\n。；;]{2,40})/,
  online: /(线上|腾讯会议|微信会议|钉钉|ZOOM|zoom|飞书|哔哩哔哩直播|视频方式|云端)/,
  deadline: /(?:报名截止|截止(?:日期|时间)?|截止到|申请截止|投稿截止|ddl|DDL)[:：]?\s*([^\n。；;]{2,32})/,
  fee: /(?:费用|报名费|学费|工本费|参展费)[:：]?\s*([^\n。；;]{0,30})/,
  mail: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  wechat: /(?:微信|WeChat|VX|vx|weixin)[:：]?\s*([A-Za-z0-9_-]{5,24})/,
  phone: /(1[3-9]\d{9})/,
  age: /(?:年龄|年级)[:：]?\s*([^\n。；;]{0,26})/,
  major: /(?:专业|面向)[:：]?\s*([^\n。；;]{0,30})/,
  count: /(?:名额|招募|招录|招收|计划)(?:人数|名额)?[:：]?\s*(\d+)\s*(?:人|名|位)/,
  fee0: /(免费|免报名费|免学费|不收取任何费用|0元)/,
  require: /(作品集|个人简历|简历|自述|报名表|身份证明|学生证|获奖证明|技术方案|创作计划|一分钟视频|视频作品集|设计稿|方案文本|推荐信)/
}

function parseLink(raw){
  const text = String(raw||'')
  const urlM = text.match(/https?:\/\/[^\s，,。；;"'）)]+/)
  const url = urlM ? urlM[0] : ''
  const body = url ? text.replace(url,'').trim() : text.trim()

  const p = {
    url, title:'', org:'', start:'', end:'', startTime:'', endTime:'',
    place:'', isOnline:false, deadline:'', fee:'', content:'',
    requirements:[], contacts:{email:'',wechat:'',phone:'',form:''},
    motivation:'', chains:[], missing:[], note:''
  }

  // 标题：优先第一行非空
  const lines = body.split(/\n+/).map(s=>s.trim()).filter(Boolean)
  p.title = lines[0] ? lines[0].slice(0,60) : (url ? url.split('/').pop().slice(0,40) : '未命名活动')
  if(lines[1] && lines[1].length < 40 && /[学院馆中心协会基金会大学研究所组委会工作室主办承办]/.test(lines[1])){
    p.org = lines[1]
  }
  // 内容：全文（去掉第一行标题）
  p.content = lines.slice(1).join('\n').slice(0,1200) || body.slice(0,1200)

  // 时间
  const tm = body.match(RX.time)
  if(tm){
    if(tm[1]){
      const mo = clamp(+tm[2],1,12), dy = clamp(+tm[3],1,31)
      p.start = tm[1]+'-'+d2(mo)+'-'+d2(dy)
    } else {
      const mo = clamp(+tm[4],1,12), dy = clamp(+tm[5],1,31)
      let cand = TODAY.getFullYear()+'-'+d2(mo)+'-'+d2(dy)
      if(new Date(cand+'T23:59:59').getTime() < TODAY.getTime() - 60*86400000) cand = (TODAY.getFullYear()+1)+'-'+d2(mo)+'-'+d2(dy)
      p.start = cand
    }
  }
  // 相对日期：「下周五」「本周三」「这周六」「下个月5号」
  if(!p.start){
    const rel = body.match(/(下周|下个星期|本周|这周|这星期|下个月|下月|本月|这个月)\s*([一二三四五六日天1-7])?/)
    if(rel){
      const wdMap = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'日':0,'天':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':0}
      const unit = rel[1]
      const target = wdMap[rel[2]] !== undefined ? wdMap[rel[2]] : null
      const d = new Date(TODAY)
      if(/下个?周|下个?星期/.test(unit)){
        d.setDate(d.getDate() + (7 - d.getDay()) + (target!==null ? (target===0?7:target) : 0))
      } else if(/下个月|下月/.test(unit)){
        d.setMonth(d.getMonth()+1)
        const md = body.match(/(\d{1,2})\s*[日号]/)
        d.setDate(md ? clamp(+md[1],1,28) : 1)
      } else if(target!==null){
        let diff = target - d.getDay()
        if(diff < 0) diff += 7
        d.setDate(d.getDate()+diff)
      }
      p.start = iso(d)
    }
  }
  const tr = body.match(RX.timeRange)
  if(tr){
    p.startTime = d2(+tr[1])+':'+tr[2]
    p.endTime = d2(+tr[3])+':'+tr[4]
  } else {
    const t1 = body.match(/(?:时间|时段)[:：]?\s*(\d{1,2})[:：](\d{2})/)
    if(t1) p.startTime = d2(+t1[1])+':'+t1[2]
  }
  // 结束日期
  const span = body.match(/(20\d{2}[年\-/.]\d{1,2}[月\-/.]\d{1,2}日?)\s*(?:[-–~至到—]{1,2})\s*(20\d{2}[年\-/.]\d{1,2}[月\-/.]\d{1,2}日?)/)
  if(span){
    const a = span[1].replace(/[年月]/g,'-').replace(/日/,'').replace(/\./g,'-').split('-')
    const b = span[2].replace(/[年月]/g,'-').replace(/日/,'').replace(/\./g,'-').split('-')
    p.start = a.join('-')
    p.end = b.join('-')
  }

  // 地点
  const pm = body.match(RX.place)
  if(pm) p.place = pm[1].trim()
  p.isOnline = RX.online.test(body) && (!p.place || /线上|在线|远程|直播/.test(p.place))
  if(!p.place && p.isOnline) p.place = '线上'

  // 截止
  const dm = body.match(RX.deadline)
  if(dm) p.deadline = normDate(dm[1])
  // 费用
  const fm = body.match(RX.fee)
  if(fm) p.fee = fm[1].trim()
  else if(RX.fee0.test(body)) p.fee = '免费'

  // 联系方式
  const mail = body.match(RX.mail)
  if(mail) p.contacts.email = mail[1]
  const wx = body.match(RX.wechat)
  if(wx) p.contacts.wechat = wx[1]
  const ph = body.match(RX.phone)
  if(ph) p.contacts.phone = ph[1]
  if(!p.contacts.form && url) p.contacts.form = url

  // 报名要求
  const reqs = []
  if(RX.require.test(body)) reqs.push('需提交材料（见原文）')
  const ageM = body.match(RX.age); if(ageM) reqs.push('年龄/年级：'+ageM[1].trim())
  const majM = body.match(RX.major); if(majM) reqs.push('专业要求：'+majM[1].trim())
  const cntM = body.match(RX.count); if(cntM) reqs.push('名额：'+cntM[1]+' 人')
  if(p.fee) reqs.push('费用：'+p.fee)
  p.requirements = reqs

  // 缺失字段自报
  if(!p.start) p.missing.push('活动时间')
  if(!p.place) p.missing.push('地点')
  if(!p.deadline) p.missing.push('报名截止')
  if(!p.contacts.email && !p.contacts.wechat && !p.contacts.phone && !p.contacts.form) p.missing.push('联系方式')

  // 链条推断
  p.chains = inferChains(p.title + ' ' + p.content + ' ' + p.org)
  return p
}

function normDate(s){
  if(!s) return ''
  const t = String(s).trim()
  let m = t.match(/(20\d{2})[年\-/.](\d{1,2})[月\-/.](\d{1,2})/)
  if(m) return m[1]+'-'+d2(+m[2])+'-'+d2(+m[3])
  m = t.match(/(\d{1,2})[月\/](\d{1,2})/)
  if(m){
    const y = TODAY.getFullYear()
    let c = y+'-'+d2(+m[1])+'-'+d2(+m[2])
    if(new Date(c+'T23:59:59').getTime() < TODAY.getTime() - 60*86400000) c = (y+1)+'-'+d2(+m[1])+'-'+d2(+m[2])
    return c
  }
  m = t.match(/^(\d{1,2})[日号]/)
  if(m) return todayISO().slice(0,8)+d2(+m[1])
  return ''
}

function inferChains(text){
  const t = String(text||'')
  const out = []
  if(/(志愿|讲解|社区|公益|服务|支教|公共教育|美育|授课|教学|文化遗产|非遗|石窟|壁画|考古|遗产保护|社区运营|社区营造|为民)/.test(t)) out.push('culture')
  if(/(展览|驻留|调研|研学|考察|采风|学术|论坛|讲座|博物馆|美术馆|敦煌|遗产|非遗|国际|交流)/.test(t)) out.push('world')
  if(/(合作|团队|组|搭档|联合|主办|协办|甲方|招募|伙伴|共创|志愿小队|社群)/.test(t)) out.push('people')
  if(/(读书|阅读|写作|身体|健身|瑜伽|冥想|独处|日记|课程|自我|修养|内在|情绪)/.test(t)) out.push('temper')
  return out.length ? out : ['world']
}

/* ============================================================
   5. 冲突检测（时间重叠 + 通勤不足）
   ============================================================ */
const TRANSIT_MIN = 30

function slotOf(p){
  if(!p.start) return null
  const startTs = new Date(p.start + (p.startTime ? 'T'+p.startTime : 'T00:00')).getTime()
  let endTs
  if(p.end) endTs = new Date(p.end + (p.endTime ? 'T'+p.endTime : 'T23:59')).getTime()
  else if(p.startTime && p.endTime) endTs = new Date(p.start + 'T'+p.endTime).getTime()
  else endTs = startTs + 3600000
  if(isNaN(startTs)) return null
  return { id:p._id, title:p.title, start:startTs, end:endTs, place:p.place||'', startDate:p.start, startTime:p.startTime||'', status:p.status }
}
function conflictsFor(project){
  const out = []
  const s = slotOf(project)
  if(!s) return out
  const all = DB.projects.filter(p => p._id !== project._id && p.start && p.status !== 'dropped')
  for(const other of all){
    const o = slotOf(other)
    if(!o) continue
    // 时间重叠
    if(s.start < o.end && o.start < s.end){
      out.push({type:'time', withId:o.id, withTitle:o.title, gap:0, need:0,
        msg:'时间重叠：与《'+o.title.slice(0,16)+'》撞期'})
      continue
    }
    // 通勤不足
    const a = s.start < o.start ? s : o
    const b = s.start < o.start ? o : s
    const gapMin = Math.round((b.start - a.end)/60000)
    if(gapMin < TRANSIT_MIN && a.place && b.place && a.place !== b.place){
      out.push({type:'transit', withId:b.id, withTitle:b.title, gap:gapMin, need:TRANSIT_MIN,
        msg:'通勤不足：从「'+String(a.place).slice(0,10)+'」到「'+String(b.place).slice(0,10)+'」只隔 '+gapMin+' 分钟'})
    }
  }
  return out
}
function conflictMap(){
  const m = {}
  DB.projects.forEach(p => { if(p.start) m[p._id] = conflictsFor(p) })
  return m
}

/* ============================================================
   6. 待办库
   ============================================================ */
const TODO_PRI = {high:{n:'高',c:'x'}, mid:{n:'中',c:'o'}, low:{n:'低',c:''}}
function addTodo(t){
  const o = Object.assign({
    _id: uid(), title:'', done:false, progress:0, priority:'mid',
    due:'', projectId:'', repeat:'', note:'', createdAt:Date.now(), doneAt:0, order:Date.now()
  }, t)
  DB.todos.unshift(o); save(); return o
}
function toggleTodo(id){
  const t = DB.todos.find(x=>x._id===id)
  if(!t) return
  t.done = !t.done
  t.doneAt = t.done ? Date.now() : 0
  t.progress = t.done ? 100 : (t.progress === 100 ? 50 : t.progress)
  // 重复待办：完成后按间隔顺延
  if(t.done && t.repeat){
    const m = t.repeat.match(/^(\d+)([dwmy])$/)
    if(m){
      const n = +m[1], u = m[2]
      const d = new Date(t.due || todayISO())
      if(u==='d') d.setDate(d.getDate()+n)
      else if(u==='w') d.setDate(d.getDate()+n*7)
      else if(u==='m') d.setMonth(d.getMonth()+n)
      else d.setFullYear(d.getFullYear()+n)
      t.due = iso(d); t.done = false; t.progress = 0; t.doneAt = 0
    }
  }
  save()
}
function todosOfProject(pid){ return DB.todos.filter(t=>t.projectId===pid) }

/* ============================================================
   7. 链条进度
   ============================================================ */
function chainProgress(key){
  const ps = DB.projects.filter(p => (p.chains||[]).includes(key))
  const done = ps.filter(p => p.status==='done')
  const c = DB.chains[key] || {goal:'', notes:[]}
  return {
    total: ps.length, done: done.length,
    pct: ps.length ? Math.round(done.length/ps.length*100) : 0,
    active: ps.filter(p => p.status!=='done' && p.status!=='dropped').length,
    goal: c.goal || '', notes: c.notes || []
  }
}
