/* ============================================================
   8. 视图渲染
   ============================================================ */
const NAV = [
  {k:'today',  n:'今日',   ico:'M3 12h4l3 8 4-16 3 8h4'},
  {k:'lib',    n:'活动库', ico:'M4 5h16v14H4zM4 9h16M9 5v14'},
  {k:'todo',   n:'待办',   ico:'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'},
  {k:'cal',    n:'日程',   ico:'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4'},
  {k:'review', n:'复盘',   ico:'M12 3a9 9 0 1 0 9 9M12 7v5l3 2'},
  {k:'note',   n:'笔记',   ico:'M4 4h16v12H7l-3 4zM8 9h8M8 13h5'},
  {k:'chain',  n:'人生链条',ico:'M12 3v6M12 9a4 4 0 1 1-4 4M6 21a4 4 0 0 1 4-4M18 21a4 4 0 0 0-4-4M12 15v6'},
  {k:'picks',  n:'每周推荐',ico:'M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'}
]
const ICON = (d, cls) => '<svg class="'+(cls||'ico')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="'+d+'"/></svg>'

let view = 'today'
let calMode = 'month'      // month | week | day | year
let calCursor = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
let calSel = todayISO()
let libFilter = 'all'
let libQuery = ''
let pickFilter = 'pending'

function render(){
  const nav = NAV.map(n => '<button class="nav-i'+(view===n.k?' on':'')+'" data-v="'+n.k+'">'+
    ICON(n.ico)+'<span>'+n.n+'</span>'+
    (n.k==='todo'&&todoOpenCount()?'<span class="cnt">'+todoOpenCount()+'</span>':'')+
    (n.k==='picks'&&pendingPicks()?'<span class="cnt">'+pendingPicks()+'</span>':'')+
    (n.k==='lib'&&DB.projects.length?'<span class="cnt">'+DB.projects.length+'</span>':'')+
    '</button>').join('')
  $('#sideNav').innerHTML = nav
  $('#botNav').innerHTML = NAV.slice(0,5).concat(NAV.slice(5,8)).map(n =>
    '<button class="'+(view===n.k?'on':'')+'" data-v="'+n.k+'">'+ICON(n.ico)+
    '<span>'+n.n+'</span>'+((n.k==='picks'&&pendingPicks())?'<span class="dot"></span>':'')+'</button>').join('')
  $$('[data-v]').forEach(b=>b.onclick=()=>{ view=b.dataset.v; render() })
  $('#btnQuick').style.display = (view==='lib'||view==='todo') ? 'inline-flex' : 'none'
  $('#btnQuick').onclick = ()=>openLinkImport()

  const titles = {today:'今日',lib:'活动库',todo:'待办库',cal:'日程',review:'复盘',note:'语音笔记',chain:'人生链条',picks:'每周推荐'}
  $('#vTitle').textContent = titles[view]
  $('#topChips').innerHTML = topChips()

  const V = {
    today:viewToday, lib:viewLib, todo:viewTodo, cal:viewCal,
    review:viewReview, note:viewNote, chain:viewChain, picks:viewPicks
  }
  $('#view').innerHTML = (V[view]||viewToday)()
  afterRender()
}

function topChips(){
  if(view==='lib'){
    const cats = libCategories()
    return cats.map(c=>'<button class="chip'+(libFilter===c.k?' on':'')+'" data-lf="'+c.k+'">'+c.n+
      '<span class="n">'+c.n2+'</span></button>').join('')
  }
  if(view==='picks'){
    return '<button class="chip'+(pickFilter==='pending'?' on':'')+'" data-pf="pending">待筛选<span class="n">'+pendingPicks()+'</span></button>'+
           '<button class="chip'+(pickFilter==='added'?' on':'')+'" data-pf="added">已加入</button>'+
           '<button class="chip'+(pickFilter==='ignored'?' on':'')+'" data-pf="ignored">已忽略</button>'
  }
  return ''
}

function afterRender(){
  // 顶部分类 chips
  $$('#topChips [data-lf]').forEach(b=>b.onclick=()=>{ libFilter=b.dataset.lf; render() })
  $$('#topChips [data-pf]').forEach(b=>b.onclick=()=>{ pickFilter=b.dataset.pf; render() })
  // 库内筛选
  $$('[data-lf2]').forEach(b=>b.onclick=()=>{ libFilter=b.dataset.lf2; render() })
  const kw = $('#libKw')
  if(kw) kw.oninput = ()=>{ libQuery = kw.value; const g=$('#libGrid'); if(g) g.innerHTML = libGridHTML() }
  $$('[data-act]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); handleAct(b.dataset.act, b.dataset.id, b) })
  $$('[data-open]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openProject(b.dataset.open) })
  $$('[data-todo]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); toggleTodo(b.dataset.todo) })
  $$('[data-cal]').forEach(b=>b.onclick=()=>{ calSel=b.dataset.cal; calMode='day'; render() })
  $$('[data-goday]').forEach(b=>b.onclick=()=>{ calSel=b.dataset.goday; calMode='day'; render() })
}

/* ============================================================
   9. 视图：今日
   ============================================================ */
function viewToday(){
  const td = todayISO()
  const todayProjects = DB.projects.filter(p=>p.start===td && p.status!=='dropped')
  const overdue = DB.todos.filter(t=>!t.done && t.due && t.due<td)
  const todayTodos = DB.todos.filter(t=>!t.done && t.due===td)
  const soon = DB.projects.filter(p=>{ const d=daysLeft(p.deadline); return d!==null && d>=0 && d<=7 && p.status!=='done' && p.status!=='dropped' })
  const cm = conflictMap()
  const conflictList = []
  Object.keys(cm).forEach(id=>{ if(cm[id].length) conflictList.push({p:DB.projects.find(x=>x._id===id), c:cm[id]}) })

  const hr = new Date().getHours()
  const greet = hr<6?'夜深了':hr<11?'早上好':hr<14?'中午好':hr<18?'下午好':'晚上好'
  const dstr = TODAY.getFullYear()+'年'+(TODAY.getMonth()+1)+'月'+TODAY.getDate()+'日 · '+
    ['周日','周一','周二','周三','周四','周五','周六'][TODAY.getDay()]

  let h = '<div class="hero">'+
    '<div class="hero-date">'+dstr+'</div>'+
    '<div class="hero-hi">'+greet+'</div>'+
    '<div class="hero-sub">'+(todayProjects.length
      ? '今天有 '+todayProjects.length+' 场安排。'+(conflictList.length?'有 '+conflictList.length+' 处冲突需要你决定取舍。':'暂无冲突，按计划走就好。')
      : '今天没有硬性安排。'+(overdue.length?'有 '+overdue.length+' 项待办已逾期，先挑最容易的那件做掉。':'可以利用这段时间推进手上进行中的事。'))+'</div>'+
    '<div class="hero-stats">'+
      '<div class="hstat"><div class="n mono">'+DB.projects.filter(p=>p.status==='signed').length+'</div><div class="t">进行中</div></div>'+
      '<div class="hstat"><div class="n mono">'+DB.projects.filter(p=>p.status==='done').length+'</div><div class="t">已完成</div></div>'+
      '<div class="hstat"><div class="n mono">'+DB.todos.filter(t=>!t.done).length+'</div><div class="t">待办</div></div>'+
      '<div class="hstat"><div class="n mono">'+soon.length+'</div><div class="t">7天内截止</div></div>'+
    '</div></div>'

  // 冲突提示
  h += conflictList.map(c =>
    '<div class="warnbar'+(c.c[0].type==='time'?' err':'')+'">'+
    ICON('M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z','ico')+
    '<div><b>'+esc(c.p.title.slice(0,20))+'</b>：'+esc(c.c[0].msg)+
    '<div class="tiny" style="margin-top:3px">建议：改期 / 改地点 / 接受其中一个</div></div></div>').join('')

  h += '<div class="stat-row">'+
    '<div class="stat"><div class="n mono">'+DB.projects.filter(p=>p.status==='candidate').length+'</div><div class="t">候选活动</div></div>'+
    '<div class="stat"><div class="n mono">'+DB.todos.filter(t=>!t.done).length+'</div><div class="t">未完成待办</div></div>'+
    '<div class="stat'+(overdue.length?' alert':'')+'"><div class="n mono">'+overdue.length+'</div><div class="t">已逾期</div></div>'+
    '<div class="stat'+(soon.length?' warn':'')+'"><div class="n mono">'+soon.length+'</div><div class="t">临近截止</div></div>'+
    '</div>'

  h += '<div class="cols"><div>'
  // 今日日程
  h += '<div class="card"><div class="card-h"><h3>今日日程</h3><div class="sp"></div>'+
       '<button class="btn ghost sm" data-v2="cal">看全月</button></div>'
  h += todayProjects.length ? todayProjects.map(p=>{
        const cf = cm[p._id]||[]
        return '<div class="tl-i'+(p.startTime && p.startTime<=nowTime() && (!p.endTime||p.endTime>=nowTime())?' now':'')+'" data-open="'+p._id+'">'+
          '<div class="tl-t mono">'+(p.startTime||'全天')+(p.place?' · '+esc(p.place):'')+'</div>'+
          '<div class="tl-b">'+esc(p.title)+'</div>'+
          '<div class="tl-m">'+esc(p.org||'未注明主办方')+(p.why?' · 动机：'+esc(p.why):'')+'</div>'+
          (cf.length?'<div class="warnbar" style="margin:6px 0 0">'+ICON('M12 9v4M12 17h.01','ico')+'<div>'+esc(cf[0].msg)+'</div></div>':'')+
          '</div>'
      }).join('') : '<div class="empty"><div class="big">今天没有安排</div>点右下角「+」导入一条链接，或去日程里手动加一条</div>'
  h += '</div>'

  // 待办
  h += '<div class="card" style="margin-top:16px"><div class="card-h"><h3>待办</h3><div class="sp"></div>'+
       '<button class="btn ghost sm" data-v2="todo">全部</button></div>'
  const showT = [...overdue, ...todayTodos].slice(0,8)
  h += showT.length ? showT.map(t=>todoRow(t)).join('') : '<div class="empty">没有到期或逾期的待办</div>'
  h += '</div></div><div>'

  // 临近截止
  h += '<div class="card"><div class="card-h"><h3>7 天内截止</h3></div>'
  h += soon.length ? soon.map(p=>{
    const r = relDeadline(p.deadline)
    return '<div class="row-i" data-open="'+p._id+'"><div class="body">'+
      '<div class="t">'+esc(p.title)+'</div>'+
      '<div class="m">'+esc(p.org||'—')+' · <span class="tag '+r.cls+'">'+r.txt+'</span></div></div></div>'
  }).join('') : '<div class="empty">近期没有临近截止的活动</div>'
  h += '</div>'

  // 链条
  h += '<div class="card" style="margin-top:16px"><div class="card-h"><h3>人生链条</h3><div class="sp"></div>'+
       '<button class="btn ghost sm" data-v2="chain">展开</button></div>'
  h += CHAINS.map(c=>{
    const p = chainProgress(c.k)
    return '<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">'+
      '<span>'+esc(c.n)+'</span><span class="mono tiny">'+p.done+'/'+p.total+'</span></div>'+
      '<div class="chain-c" style="padding:0;background:none;border:none"><div class="bar" style="background:var(--bg-sunken)">'+
      '<i style="width:'+p.pct+'%;background:'+c.c+'"></i></div></div></div>'
  }).join('')
  h += '</div></div></div>'
  return h
}

/* ============================================================
   10. 视图：活动库
   ============================================================ */
function libCategories(){
  const cats = [
    {k:'all', n:'全部'},
    {k:'candidate', n:'候选'},
    {k:'signed', n:'已报名'},
    {k:'done', n:'已完成'},
    {k:'academic', n:'学术类'},
    {k:'practice', n:'实践类'},
    {k:'scfai', n:'川美'},
    {k:'chongqing', n:'重庆'},
    {k:'culture', n:'文化服务'},
    {k:'world', n:'见识世界'},
    {k:'people', n:'人际合作'},
    {k:'temper', n:'性情修养'}
  ]
  const list = DB.projects.filter(p=>p.status!=='dropped')
  cats.forEach(c=>{
    c.n2 = c.k==='all' ? list.length : list.filter(p=>matchCat(p,c.k)).length
  })
  return cats
}
function matchCat(p,k){
  if(['candidate','signed','done'].includes(k)) return p.status===k
  if(['academic','practice','scfai','chongqing'].includes(k)) return (p.cats||[]).includes(k)
  if(['culture','world','people','temper'].includes(k)) return (p.chains||[]).includes(k)
  return true
}
function libList(){
  const kw = libQuery.trim().toLowerCase()
  return DB.projects.filter(p=>{
    if(p.status==='dropped') return false
    if(!matchCat(p, libFilter)) return false
    if(kw){
      const t = [p.title,p.org,p.why,p.content,p.place,(p.requirements||[]).join(' ')].join(' ').toLowerCase()
      if(!t.includes(kw)) return false
    }
    return true
  }).sort((a,b)=>{
    const sa = a.status==='signed'?0:a.status==='candidate'?1:2
    const sb = b.status==='signed'?0:b.status==='candidate'?1:2
    if(sa!==sb) return sa-sb
    const da = a.start||'9999', db2 = b.start||'9999'
    return da < db2 ? -1 : da > db2 ? 1 : 0
  })
}
function viewLib(){
  const list = libList()
  const cm = conflictMap()
  let h = '<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>活动库</h3>'+
    '<div class="sp"></div><span class="tiny">'+list.length+' / '+DB.projects.length+' 条</span>'+
    '<button class="btn primary sm" data-act="import">'+ICON('M12 5v14M5 12h14')+'导入链接</button></div>'+
    '<input class="inp" id="libKw" placeholder="搜索标题 / 主办方 / 动机 / 地点" value="'+esc(libQuery)+'">'+
    '<div class="chips" style="margin-top:10px">'+libCategories().map(c=>
      '<button class="chip'+(libFilter===c.k?' on':'')+'" data-lf2="'+c.k+'">'+c.n+'<span class="n">'+c.n2+'</span></button>').join('')+'</div>'+
    '</div>'
  h += '<div id="libGrid">'+libGridHTML(list, cm)+'</div>'
  return h
}
function libGridHTML(list, cm){
  list = list || libList()
  cm = cm || conflictMap()
  if(!list.length) return '<div class="card"><div class="empty"><div class="big">还没有匹配的活动</div>'+
    '换个分类或关键词试试，或点「导入链接」把看到的好活动存进来</div></div>'
  return '<div class="pgrid">'+list.map(p=>{
    const st = PSTATUS[p.status]||PSTATUS.candidate
    const r = relDeadline(p.deadline)
    const cf = cm[p._id]||[]
    const chainN = (p.chains||[]).map(k=>{ const c=CHAINS.find(x=>x.k===k); return c?c.n:'' }).filter(Boolean).join(' · ')
    const cats = (p.cats||[]).map(c=>'<span class="tag">'+catName(c)+'</span>').join('')
    return '<div class="pcard" data-open="'+p._id+'">'+
      '<div class="cover">'+
        (p.cover?'<img src="'+esc(p.cover)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<div class="ph">'+esc((p.org||'活')[0])+'</div>')+
        '<span class="status">'+st.n+'</span>'+
        (chainN?'<span class="chain">'+esc(chainN)+'</span>':'')+
      '</div>'+
      '<div class="body">'+
        '<div class="t">'+esc(p.title)+'</div>'+
        '<div class="m">'+esc(p.org||'未注明主办方')+'</div>'+
        '<div class="m mono">'+(p.start?fmtDate(p.start)+' '+(p.startTime||''):'时间未定')+(p.place?' · '+esc(p.place):'')+'</div>'+
        (p.why?'<div class="why">为什么想去：'+esc(p.why)+'</div>':'')+
        (cf.length?'<div class="warnbar" style="margin:0;padding:6px 9px">'+ICON('M12 9v4M12 17h.01','ico')+'<div>'+esc(cf[0].msg)+'</div></div>':'')+
        '<div class="meta">'+cats+(r.txt?'<span class="tag '+r.cls+'">'+r.txt+'</span>':'')+
          (p.requirements&&p.requirements.length?'<span class="tag">需 '+p.requirements.length+' 项材料</span>':'')+
        '</div>'+
        '<div class="acts">'+
          '<button class="btn btn-line btn-sm" data-act="mail" data-id="'+p._id+'">邮件报名</button>'+
          '<button class="btn btn-primary btn-sm" data-act="edit" data-id="'+p._id+'">编辑</button>'+
        '</div>'+
      '</div></div>'
  }).join('')+'</div>'
}
function catName(k){
  return {academic:'学术类',practice:'实践类',scfai:'川美',chongqing:'重庆'}[k]||k
}

/* ============================================================
   11. 视图：待办库
   ============================================================ */
function todoOpenCount(){ return DB.todos.filter(t=>!t.done).length }
function pendingPicks(){ return DB.picks.filter(p=>p.status==='pending').length }

function todoRow(t){
  const pr = TODO_PRI[t.priority]||TODO_PRI.mid
  const p = DB.projects.find(x=>x._id===t.projectId)
  const od = t.due && !t.done && t.due < todayISO()
  return '<div class="row-i'+(t.done?' done':'')+'">'+
    '<button class="ring'+(t.done?' on':'')+'" data-todo="'+t._id+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7"/></svg></button>'+
    '<div class="body"><div class="t">'+esc(t.title)+'</div>'+
    '<div class="m">'+
      (t.due?'<span class="'+(od?'tag x':'tag')+'">'+(od?'逾期 ':'')+fmtDate(t.due)+'</span> ':'')+
      (pr.n==='高'?'<span class="tag x">高</span>':pr.n==='中'?'<span class="tag o">中</span>':'')+
      (p?'<span class="tag p">'+esc(p.title.slice(0,12))+'</span>':'')+
      (t.repeat?'<span class="tag a">重复</span>':'')+
      (t.note?' · '+esc(t.note):'')+
    '</div></div>'+
    '<div class="side-act" style="display:flex;gap:4px">'+
      '<button class="btn ghost sm" data-act="tedit" data-id="'+t._id+'">改</button>'+
      '<button class="btn ghost sm" data-act="tdel" data-id="'+t._id+'">删</button>'+
    '</div></div>'
}
function viewTodo(){
  const tab = libFilter==='done'?'done':libFilter==='over'?'over':libFilter==='today'?'today':'open'
  let h = '<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>待办库</h3><div class="sp"></div>'+
    '<span class="tiny">'+DB.todos.filter(t=>!t.done).length+' 未完成</span>'+
    '<button class="btn primary sm" data-act="tnew">'+ICON('M12 5v14M5 12h14')+'新建</button></div>'+
    '<div class="chips">'+
      [['open','未完成'],['today','今天'],['over','已逾期'],['done','已完成']].map(([k,n])=>{
        const cnt = k==='open'?DB.todos.filter(t=>!t.done).length
          : k==='today'?DB.todos.filter(t=>!t.done&&t.due===todayISO()).length
          : k==='over'?DB.todos.filter(t=>!t.done&&t.due&&t.due<todayISO()).length
          : DB.todos.filter(t=>t.done).length
        return '<button class="chip'+(tab===k?' on':'')+'" data-act="ttab" data-k="'+k+'">'+n+'<span class="n">'+cnt+'</span></button>'
      }).join('')+'</div></div>'

  let list = DB.todos.slice()
  if(tab==='open') list = list.filter(t=>!t.done)
  else if(tab==='today') list = list.filter(t=>!t.done && t.due===todayISO())
  else if(tab==='over') list = list.filter(t=>!t.done && t.due && t.due<todayISO())
  else list = list.filter(t=>t.done)
  list.sort((a,b)=>{
    if(a.done!==b.done) return a.done?1:-1
    if(a.due && b.due && a.due!==b.due) return a.due<b.due?-1:1
    if(!a.due && b.due) return 1
    if(a.due && !b.due) return -1
    return (b.order||0)-(a.order||0)
  })
  h += '<div class="card">'+ (list.length ? list.map(todoRow).join('') :
    '<div class="empty"><div class="big">这里空着</div>新建一条，或从活动库点「加入待办」把报名动作拆出来</div>')+'</div>'
  return h
}

/* ============================================================
   12. 视图：日程（年/月/周/日）
   ============================================================ */
function viewCal(){
  const cm = conflictMap()
  let h = '<div class="cal-head">'+
    '<div class="cal-title">'+
      (calMode==='year'? calCursor.getFullYear()+' 年'
      : calMode==='month'? calCursor.getFullYear()+' 年 '+(calCursor.getMonth()+1)+' 月'
      : calMode==='week'? weekLabel(calCursor)
      : fmtDateFull(calSel))+'</div>'+
    '<button class="btn sm" data-act="cprev">‹</button>'+
    '<button class="btn sm" data-act="ctoday">今天</button>'+
    '<button class="btn sm" data-act="cnext">›</button>'+
    '<div class="sp" style="flex:1"></div>'+
    '<div class="chips">'+[['year','年'],['month','月'],['week','周'],['day','日']].map(([k,n])=>
      '<button class="chip'+(calMode===k?' on':'')+'" data-act="cmode" data-k="'+k+'">'+n+'</button>').join('')+
    '</div></div>'

  if(calMode==='day'){
    h += '<div class="card">'+dayTimeline(calSel, cm)+'</div>'
  } else if(calMode==='year'){
    h += '<div class="card">'+yearGrid(cm)+'</div>'
  } else {
    h += '<div class="card">'+monthGrid(cm)+'</div>'
  }
  return h
}
function weekLabel(d){
  const s = new Date(d); s.setDate(s.getDate()-s.getDay()+1)
  const e = new Date(s); e.setDate(e.getDate()+6)
  return s.getMonth()+1+'/'+s.getDate()+' – '+e.getMonth()+1+'/'+e.getDate()
}
function monthGrid(cm){
  const y = calCursor.getFullYear(), m = calCursor.getMonth()
  const first = new Date(y,m,1), lead = first.getDay()
  const days = new Date(y,m+1,0).getDate()
  const prevDays = new Date(y,m,0).getDate()
  let cells = ''
  for(let i=0;i<42;i++){
    let d, dim=false
    if(i<lead){ d = new Date(y,m-1,prevDays-lead+1+i); dim=true }
    else if(i>=lead+days){ d = new Date(y,m+1,i-lead-days+1); dim=true }
    else d = new Date(y,m,i-lead+1)
    const ds = iso(d)
    const evs = DB.projects.filter(p=>p.start===ds && p.status!=='dropped')
    const nTodos = DB.todos.filter(t=>t.due===ds && !t.done).length
    const cf = evs.some(e=>(cm[e._id]||[]).length)
    cells += '<div class="cal-cell'+(dim?' dim':'')+(ds===todayISO()?' today':'')+(ds===calSel?' sel':'')+'" data-goday="'+ds+'">'+
      '<div class="cal-dn">'+d.getDate()+'</div>'+
      evs.slice(0,3).map(p=>{
        const c = (cm[p._id]||[]).length ? ' conflict' : (p.status==='done'?' done':(p.chains&&p.chains[0]==='people'?' clay':(p.chains&&p.chains[0]==='world'?' dusk':'')))
        return '<div class="cal-ev'+c+'" data-cal="'+ds+'">'+esc(p.startTime?p.startTime+' ':'')+esc(p.title.slice(0,10))+'</div>'
      }).join('')+
      (evs.length>3?'<div class="tiny" style="text-align:center">+'+(evs.length-3)+'</div>':'')+
      (nTodos?'<div class="tiny" style="text-align:center;color:var(--ochre)">●'+nTodos+'</div>':'')+
      '</div>'
  }
  return '<div class="cal-grid">'+['日','一','二','三','四','五','六'].map(d=>'<div class="cal-dow">'+d+'</div>').join('')+cells+'</div>'+
    '<div class="tiny" style="margin-top:10px">● 数字表示当天未完成待办数；<span style="color:var(--danger)">红条</span> 表示有冲突</div>'
}
function yearGrid(cm){
  const y = calCursor.getFullYear()
  const months = ['一','二','三','四','五','六','七','八','九','十','十一','十二']
  let cells = ''
  months.forEach((mn, mi)=>{
    const days = new Date(y,mi+1,0).getDate()
    const lead = new Date(y,mi,1).getDay()
    let inner = ''
    for(let i=0;i<days;i++){
      const ds = y+'-'+d2(mi+1)+'-'+d2(i+1)
      const evs = DB.projects.filter(p=>p.start===ds && p.status!=='dropped')
      const cf = evs.some(e=>(cm[e._id]||[]).length)
      const td = DB.todos.filter(t=>t.due===ds && !t.done).length
      let bg = 'transparent'
      if(cf) bg = 'rgba(166,93,85,.55)'
      else if(evs.length) bg = 'rgba(107,122,99,.5)'
      else if(td) bg = 'rgba(185,153,90,.42)'
      inner += '<div title="'+ds+(evs.length?' · '+evs.length+' 场活动':'')+(td?' · '+td+' 待办':'')+'" style="background:'+bg+';aspect-ratio:1;border-radius:2px"></div>'
    }
    const mc = DB.projects.filter(p=>p.start && p.start.startsWith(y+'-'+d2(mi+1))).length
    cells += '<div style="background:var(--bg-sunken);border-radius:var(--r-sm);padding:8px">'+
      '<div style="font-size:12px;margin-bottom:6px;display:flex;justify-content:space-between"><span>'+mn+'月</span><span class="mono tiny">'+mc+'</span></div>'+
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">'+inner+'</div></div>'
  })
  return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">'+cells+'</div>'+
    '<div class="tiny" style="margin-top:12px"><span style="display:inline-block;width:10px;height:10px;background:rgba(107,122,99,.5);border-radius:2px;margin-right:4px"></span>有活动　'+
    '<span style="display:inline-block;width:10px;height:10px;background:rgba(185,153,90,.42);border-radius:2px;margin-right:4px"></span>有待办　'+
    '<span style="display:inline-block;width:10px;height:10px;background:rgba(166,93,85,.55);border-radius:2px;margin-right:4px"></span>有冲突</div>'
}
function dayTimeline(ds, cm){
  const evs = DB.projects.filter(p=>p.start===ds && p.status!=='dropped')
    .sort((a,b)=>(a.startTime||'')<(b.startTime||'')?-1:1)
  const todos = DB.todos.filter(t=>t.due===ds)
  let h = '<div class="timeline">'
  if(!evs.length && !todos.length){
    h += '<div class="empty"><div class="big">'+fmtDate(ds)+' 没有安排</div>从活动库导入一条，或新建待办</div>'
  }
  evs.forEach(p=>{
    const cf = cm[p._id]||[]
    h += '<div class="tl-i'+(p.startTime && p.startTime<=nowTime() && (!p.endTime||p.endTime>=nowTime())?' now':'')+'" data-open="'+p._id+'">'+
      '<div class="tl-t mono">'+(p.startTime||'全天')+(p.endTime?'–'+p.endTime:'')+(p.place?' · '+esc(p.place):'')+'</div>'+
      '<div class="tl-b">'+esc(p.title)+'</div>'+
      '<div class="tl-m">'+esc(p.org||'—')+(p.why?' · 想去的原因：'+esc(p.why):'')+'</div>'+
      (cf.length?cf.map(c=>'<div class="warnbar'+(c.type==='time'?' err':'')+'" style="margin:6px 0 0">'+ICON('M12 9v4M12 17h.01','ico')+'<div>'+esc(c.msg)+'</div></div>').join(''):'')+
      '</div>'
  })
  todos.forEach(t=>{
    h += '<div class="tl-i"><div class="tl-t mono">待办</div><div class="tl-b">'+(t.done?'<span class="done-state" style="padding:0 4px;border-radius:4px">'+esc(t.title)+'</span>':esc(t.title))+'</div>'+
      '<div class="tl-m">'+(t.priority==='high'?'<span class="tag x">高</span>':'')+'</div></div>'
  })
  h += '</div>'
  return h
}

/* ============================================================
   13. 视图：复盘
   ============================================================ */
const RV_TPL = [
  {k:'goal',   h:'本周目标', ph:'≤3 条，必须能判断完成与否'},
  {k:'result', h:'实际结果', ph:'只写事实，不写评价'},
  {k:'loved',  h:'Loved · 有能量的瞬间', ph:'哪个瞬间让你觉得"这就对了"？'},
  {k:'loathed',h:'Loathed · 被消耗的', ph:'什么在持续抽走你的能量？'},
  {k:'longed', h:'Longed for · 缺的', ph:'缺什么会让这周顺很多？'},
  {k:'learned',h:'Learned · 学到的', ph:'具体到一个能复用的做法'},
  {k:'insight',h:'洞察', ph:'一句话，写给下周的自己'}
]
function viewReview(){
  const list = DB.reviews.slice().sort((a,b)=>b.id<b.id?-1:1)
  let h = '<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>复盘</h3><div class="sp"></div>'+
    '<span class="tiny">'+list.length+' 篇</span>'+
    '<button class="btn primary sm" data-act="rvnew">'+ICON('M12 5v14M5 12h14')+'写一篇</button></div>'+
    '<div class="sub">模板基于 GRAI（目标-结果-分析-洞察）+ 4L（有能量-被消耗-缺的-学到）。'+
    '写的时候只填事实，没做的写「材料未提及」，不编。</div></div>'
  h += list.length ? list.map(r=>{
    const filled = RV_TPL.filter(t=>r[t.k] && r[t.k].trim()).length
    return '<div class="card" style="margin-bottom:12px"><div class="card-h">'+
      '<h3>'+esc(r.title||'复盘')+'</h3><div class="sp"></div>'+
      '<span class="tiny">'+esc(r.date||'')+' · 已填 '+filled+'/'+RV_TPL.length+'</span>'+
      '<button class="btn ghost sm" data-act="rvopen" data-id="'+r._id+'">打开</button>'+
      '<button class="btn ghost sm" data-act="rvdel" data-id="'+r._id+'">删</button></div>'+
      '<div class="sub">'+esc((r.insight||r.goal||r.result||'').slice(0,120))+( (r.insight||r.goal||r.result||'').length>120?'…':'')+'</div></div>'
  }).join('') : '<div class="card"><div class="empty"><div class="big">还没有复盘记录</div>建议每周固定一个时间写，周日晚上 20 分钟</div></div>'
  return h
}

/* ============================================================
   14. 视图：语音笔记
   ============================================================ */
function viewNote(){
  const list = DB.notes.slice().sort((a,b)=>b.createdAt-a.createdAt)
  let h = '<div class="card" style="margin-bottom:16px">'+
    '<div class="card-h"><h3>快速语音笔记</h3><div class="sp"></div>'+
    '<span class="tiny">'+list.length+' 条</span></div>'+
    '<div class="voice-bar">'+
      '<span class="rec-dot'+(recording?' live':'')+'" id="recDot"></span>'+
      '<div class="wave" id="wave">'+Array.from({length:22},()=>'<i></i>').join('')+'</div>'+
      '<span class="tiny mono" id="recTime">00:00</span>'+
      '<button class="btn'+(recording?' danger':' primary')+' sm" id="btnRec">'+ICON('M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4')+(recording?'停止':'开始录音')+'</button>'+
    '</div>'+
    '<div class="sub" id="recHint">按「开始录音」说话，实时上屏。说完点「停止」自动存为一条笔记。'+
    (supportsASR()?'':' 当前浏览器不支持实时识别，录音仍会保存（但没有文字）。')+'</div></div>'
  h += '<div class="card">'+ (list.length ? list.map(n=>
    '<div class="note-i"><div class="body">'+
      '<div class="tx">'+(n.transcript?esc(n.transcript):'<span class="tiny">（无转写文字）</span>')+'</div>'+
      '<div class="tm">'+new Date(n.createdAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})+
      (n.duration?' · '+fmtDur(n.duration):'')+'</div>'+
      '<div style="margin-top:6px;display:flex;gap:5px">'+
        '<button class="btn ghost sm" data-act="n2t" data-id="'+n._id+'">转成待办</button>'+
        '<button class="btn ghost sm" data-act="n2p" data-id="'+n._id+'">转成活动</button>'+
        '<button class="btn ghost sm" data-act="ndel" data-id="'+n._id+'">删</button>'+
      '</div>'+
    '</div></div>').join('') : '<div class="empty"><div class="big">还没有笔记</div>灵感来的时候，说一句就好</div>')+'</div>'
  return h
}
function fmtDur(ms){
  const s = Math.floor(ms/1000)
  return d2(Math.floor(s/60))+':'+d2(s%60)
}

/* ============================================================
   15. 视图：人生链条
   ============================================================ */
function viewChain(){
  let h = '<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>人生链条</h3></div>'+
    '<div class="sub">四条线索串起你的所有活动。每条都记一个方向，年底回看时才知道自己在往哪走。</div>'+
    '<div class="chain-grid" style="margin-top:14px">'
  h += CHAINS.map(c=>{
    const p = chainProgress(c.k)
    const ps = DB.projects.filter(x=>(x.chains||[]).includes(c.k))
    return '<div class="chain-c" style="--cc:'+c.c+'">'+
      '<div class="h">'+esc(c.n)+'</div>'+
      '<div class="d">'+esc(c.d)+'</div>'+
      '<div class="bar"><i style="width:'+p.pct+'%"></i></div>'+
      '<div class="ft"><span>完成 '+p.done+' / '+p.total+'</span><span>'+p.active+' 项进行中</span></div>'+
      '<div style="margin-top:8px"><div class="lbl">方向</div>'+
      '<input class="inp" style="font-size:12px;padding:6px 9px" data-chain-goal="'+c.k+'" value="'+esc(p.goal)+'" placeholder="今年在这条线上想完成什么？"></div>'+
      (ps.length?'<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">'+
        ps.slice(0,5).map(x=>'<span class="tag'+(x.status==='done'?' a':'')+'" data-open="'+x._id+'" style="cursor:pointer">'+esc(x.title.slice(0,12))+'</span>').join('')+
        (ps.length>5?'<span class="tiny">+'+(ps.length-5)+'</span>':'')+'</div>':'')+
      '</div>'
  }).join('')
  h += '</div></div>'
  return h
}

/* ============================================================
   16. 视图：每周推荐
   ============================================================ */
function viewPicks(){
  const list = DB.picks.filter(p=>p.status===pickFilter)
  let h = '<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>每周推荐</h3><div class="sp"></div>'+
    '<span class="tiny">'+pendingPicks()+' 条待你确认</span></div>'+
    '<div class="sub">每周一 10:00 自动检索并推送。你点「加入」才会进活动库 —— 不会自动塞给你。</div></div>'
  h += '<div class="card">'+(list.length ? list.map(p=>
    '<div class="pick">'+
      '<div class="score mono">'+p.score+'<small>匹配</small></div>'+
      '<div class="body">'+
        '<div class="t">'+esc(p.title)+'</div>'+
        (p.why?'<div class="why">'+esc(p.why)+'</div>':'')+
        '<div class="m">'+
          (p.source?'<span class="tag">'+esc(p.source)+'</span>':'')+
          (p.deadline?'<span class="tag o">截止 '+fmtDate(p.deadline)+'</span>':'')+
          (p.place?'<span class="tag">'+esc(p.place)+'</span>':'')+
          (p.url?'<a href="'+esc(p.url)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">打开原文 ↗</a>':'')+
        '</div>'+
      '</div>'+
      '<div class="acts">'+
        (p.status==='pending'
          ? '<button class="btn primary sm" data-act="padd" data-id="'+p._id+'">加入</button>'+
            '<button class="btn ghost sm" data-act="pign" data-id="'+p._id+'">忽略</button>'
          : '<span class="tag '+(p.status==='added'?'a':'x')+'">'+(p.status==='added'?'已加入':'已忽略')+'</span>')+
      '</div>'+
    '</div>').join('') : '<div class="empty"><div class="big">'+(pickFilter==='pending'?'这周没有待确认的推荐':'暂无记录')+'</div>'+
    '每周一 10:00 会自动更新</div>')+'</div>'
  return h
}
