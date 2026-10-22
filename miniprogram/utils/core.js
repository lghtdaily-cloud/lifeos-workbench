// utils/core.js —— 小程序端核心业务逻辑
// 与网页版 lifeos/src/20-core.js + 30-views.js 保持同源语义。
// 改动规则：两边一起改，别只改一处。

const APP_KEY = 'lifeos_db_v1'

const CHAINS = [
  { k: 'culture', n: '文化服务', c: '#6B7A63', d: '为他人提供与文化艺术相关的实际服务：教学、讲解、策展执行、社区工作坊' },
  { k: 'world', n: '见识世界', c: '#6B7488', d: '扩大认知边界：展览、驻留、调研、跨地域的学习与交流' },
  { k: 'people', n: '人际合作', c: '#B0826A', d: '与他人建立真实连接：团队项目、同行交流、志愿协作、甲方合作' },
  { k: 'temper', n: '性情修养', c: '#8A7280', d: '塑造长期状态：身体、阅读、写作、独处与情绪的整理' }
]

const PSTATUS = {
  candidate: { n: '候选', c: 'tag' },
  signed: { n: '已报名', c: 'tag p' },
  done: { n: '已完成', c: 'tag a' },
  dropped: { n: '已放弃', c: 'tag x' }
}

const TODO_PRI = { high: { n: '高', c: 'x' }, mid: { n: '中', c: 'o' }, low: { n: '低', c: '' } }

const d2 = n => String(n).padStart(2, '0')
const iso = d => {
  const x = d instanceof Date ? d : new Date(d)
  return x.getFullYear() + '-' + d2(x.getMonth() + 1) + '-' + d2(x.getDate())
}
const todayISO = () => iso(new Date())
const dayOffset = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }
const uid = () => 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function daysLeft(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T23:59:59')
  if (isNaN(d)) return null
  return Math.round((d - new Date()) / 86400000)
}
function fmtDate(d) {
  if (!d) return ''
  const t = iso(new Date(d))
  const now = todayISO()
  if (t === now) return '今天'
  if (t === dayOffset(1)) return '明天'
  if (t === dayOffset(-1)) return '昨天'
  if (t === dayOffset(2)) return '后天'
  return t.slice(5).replace('-', '/')
}
function fmtDateFull(d) { return d ? String(d).slice(0, 10) : '未设' }
function relDeadline(dl) {
  const d = daysLeft(dl)
  if (d === null) return { txt: '', cls: '' }
  if (d < 0) return { txt: '已过 ' + (-d) + ' 天', cls: 'x' }
  if (d === 0) return { txt: '今天截止', cls: 'o' }
  if (d <= 3) return { txt: '剩 ' + d + ' 天', cls: 'o' }
  if (d <= 7) return { txt: '剩 ' + d + ' 天', cls: 'p' }
  return { txt: '剩 ' + d + ' 天', cls: '' }
}

/* ---------------- 存储 ---------------- */
const DEFAULT_DB = {
  projects: [], todos: [], reviews: [], notes: [], picks: [],
  chains: {}, removed: [],
  myProfile: {
    name: '', school: '四川美术学院', major: '', grade: '', phone: '', email: '',
    oneLiner: '', resumeText: '', resumeName: '', updatedAt: 0
  },
  meta: { createdAt: Date.now(), lastWeekPick: '' }
}

function load() {
  try {
    const raw = wx.getStorageSync(APP_KEY)
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DB))
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw
    const base = JSON.parse(JSON.stringify(DEFAULT_DB))
    return Object.assign(base, d, {
      meta: Object.assign({}, base.meta, d.meta || {}),
      chains: Object.assign({}, base.chains, d.chains || {})
    })
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_DB))
  }
}
function save(db) {
  try { wx.setStorageSync(APP_KEY, db) } catch (e) { console.error('保存失败', e) }
}

/* ---------------- 链接解析 ---------------- */
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

function normDate(s) {
  if (!s) return ''
  const t = String(s).trim()
  let m = t.match(/(20\d{2})[年\-/.](\d{1,2})[月\-/.](\d{1,2})/)
  if (m) return m[1] + '-' + d2(+m[2]) + '-' + d2(+m[3])
  m = t.match(/(\d{1,2})[月\/](\d{1,2})/)
  if (m) {
    const y = new Date().getFullYear()
    let c = y + '-' + d2(+m[1]) + '-' + d2(+m[2])
    if (new Date(c + 'T23:59:59').getTime() < Date.now() - 60 * 86400000) c = (y + 1) + '-' + d2(+m[1]) + '-' + d2(+m[2])
    return c
  }
  m = t.match(/^(\d{1,2})[日号]/)
  if (m) return todayISO().slice(0, 8) + d2(+m[1])
  return ''
}

function parseLink(raw) {
  const text = String(raw || '')
  const urlM = text.match(/https?:\/\/[^\s，,。；;"'）)]+/)
  const url = urlM ? urlM[0] : ''
  const body = url ? text.replace(url, '').trim() : text.trim()

  const p = {
    url, title: '', org: '', start: '', end: '', startTime: '', endTime: '',
    place: '', isOnline: false, deadline: '', fee: '', content: '',
    requirements: [], contacts: { email: '', wechat: '', phone: '', form: '' },
    motivation: '', chains: [], missing: []
  }

  const lines = body.split(/\n+/).map(s => s.trim()).filter(Boolean)
  p.title = lines[0] ? lines[0].slice(0, 60) : (url ? url.split('/').pop().slice(0, 40) : '未命名活动')
  if (lines[1] && lines[1].length < 40 && /[学院馆中心协会基金会大学研究所组委会工作室主办承办]/.test(lines[1])) p.org = lines[1]
  p.content = lines.slice(1).join('\n').slice(0, 1200) || body.slice(0, 1200)

  // 时间
  const tm = body.match(RX.time)
  if (tm) {
    if (tm[1]) {
      p.start = tm[1] + '-' + d2(clamp(+tm[2], 1, 12)) + '-' + d2(clamp(+tm[3], 1, 31))
    } else {
      const mo = clamp(+tm[4], 1, 12), dy = clamp(+tm[5], 1, 31)
      let cand = new Date().getFullYear() + '-' + d2(mo) + '-' + d2(dy)
      if (new Date(cand + 'T23:59:59').getTime() < Date.now() - 60 * 86400000) cand = (new Date().getFullYear() + 1) + '-' + d2(mo) + '-' + d2(dy)
      p.start = cand
    }
  }
  // 相对日期
  if (!p.start) {
    const rel = body.match(/(下周|下个星期|本周|这周|这星期|下个月|下月|本月|这个月)\s*([一二三四五六日天1-7])?/)
    if (rel) {
      const wdMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 0 }
      const unit = rel[1]
      const target = wdMap[rel[2]] !== undefined ? wdMap[rel[2]] : null
      const d = new Date()
      if (/下个?周|下个?星期/.test(unit)) {
        d.setDate(d.getDate() + (7 - d.getDay()) + (target !== null ? (target === 0 ? 7 : target) : 0))
      } else if (/下个月|下月/.test(unit)) {
        d.setMonth(d.getMonth() + 1)
        const md = body.match(/(\d{1,2})\s*[日号]/)
        d.setDate(md ? clamp(+md[1], 1, 28) : 1)
      } else if (target !== null) {
        let diff = target - d.getDay()
        if (diff < 0) diff += 7
        d.setDate(d.getDate() + diff)
      }
      p.start = iso(d)
    }
  }
  const tr = body.match(RX.timeRange)
  if (tr) {
    p.startTime = d2(+tr[1]) + ':' + tr[2]
    p.endTime = d2(+tr[3]) + ':' + tr[4]
  } else {
    const t1 = body.match(/(?:时间|时段)[:：]?\s*(\d{1,2})[:：](\d{2})/)
    if (t1) p.startTime = d2(+t1[1]) + ':' + t1[2]
  }
  const span = body.match(/(20\d{2}[年\-/.]\d{1,2}[月\-/.]\d{1,2}日?)\s*(?:[-–~至到—]{1,2})\s*(20\d{2}[年\-/.]\d{1,2}[月\-/.]\d{1,2}日?)/)
  if (span) {
    const a = span[1].replace(/[年月]/g, '-').replace(/日/, '').replace(/\./g, '-').split('-')
    const b = span[2].replace(/[年月]/g, '-').replace(/日/, '').replace(/\./g, '-').split('-')
    p.start = a.join('-')
    p.end = b.join('-')
  }

  const pm = body.match(RX.place)
  if (pm) p.place = pm[1].trim()
  p.isOnline = RX.online.test(body) && (!p.place || /线上|在线|远程|直播/.test(p.place))
  if (!p.place && p.isOnline) p.place = '线上'

  const dm = body.match(RX.deadline)
  if (dm) p.deadline = normDate(dm[1])
  const fm = body.match(RX.fee)
  if (fm) p.fee = fm[1].trim()
  else if (RX.fee0.test(body)) p.fee = '免费'

  const mail = body.match(RX.mail)
  if (mail) p.contacts.email = mail[1]
  const wx = body.match(RX.wechat)
  if (wx) p.contacts.wechat = wx[1]
  const ph = body.match(RX.phone)
  if (ph) p.contacts.phone = ph[1]
  if (!p.contacts.form && url) p.contacts.form = url

  const reqs = []
  if (RX.require.test(body)) reqs.push('需提交材料（见原文）')
  const ageM = body.match(RX.age); if (ageM) reqs.push('年龄/年级：' + ageM[1].trim())
  const majM = body.match(RX.major); if (majM) reqs.push('专业要求：' + majM[1].trim())
  const cntM = body.match(RX.count); if (cntM) reqs.push('名额：' + cntM[1] + ' 人')
  if (p.fee) reqs.push('费用：' + p.fee)
  p.requirements = reqs

  if (!p.start) p.missing.push('活动时间')
  if (!p.place) p.missing.push('地点')
  if (!p.deadline) p.missing.push('报名截止')
  if (!p.contacts.email && !p.contacts.wechat && !p.contacts.phone && !p.contacts.form) p.missing.push('联系方式')

  p.chains = inferChains(p.title + ' ' + p.content + ' ' + p.org)
  return p
}

function inferChains(text) {
  const t = String(text || '')
  const out = []
  if (/(志愿|讲解|社区|公益|服务|支教|公共教育|美育|授课|教学|文化遗产|非遗|石窟|壁画|考古|遗产保护|社区运营|社区营造|为民)/.test(t)) out.push('culture')
  if (/(展览|驻留|调研|研学|考察|采风|学术|论坛|讲座|博物馆|美术馆|敦煌|遗产|非遗|国际|交流)/.test(t)) out.push('world')
  if (/(合作|团队|组|搭档|联合|主办|协办|甲方|招募|伙伴|共创|志愿小队|社群)/.test(t)) out.push('people')
  if (/(读书|阅读|写作|身体|健身|瑜伽|冥想|独处|日记|课程|自我|修养|内在|情绪)/.test(t)) out.push('temper')
  return out.length ? out : ['world']
}

function inferCats(p) {
  const t = [p.title, p.org, p.content, p.place].join(' ')
  const c = []
  if (/(学术|论坛|研讨会|沙龙|讲座|征稿|论文|课题|研究|研修|学术营|读书会|理论|批评|策展研究)/.test(t)) c.push('academic')
  if (/(工作坊|招募|实践|报名|征集|参赛|竞赛|大赛|展览|驻留|创作营|训练营|实训|志愿服务|实习|市集|演出|公教|美育|体验营)/.test(t)) c.push('practice')
  if (/(四川美术学院|川美|造型艺术|实验艺术|艺术人文|公共艺术|建筑与环境设计|中国画与书法|动画影视|设计学院|美术馆)/.test(t)) c.push('scfai')
  if (/(重庆|渝|巴渝|山城|两江|川渝|成渝|西南大学|重庆大学)/.test(t)) c.push('chongqing')
  return c
}

/* ---------------- 冲突检测 ---------------- */
const TRANSIT_MIN = 30

function slotOf(p) {
  if (!p.start) return null
  const startTs = new Date(p.start + (p.startTime ? 'T' + p.startTime : 'T00:00')).getTime()
  let endTs
  if (p.end) endTs = new Date(p.end + (p.endTime ? 'T' + p.endTime : 'T23:59')).getTime()
  else if (p.startTime && p.endTime) endTs = new Date(p.start + 'T' + p.endTime).getTime()
  else endTs = startTs + 3600000
  if (isNaN(startTs)) return null
  return { id: p._id, title: p.title, start: startTs, end: endTs, place: p.place || '' }
}

function conflictsFor(project, all) {
  const out = []
  const s = slotOf(project)
  if (!s) return out
  const list = (all || []).filter(p => p._id !== project._id && p.start && p.status !== 'dropped')
  for (const other of list) {
    const o = slotOf(other)
    if (!o) continue
    if (s.start < o.end && o.start < s.end) {
      out.push({ type: 'time', withId: o.id, withTitle: o.title, gap: 0, need: 0,
        msg: '时间重叠：与《' + String(o.title).slice(0, 16) + '》撞期' })
      continue
    }
    const a = s.start < o.start ? s : o
    const b = s.start < o.start ? o : s
    const gapMin = Math.round((b.start - a.end) / 60000)
    if (gapMin < TRANSIT_MIN && a.place && b.place && a.place !== b.place) {
      out.push({ type: 'transit', withId: b.id, withTitle: b.title, gap: gapMin, need: TRANSIT_MIN,
        msg: '通勤不足：从「' + String(a.place).slice(0, 10) + '」到「' + String(b.place).slice(0, 10) + '」只隔 ' + gapMin + ' 分钟' })
    }
  }
  return out
}

function conflictMap(projects) {
  const m = {}
  ;(projects || []).forEach(p => { if (p.start) m[p._id] = conflictsFor(p, projects) })
  return m
}

/* ---------------- 待办 ---------------- */
function toggleTodo(db, id) {
  const t = (db.todos || []).find(x => x._id === id)
  if (!t) return db
  t.done = !t.done
  t.doneAt = t.done ? Date.now() : 0
  t.progress = t.done ? 100 : (t.progress === 100 ? 50 : t.progress)
  if (t.done && t.repeat) {
    const m = t.repeat.match(/^(\d+)([dwmy])$/)
    if (m) {
      const n = +m[1], u = m[2]
      const d = new Date(t.due || todayISO())
      if (u === 'd') d.setDate(d.getDate() + n)
      else if (u === 'w') d.setDate(d.getDate() + n * 7)
      else if (u === 'm') d.setMonth(d.getMonth() + n)
      else d.setFullYear(d.getFullYear() + n)
      t.due = iso(d); t.done = false; t.progress = 0; t.doneAt = 0
    }
  }
  return db
}

/* ---------------- 链条进度 ---------------- */
function chainProgress(db, key) {
  const ps = (db.projects || []).filter(p => (p.chains || []).includes(key))
  const done = ps.filter(p => p.status === 'done')
  const c = (db.chains && db.chains[key]) || { goal: '', notes: [] }
  return {
    total: ps.length, done: done.length,
    pct: ps.length ? Math.round(done.length / ps.length * 100) : 0,
    active: ps.filter(p => p.status !== 'done' && p.status !== 'dropped').length,
    goal: c.goal || '', notes: c.notes || []
  }
}

/* ---------------- 需求洞察 ---------------- */
function guessOrgType(org, text) {
  const o = (org || '') + ' ' + text
  if (/(博物馆|美术馆|陈列馆|纪念馆|遗址|石窟|研究院|研究所)/.test(o)) return '博物馆/美术馆/文保机构'
  if (/(学院|大学|学校|院系|系部|研究生院)/.test(o)) return '高校院系'
  if (/(基金会|协会|学会|联合会)/.test(o)) return '行业协会/基金会'
  if (/(艺术节|双年展|博览会|展陈|艺委会|组委会)/.test(o)) return '艺术节/展览主办'
  if (/(社区|街道|乡镇|村委会|居民|村民)/.test(o)) return '社区/基层机构'
  if (/(公司|集团|品牌|企业|工作室|事务所)/.test(o)) return '企业/品牌'
  if (/(媒体|新媒体|公众号|电视台|报社|平台)/.test(o)) return '媒体/内容平台'
  if (/(政府|文旅局|文化馆|图书馆|文化中心|办公厅)/.test(o)) return '政府/公共文化机构'
  return '待确认（信息不足）'
}
function guessRealNeed(p, text, orgType) {
  const out = []
  const n = p.requirements || []
  if (n.some(x => /作品集|设计稿|方案/.test(x)))
    out.push('他们要的不只是人手，而是能直接用的产出——作品集要能证明你能交付，不只是"喜欢艺术"。')
  if (n.some(x => /简历|自述|报名表/.test(x)))
    out.push('筛选成本高，所以流程偏标准化。你的简历要一眼可读，不要写成散文。')
  if (n.some(x => /视频/.test(x)))
    out.push('要视频说明表达能力，不只是作品展示。')
  if (/(免费|志愿者|实习)/.test(text) && /博物馆|文保/.test(orgType))
    out.push('免费劳动 + 要作品集，常见于换取作品集素材或学术产出的交换，请确认署名权与作品归属。')
  if (/(驻留|创作营)/.test(text))
    out.push('驻留通常要产出（个展/作品/研究报告），进去之前先想清楚交什么。')
  if (/(工作坊|美育|公益|社区)/.test(text))
    out.push('面向公众的活动，真正的 KPI 常是到场人数与传播效果，不是艺术质量本身。')
  if (/(论坛|研讨|学术)/.test(text))
    out.push('学术活动看发言准备度，能提出一个具体问题比带来一篇成稿更有价值。')
  if (!out.length) out.push('信息不足，无法可靠判断。不要编——直接问对方："这个活动最看重什么？"')
  return out
}
function guessTheyWant(p, text) {
  const out = []
  const n = p.requirements || []
  if (n.some(x => /作品集|设计稿/.test(x))) out.push('有可展示的成品，且风格与项目调性匹配')
  if (n.some(x => /简历/.test(x))) out.push('基本功扎实、时间投入稳定')
  if (n.some(x => /年级|年龄|专业/.test(x))) out.push('硬性条件先过，再看能力')
  if (/(指导|导师|评审|专家|教师)/.test(text)) out.push('能在专家面前清晰表达自己的判断')
  if (/(驻留|创作营|训练营)/.test(text)) out.push('持续创作能力与自我管理')
  if (/(志愿|公益|社区)/.test(text)) out.push('沟通亲和力与耐心')
  out.push('合作意识：能按对方节奏交付，比个人表达更被看重')
  return out
}
function guessRisks(p, text) {
  const out = []
  const src = text || [p.title, p.org, p.content, (p.requirements || []).join(' ')].join(' ')
  if (/(押金|保证金|报名费.*不退|材料费|培训费)/.test(src)) out.push('出现押金/不退费类表述，先确认退款条款')
  if (/(免费|无费用)/.test(src) && /(押金|保证金)/.test(src)) out.push('同时写"免费"和要钱，自相矛盾，先问清')
  if (/(作品集|设计稿|方案)/.test(src) && !/(署名|版权|使用权|归还)/.test(src)) out.push('要材料但没写版权与署名，建议邮件里主动问一句')
  if (/(包吃住|住宿|交通补贴|津贴|报酬)/.test(src) && !/\d/.test(src)) out.push('提到补贴但没有具体金额，别默认真的有')
  if (/(长期|长期招募|长期合作)/.test(src)) out.push('「长期」在艺术机构里常意味着无偿，问清楚是否有工作证明')
  if (/(面试|答辩|presentation)/i.test(src)) out.push('有面试环节，建议提前准备 60 秒自我介绍')
  if (/(仅限本校|本校学生|本校生)/.test(src)) out.push('限定本校，你作为川美学生通常符合，但注意年级限制')
  return out
}

/* ---------------- 邮件模板 ---------------- */
function mailTemplate(p) {
  const name = p.who || '（你的名字）'
  const L = []
  L.push('主题：报名「' + p.title + '」——' + name + '（四川美术学院）')
  L.push('')
  L.push('敬礼：')
  L.push('')
  L.push('您好，我是在校学生，冒昧来信报名「' + p.title + '」。')
  if (p.why) { L.push(''); L.push('我关注这个活动，是因为：' + p.why) }
  L.push('')
  L.push('基本信息：')
  L.push('· 姓名：' + name)
  L.push('· 学校：四川美术学院' + (p.major ? '（' + p.major + '）' : ''))
  L.push('· 年级 / 年龄：' + (p.grade || '（请填写）'))
  L.push('· 联系方式：' + (p.phone || '（请填写）'))
  L.push('')
  L.push('随信附上：')
  ;(p.requirements || []).forEach(r => L.push('· ' + r))
  L.push('')
  L.push('如需补充材料，请随时告知，我会尽快提供。')
  L.push('')
  L.push('顺祝')
  L.push('时祺')
  L.push('')
  L.push(name)
  L.push('四川美术学院')
  return L.join('\n')
}

/* ---------------- 报名要求 → 待办 ---------------- */
const REQ_TPL = {
  '作品集': '整理并提交作品集', '个人简历': '撰写并提交个人简历', '简历': '撰写并提交个人简历',
  '自述': '撰写个人自述', '报名表': '填写报名表', '身份证明': '准备身份证明材料',
  '学生证': '准备学生证', '获奖证明': '收集获奖证明扫描件', '技术方案': '撰写技术方案',
  '创作计划': '撰写创作计划', '一分钟视频': '拍摄一分钟自我介绍视频',
  '视频作品集': '剪辑视频作品集', '设计稿': '整理设计稿', '方案文本': '撰写方案文本',
  '推荐信': '联系推荐人并获取推荐信'
}
function proj2todo(db, pid) {
  const p = (db.projects || []).find(x => x._id === pid)
  if (!p) return { db, count: 0 }
  let n = 0
  const add = (t) => {
    db.todos.unshift(Object.assign({
      _id: uid(), title: '', done: false, progress: 0, priority: 'mid',
      due: '', projectId: pid, repeat: '', note: '', createdAt: Date.now(), doneAt: 0, order: Date.now()
    }, t))
    n++
  }
  add({ title: '确认报名截止时间并设提醒', due: p.deadline, priority: 'high' })
  add({ title: '准备「' + String(p.title).slice(0, 16) + '」的报名材料', due: p.deadline, priority: 'high' })
  ;(p.requirements || []).forEach(r => {
    const key = Object.keys(REQ_TPL).find(k => r.indexOf(k) >= 0)
    if (key) add({ title: REQ_TPL[key], due: p.deadline, priority: 'high', note: '来自报名要求：' + r })
  })
  if (!p.contacts || !p.contacts.email) {
    add({ title: '找到主办方联系方式并投递', due: p.deadline, priority: 'high' })
  }
  return { db, count: n }
}

module.exports = {
  APP_KEY, CHAINS, PSTATUS, TODO_PRI, DEFAULT_DB,
  iso, todayISO, dayOffset, uid, d2, clamp,
  daysLeft, fmtDate, fmtDateFull, relDeadline,
  load, save, parseLink, normDate, inferChains, inferCats,
  conflictsFor, conflictMap, slotOf, toggleTodo, chainProgress,
  guessOrgType, guessRealNeed, guessTheyWant, guessRisks,
  mailTemplate, proj2todo, REQ_TPL
}
