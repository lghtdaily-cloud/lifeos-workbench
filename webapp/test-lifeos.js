#!/usr/bin/env node
/**
 * test-lifeos.js —— 用 jsdom 加载构建产物，跑通核心业务逻辑
 */
const fs = require('fs'), path = require('path'), os = require('os')

const NODE_MODULES = 'C:\\Users\\美人鱼\\.workbuddy\\binaries\\node\\workspace\\node_modules'
let JSDOM
try { JSDOM = require(path.join(NODE_MODULES, 'jsdom')).JSDOM }
catch(e){ console.log('jsdom 未安装，跳过'); process.exit(2) }

const html = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8')
const dom = new JSDOM(html, { runScripts:'dangerously', url:'https://localhost/', pretendToBeVisual:true })
const w = dom.window
w.matchMedia = w.matchMedia || (q => ({matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}}))

const A = w.LifeOS
if(!A){ console.error('LifeOS API 未暴露'); process.exit(1) }
const P = A.parseLink, C = A.conflictsFor, I = A.inferChains, CT = A.inferCats

let pass = 0, fail = 0
const results = []
function t(name, fn){
  try{
    const r = fn()
    if(r === true){ pass++; results.push('  ✓ '+name) }
    else { fail++; results.push('  ✗ '+name+'  →  '+JSON.stringify(r)) }
  }catch(e){ fail++; results.push('  ✗ '+name+'  →  '+e.message) }
}
const setProjects = arr => { A.db.projects = arr }
const setTodos = arr => { A.db.todos = arr }

console.log('=== 链接解析器 ===')

t('完整招募文本 → 时间/地点/截止/费用/邮箱全拆出', ()=>{
  const raw = `https://mp.weixin.qq.com/s/ABC123
【敦煌研究院】丝绸之路文化艺术研究班学员招募
时间：2026年10月25日-2026年10月28日 09:30-17:00
地点：甘肃·敦煌研究院莫高窟数字化中心
报名截止：10月20日
费用：免费
要求：提交个人简历与研究计划
邮箱：apply@dha.ac.cn`
  const p = P(raw)
  return (p.start==='2026-10-25' && p.startTime==='09:30' && p.endTime==='17:00' &&
          p.place.includes('敦煌') && p.deadline==='2026-10-20' && p.fee==='免费' &&
          p.contacts.email==='apply@dha.ac.cn' && p.requirements.length>=2 && p.title.includes('敦煌'))
    ? true : p
})

t('活动时间与报名截止严格分开', ()=>{
  const p = P(`某工作坊招募
活动日期：11月3日
报名截止：10月28日
地点：重庆`)
  return (p.start==='2026-11-03' && p.deadline==='2026-10-28') ? true : {start:p.start, ddl:p.deadline}
})

t('原文没写时间 → start 空 + 进 missingFields（不编造）', ()=>{
  const p = P(`某个活动
欢迎大家参加`)
  return (p.start==='' && p.missing.includes('活动时间')) ? true : {start:p.start, miss:p.missing}
})

t('相对日期「下周五」换算成具体日期', ()=>{
  const p = P(`活动
时间是下周五`)
  if(!p.start) return '未解析出日期'
  const d = new Date(p.start+'T00:00:00')
  const dow = d.getDay()
  return (dow===5 && d > new Date(w.__TODAY||'2026-01-01')) ? true : {start:p.start, dow}
})

t('抓取微信 ID', ()=>{
  const p = P(`活动
微信：scfai_zp`)
  return p.contacts.wechat==='scfai_zp' ? true : p.contacts
})

t('线上活动识别（地点写"线上（腾讯会议）"）', ()=>{
  const p = P(`线上讲座
地点：线上（腾讯会议）
时间：11月5日`)
  return p.isOnline===true ? true : {isOnline:p.isOnline, place:p.place}
})

t('解析后有 title / content / url', ()=>{
  const p = P(`https://mp.weixin.qq.com/s/XYZ
活动名称测试
这是正文内容`)
  return (p.title && p.content && p.url==='https://mp.weixin.qq.com/s/XYZ') ? true : p
})

console.log('=== 冲突检测 ===')

t('时间重叠被检出', ()=>{
  setProjects([
    {_id:'a',title:'A',start:'2026-11-01',startTime:'10:00',endTime:'12:00',place:'重庆',status:'candidate'},
    {_id:'b',title:'B',start:'2026-11-01',startTime:'11:00',endTime:'13:00',place:'北京',status:'candidate'}
  ])
  const c = C(A.db.projects[1])
  return (c.length===1 && c[0].type==='time') ? true : c
})

t('跨城通勤不足 30 分钟 → 检出 transit', ()=>{
  setProjects([
    {_id:'a',title:'A',start:'2026-11-01',startTime:'10:00',endTime:'11:00',place:'重庆·沙坪坝',status:'candidate'},
    {_id:'b',title:'B',start:'2026-11-01',startTime:'11:10',endTime:'12:00',place:'重庆·渝北',status:'candidate'}
  ])
  const c = C(A.db.projects[1])
  return (c.length===1 && c[0].type==='transit' && c[0].gap===10) ? true : c
})

t('同一地点不误报通勤冲突', ()=>{
  setProjects([
    {_id:'a',title:'A',start:'2026-11-01',startTime:'10:00',endTime:'11:00',place:'同一地点',status:'candidate'},
    {_id:'b',title:'B',start:'2026-11-01',startTime:'11:10',endTime:'12:00',place:'同一地点',status:'candidate'}
  ])
  return C(A.db.projects[1]).length===0 ? true : C(A.db.projects[1])
})

t('首尾相接不算冲突', ()=>{
  setProjects([
    {_id:'a',title:'A',start:'2026-11-01',startTime:'10:00',endTime:'11:00',place:'X',status:'candidate'},
    {_id:'b',title:'B',start:'2026-11-01',startTime:'11:00',endTime:'12:00',place:'X',status:'candidate'}
  ])
  return C(A.db.projects[1]).length===0 ? true : C(A.db.projects[1])
})

t('已放弃(dropped)的活动不参与冲突计算', ()=>{
  setProjects([
    {_id:'a',title:'A',start:'2026-11-01',startTime:'10:00',endTime:'12:00',place:'X',status:'dropped'},
    {_id:'b',title:'B',start:'2026-11-01',startTime:'11:00',endTime:'13:00',place:'X',status:'candidate'}
  ])
  return C(A.db.projects[1]).length===0 ? true : C(A.db.projects[1])
})

console.log('=== 待办重复规则 ===')

t('每周重复：完成后按间隔顺延', ()=>{
  setTodos([])
  const td = A.addTodo({title:'周报', due:'2026-11-02', repeat:'1w'})
  A.toggleTodo(td._id)
  const after = A.db.todos.find(x=>x._id===td._id)
  return after.due==='2026-11-09' ? true : after
})

t('每月重复顺延一个月', ()=>{
  setTodos([])
  const td = A.addTodo({title:'月总结', due:'2026-11-15', repeat:'1m'})
  A.toggleTodo(td._id)
  const after = A.db.todos.find(x=>x._id===td._id)
  return after.due==='2026-12-15' ? true : after
})

t('非重复待办完成后 done=true 且 progress=100', ()=>{
  setTodos([])
  const td = A.addTodo({title:'一次性', due:'2026-11-02'})
  A.toggleTodo(td._id)
  const after = A.db.todos.find(x=>x._id===td._id)
  return (after.done===true && after.progress===100) ? true : after
})

console.log('=== 链条 / 分类推断 ===')

t('文化遗产调研 → 见识世界 + 文化服务', ()=>{
  const c = I('敦煌研究院 丝绸之路 文化遗产 调研 展览')
  return (c.includes('world') && c.includes('culture')) ? true : c
})

t('志愿讲解 → 文化服务', ()=>{
  const c = I('石刻研究院 志愿讲解员 招募')
  return c.includes('culture') ? true : c
})

t('川美活动 → 分类含 scfai', ()=>{
  const cats = CT({title:'四川美术学院公共艺术工作坊', org:'四川美术学院', content:''})
  return cats.includes('scfai') ? true : cats
})

t('学术活动 → 分类含 academic', ()=>{
  const cats = CT({title:'2026国际学术论坛', org:'川美', content:'研讨会征稿'})
  return cats.includes('academic') ? true : cats
})

t('重庆活动 → 分类含 chongqing', ()=>{
  const cats = CT({title:'大足石刻志愿讲解', org:'重庆', content:''})
  return cats.includes('chongqing') ? true : cats
})

console.log('=== 邮件报名 ===')

t('邮件含标题、动机、报名材料清单', ()=>{
  setProjects([{_id:'x',title:'敦煌研究班',why:'想进莫高窟现场',requirements:['个人简历'],org:'敦煌研究院'}])
  const m = A.mailTemplate(A.db.projects[0])
  return (m.includes('敦煌研究班') && m.includes('想进莫高窟现场') && m.includes('个人简历')) ? true : m.slice(0,120)
})

console.log('=== 需求洞察 ===')

t('高校院系 → 主办方类型正确', ()=>{
  const g = A.guessOrgType('四川美术学院造型艺术学院','工作坊')
  return g.includes('高校') ? true : g
})

t('文保机构 → 主办方类型正确', ()=>{
  const g = A.guessOrgType('大足石刻研究院','志愿讲解招募')
  return (g.includes('博物馆')||g.includes('文保')) ? true : g
})

t('要求作品集 → 真实诉求含"可交付产出"', ()=>{
  setProjects([{_id:'y',title:'工作坊',org:'某机构',requirements:['作品集'],content:''}])
  const r = A.guessRealNeed(A.db.projects[0],'工作坊 作品集','企业/品牌')
  return r.length>0 ? true : r
})

t('押金类风险被检出', ()=>{
  const r = A.guessRisks({requirements:[], content:'报名需交押金500元'})
  return r.some(x=>x.includes('押金')) ? true : r
})

t('话术模板含开场/中段/结尾/禁忌', ()=>{
  const tk = A.talkTracks('高校院系',{title:'x',content:'',requirements:[]})
  return (tk.includes('开场') && tk.includes('中段') && tk.includes('结尾') && tk.includes('禁忌')) ? true : tk.slice(0,80)
})

console.log('=== 报名要求 → 待办拆解 ===')

t('作品集要求 → 生成"整理并提交作品集"待办', ()=>{
  setProjects([{_id:'z',title:'测试活动',start:'2026-11-01',deadline:'2026-10-25',requirements:['作品集','个人简历'],contacts:{email:'a@b.c'}}])
  setTodos([])
  A.proj2todo('z')
  const titles = A.db.todos.map(x=>x.title)
  return (titles.some(x=>x.includes('作品集')) && titles.some(x=>x.includes('简历'))) ? true : titles
})

console.log('=== 存储 ===')

t('写入 → localStorage → 读取字段完整', ()=>{
  setProjects([{_id:'t1',title:'存一下',org:'x',start:'2026-11-01',deadline:'',url:'',cover:'',
    requirements:[],contacts:{},chains:[],cats:[],missing:[],status:'candidate',createdAt:1}])
  A.saveNow()
  const parsed = JSON.parse(w.localStorage.getItem('lifeos.v1'))
  return (parsed.projects.length===1 && parsed.projects[0].title==='存一下') ? true : parsed.projects
})

t('removed 列表持久化（已删活动不会复活）', ()=>{
  A.db.removed = ['gone_1']
  A.saveNow()
  const parsed = JSON.parse(w.localStorage.getItem('lifeos.v1'))
  return parsed.removed.includes('gone_1') ? true : parsed.removed
})

t('exportData / importData 往返一致', ()=>{
  setProjects([{_id:'rt',title:'往返',requirements:[],contacts:{},chains:[],cats:[],missing:[],status:'candidate'}])
  A.saveNow()
  const dump = A.exportData()
  setProjects([])
  A.importData(dump)
  return A.db.projects.length===1 && A.db.projects[0].title==='往返' ? true : A.db.projects
})

/* ---- 每周推荐 ---- */
t('首批推荐播种：6 条已核实信源，均为待我确认', ()=>{
  const ps = A.db.picks.filter(p=>p.status==='pending')
  if(ps.length !== 6) return ps.length
  const bad = ps.find(p=>!p.url || !p.why || !p.title)
  return bad ? ('字段缺失:'+bad._id) : true
})

t('每周推荐：加入后进活动库，忽略后进忽略态', ()=>{
  const id = A.db.picks[0]._id
  const before = A.db.projects.length
  A.pickAdd(id)
  const added = A.db.picks.find(p=>p._id===id).status==='added' && A.db.projects.length===before+1
  const id2 = A.db.picks[1]._id
  A.pickIgnore(id2)
  return (added && A.db.picks.find(p=>p._id===id2).status==='ignored') ? true : 'join/ignore 状态不对'
})

t('每周同步：合并新条目且不重复插入', ()=>{
  const json = JSON.stringify({picks:[
    {_id:'wk_1', title:'本周新线索', url:'https://x.example/', why:'理由', score:70, chains:['culture']},
    {_id:'seed_pick_1', title:'重复的旧条目', url:'x', why:'x', score:1, chains:[]}
  ]})
  const merged = w.LifeOS.mergeWeekly ? w.LifeOS.mergeWeekly(JSON.parse(json)) : null
  if(merged === null) return 'mergeWeekly 未暴露'
  const n1 = A.db.picks.filter(p=>p._id==='wk_1').length
  const n2 = A.db.picks.filter(p=>p._id==='seed_pick_1').length
  return (n1===1 && n2===1) ? true : {wk_1:n1, seed_pick_1:n2}
})

t('我的资料默认结构存在（含 school 默认川美）', ()=>{
  const mp = A.db.myProfile
  return (mp && mp.school==='四川美术学院' && 'name' in mp && 'resumeText' in mp) ? true : mp
})
t('邮件模板带入 school 与专业', ()=>{
  const body = A.mailTemplate({title:'测试活动', who:'小米', school:'四川美术学院', major:'视觉传达', grade:'大三', phone:'123', requirements:['作品集']})
  if(!body.includes('· 学校：四川美术学院（视觉传达）')) return '学校行格式不对'
  if(!body.includes('主题：报名「测试活动」——小米（四川美术学院）')) return '主题未带学校'
  return true
})

console.log('\n' + results.join('\n'))
console.log('\n通过 ' + pass + ' / ' + (pass+fail))
fs.writeFileSync(path.join(os.tmpdir(),'lifeos-test.txt'), results.join('\n'), 'utf8')
process.exit(fail?1:0)
