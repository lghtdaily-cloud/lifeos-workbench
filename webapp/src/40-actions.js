/* ============================================================
   17. 弹层基础设施
   ============================================================ */
function openModal(title, bodyHTML, footHTML){
  const root = $('#modalRoot')
  root.innerHTML = '<div class="mask" id="mask"><div class="modal" role="dialog" aria-modal="true">'+
    '<div class="modal-h"><h3>'+esc(title)+'</h3>'+
      '<button class="btn ghost sm" data-close>关闭</button></div>'+
    '<div class="modal-b" id="mBody">'+bodyHTML+'</div>'+
    (footHTML?'<div class="modal-f">'+footHTML+'</div>':'')+
    '</div></div>'
  $('#mask').onclick = e=>{ if(e.target.id==='mask') closeModal() }
  $$('#modalRoot [data-close]').forEach(b=>b.onclick=closeModal)
  document.body.style.overflow = 'hidden'
  return $('#mBody')
}
function closeModal(){
  $('#modalRoot').innerHTML = ''
  document.body.style.overflow = ''
}

/* ============================================================
   18. 动作分发
   ============================================================ */
function handleAct(act, id, el){
  switch(act){
    case 'import': return openLinkImport()
    case 'edit':   return openProject(id)
    case 'mail':   return openMail(id)
    case 'insight':return openInsight(id)
    case 'pnew':   return openProjectEdit(null)
    case 'padd':   return pickAdd(id)
    case 'pign':   return pickIgnore(id)
    case 'tnew':   return openTodoEdit(null)
    case 'tedit':  return openTodoEdit(id)
    case 'tdel':   return todoDel(id)
    case 'ttab':   return (libFilter=el.dataset.k, view='todo', render())
    case 'rvnew':  return openReview(null)
    case 'rvopen': return openReview(id)
    case 'rvdel':  return reviewDel(id)
    case 'n2t':    return note2todo(id)
    case 'n2p':    return note2project(id)
    case 'ndel':   return noteDel(id)
    case 'cprev':  return calNav(-1)
    case 'cnext':  return calNav(1)
    case 'ctoday': return calToday()
    case 'cmode':  return (calMode=el.dataset.k, render())
  }
}
function calNav(n){
  if(calMode==='year') calCursor = new Date(calCursor.getFullYear()+n, 0, 1)
  else if(calMode==='month') calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth()+n, 1)
  else if(calMode==='week') calCursor = new Date(calCursor.getTime()+n*7*86400000)
  else { const d=new Date(calSel); d.setDate(d.getDate()+n); calSel = iso(d) }
  render()
}
function calToday(){ calCursor = new Date(TODAY.getFullYear(),TODAY.getMonth(),1); calSel = todayISO(); render() }

/* ============================================================
   19. 链接导入
   ============================================================ */
function openLinkImport(){
  const b = openModal('导入活动',
    '<button class="btn block" id="btnClip">从微信剪贴板粘贴并识别</button>'+
    '<div class="tiny" style="margin:8px 0 14px">在微信里长按那条链接 → 复制，点上面按钮即可读入；弹窗打开时也会自动尝试一次。'+
    '（这一步解决了「自动载入微信里我发自己的链接」——微信不开放读聊天记录，复制后剪贴板捕获是最合规的做法。）</div>'+
    '<div class="fld"><label class="lbl">活动链接 / 原文粘贴</label>'+
    '<textarea class="inp" id="impRaw" rows="7" placeholder="把公众号文章链接连同正文一起粘进来。&#10;&#10;例：&#10;https://mp.weixin.qq.com/s/xxxxx&#10;【复调的艺术史·国际学术营】学员招募&#10;时间：10月25日-10月28日&#10;地点：重庆·四川美术学院虎溪校区&#10;报名截止：10月20日&#10;要求：提交个人简历与作品集&#10;邮箱：apply@example.com"></textarea></div>'+
    '<div class="tiny" style="margin:-6px 0 14px">解析规则：会自动拆出时间、地点、截止、费用、联系方式、报名要求。'+
    '原文没写的字段会标为「未确认」，<b>不会替你编</b>。</div>'+
    '<div class="fld"><label class="lbl">我为什么想去（必填）</label>'+
    '<textarea class="inp" id="impWhy" rows="2" placeholder="一句话。这条会跟着活动一直走，年底复盘时回看。"></textarea></div>'+
    '<div class="fld"><label class="lbl">人生链条（可多选）</label>'+
    '<div class="chips" id="impChains">'+CHAINS.map(c=>
      '<button class="chip" data-ch="'+c.k+'">'+c.n+'</button>').join('')+'</div></div>'+
    '<div id="impPreview"></div>',
    '<button class="btn" data-close>取消</button><button class="btn primary" id="btnParse">解析并加入</button>')

  const picked = new Set()
  $$('#impChains .chip').forEach(c=>c.onclick=()=>{
    const k=c.dataset.ch
    if(picked.has(k)){ picked.delete(k); c.classList.remove('on') } else { picked.add(k); c.classList.add('on') }
  })

  const rawEl = $('#impRaw')
  const previewEl = $('#impPreview')
  const kv = (k,v)=>'<div class="kv"><div class="k">'+k+'</div><div class="v">'+esc(v)+'</div></div>'
  function renderPreview(){
    const raw = rawEl.value.trim()
    if(!raw){ previewEl.innerHTML=''; return }
    const p = parseLink(raw)
    const ct = p.contacts||{}
    const cs = [ct.email, ct.wechat?'微信:'+ct.wechat:'', ct.phone, ct.form].filter(Boolean)
    let h = '<div class="card" style="margin-top:12px"><div class="card-h"><div class="t">解析结果预览</div></div>'+
      kv('标题', p.title||'未命名')+
      kv('开始', (p.start||'未确认')+(p.startTime?' '+p.startTime:''))+
      kv('结束', p.end?(p.end+(p.endTime?' '+p.endTime:'')):'—')+
      kv('地点', p.place||'未确认')+
      kv('报名截止', p.deadline||'未确认')+
      kv('费用', p.fee||'未写')+
      kv('联系方式', cs.length?cs.join(' / '):'未抓到')+
      kv('报名要求', (p.requirements||[]).length?p.requirements.join('、'):'未识别')
    if((p.missing||[]).length) h += '<div class="warnbar">原文没写、需要你确认：'+esc(p.missing.join('、'))+'</div>'
    h += '</div>'
    previewEl.innerHTML = h
  }
  rawEl.oninput = renderPreview

  async function tryClip(){
    try{
      if(navigator.clipboard && navigator.clipboard.readText){
        const t = (await navigator.clipboard.readText()).trim()
        if(t){ rawEl.value = t; renderPreview(); toast('已从剪贴板填入') }
      }
    }catch(e){ /* 需用户手势或权限，静默 */ }
  }
  const btnClip = $('#btnClip')
  if(btnClip) btnClip.onclick = tryClip
  tryClip() // 弹窗打开即尝试一次（https / localhost 下通常可静默读取）

  $('#btnParse').onclick = ()=>{
    const raw = $('#impRaw').value.trim()
    if(!raw){ toast('先粘贴一段链接或原文'); return }
    const why = $('#impWhy').value.trim()
    if(!why){ toast('请写一句「我为什么想去」'); return }
    const p = parseLink(raw)
    p.motivation = why
    if(picked.size) p.chains = Array.from(picked)
    p._id = uid()
    p.status = 'candidate'
    p.cats = inferCats(p)
    p.createdAt = Date.now()
    p.why = why
    p.source = '手动导入'
    DB.projects.unshift(p)
    save()
    closeModal()
    view = 'lib'
    render()
    toast('已加入活动库')
  }
}
function inferCats(p){
  const t = [p.title,p.org,p.content,p.place].join(' ')
  const c = []
  if(/(学术|论坛|研讨会|沙龙|讲座|征稿|论文|课题|研究|研修|学术营|读书会|理论|批评|策展研究)/.test(t)) c.push('academic')
  if(/(工作坊|招募|实践|报名|征集|参赛|竞赛|大赛|展览|驻留|创作营|训练营|实训|志愿服务|实习|市集|演出|公教|美育|体验营)/.test(t)) c.push('practice')
  if(/(四川美术学院|川美|造型艺术|实验艺术|艺术人文|公共艺术|建筑与环境设计|中国画与书法|动画影视|设计学院|美术馆)/.test(t)) c.push('scfai')
  if(/(重庆|渝|巴渝|山城|两江|川渝|成渝|西南大学|重庆大学)/.test(t)) c.push('chongqing')
  return c
}

/* ============================================================
   20. 项目详情 / 编辑
   ============================================================ */
function openProject(id){
  const p = DB.projects.find(x=>x._id===id)
  if(!p) return
  const cm = conflictMap()
  const cf = cm[id]||[]
  const todos = todosOfProject(id)
  const st = PSTATUS[p.status]||PSTATUS.candidate
  const chainN = (p.chains||[]).map(k=>{const c=CHAINS.find(x=>x.k===k);return c?c.n:''}).filter(Boolean)

  const b = openModal(p.title,
    (cf.length?'<div class="warnbar'+(cf[0].type==='time'?' err':'')+'">'+ICON('M12 9v4M12 17h.01','ico')+'<div>'+cf.map(c=>esc(c.msg)).join('<br>')+'</div></div>':'')+
    '<div class="chips" style="margin-bottom:14px">'+
      '<span class="tag '+st.c+'">'+st.n+'</span>'+
      chainN.map(n=>'<span class="tag p">'+esc(n)+'</span>').join('')+
      (p.cats||[]).map(c=>'<span class="tag">'+catName(c)+'</span>').join('')+
      (p.fee?'<span class="tag o">'+esc(p.fee)+'</span>':'')+
    '</div>'+
    '<div class="grid2" style="margin-bottom:14px">'+
      '<div><div class="lbl">时间</div><div class="mono">'+
        (p.start?fmtDateFull(p.start)+(p.startTime?' '+p.startTime:''):'未确认')+
        (p.end?' → '+fmtDateFull(p.end)+(p.endTime?' '+p.endTime:''):'')+'</div></div>'+
      '<div><div class="lbl">地点</div><div>'+(p.place?esc(p.place)+(p.isOnline?'（线上）':''):'未确认')+'</div></div>'+
      '<div><div class="lbl">报名截止</div><div class="mono">'+(p.deadline?fmtDateFull(p.deadline)+' '+relDeadline(p.deadline).txt:'未确认')+'</div></div>'+
      '<div><div class="lbl">主办方</div><div>'+esc(p.org||'未注明')+'</div></div>'+
    '</div>'+
    (p.why?'<div class="fld"><div class="lbl">我为什么想去</div><div class="rv-fld" style="border-left:2px solid var(--clay)">'+esc(p.why)+'</div></div>':'')+
    (p.content?'<div class="fld"><div class="lbl">活动内容</div><div class="sub" style="max-height:190px;overflow-y:auto;white-space:pre-wrap">'+esc(p.content)+'</div></div>':'')+
    (p.requirements&&p.requirements.length?'<div class="fld"><div class="lbl">报名要求（拆解）</div><div class="chips">'+
      p.requirements.map(r=>'<span class="tag x">'+esc(r)+'</span>').join('')+'</div></div>':'')+
    '<div class="fld"><div class="lbl">联系方式</div><div class="chips">'+
      (p.contacts&&p.contacts.email?'<span class="tag a">'+esc(p.contacts.email)+'</span>':'')+
      (p.contacts&&p.contacts.wechat?'<span class="tag a">微信 '+esc(p.contacts.wechat)+'</span>':'')+
      (p.contacts&&p.contacts.phone?'<span class="tag a">'+esc(p.contacts.phone)+'</span>':'')+
      (p.contacts&&p.contacts.form?'<span class="tag">表单</span>':'')+
      ((!p.contacts || (!p.contacts.email&&!p.contacts.wechat&&!p.contacts.phone&&!p.contacts.form))?'<span class="tag x">未抓到，需手动补</span>':'')+
      '</div></div>'+
    (p.missing&&p.missing.length?'<div class="warnbar">'+ICON('M12 9v4M12 17h.01','ico')+
      '<div><b>这些字段原文没写，需要你确认：</b>'+p.missing.map(esc).join('、')+'</div></div>':'')+
    '<div class="fld"><div class="lbl">相关待办（'+todos.length+'）</div>'+
      (todos.length?todos.map(todoRow).join(''):'<div class="tiny">还没有拆出待办</div>')+
      '<button class="btn sm" style="margin-top:8px" data-act="p2t" data-id="'+id+'">从报名要求生成待办</button></div>',
    '<button class="btn" data-act="insight" data-id="'+id+'">需求洞察</button>'+
    '<button class="btn" data-act="mail" data-id="'+id+'">邮件报名</button>'+
    '<button class="btn" data-act="pstatus" data-id="'+id+'">改状态</button>'+
    '<button class="btn primary" data-act="pedit" data-id="'+id+'">编辑</button>')

  // 弹层内动作
  $$('#mBody [data-act]').forEach(x=>x.onclick=e=>{
    e.stopPropagation()
    const a = x.dataset.act
    if(a==='p2t') return proj2todo(id)
    if(a==='insight') return openInsight(id)
    if(a==='mail') return openMail(id)
    if(a==='pstatus') return cycleStatus(id)
    if(a==='pedit') return openProjectEdit(id)
  })
  $$('#mBody [data-todo]').forEach(x=>x.onclick=e=>{ e.stopPropagation(); toggleTodo(x.dataset.todo); closeModal(); openProject(id) })
}

function cycleStatus(id){
  const p = DB.projects.find(x=>x._id===id)
  const order = ['candidate','signed','done','dropped']
  p.status = order[(order.indexOf(p.status)+1)%order.length]
  if(p.status==='done') p.doneAt = Date.now()
  save(); closeModal(); render(); toast('状态：'+(PSTATUS[p.status]||{}).n)
}

function openProjectEdit(id){
  const p = id ? DB.projects.find(x=>x._id===id) : {
    _id:uid(), title:'', org:'', start:'', end:'', startTime:'', endTime:'',
    place:'', isOnline:false, deadline:'', fee:'', content:'', why:'',
    requirements:[], contacts:{email:'',wechat:'',phone:'',form:''},
    chains:[], cats:[], missing:[], status:'candidate', createdAt:Date.now(), source:'手动创建'
  }
  const isNew = !id
  const b = openModal(isNew?'新建活动':'编辑活动',
    '<div class="fld"><label class="lbl">标题 *</label><input class="inp" id="fTitle" value="'+esc(p.title)+'"></div>'+
    '<div class="fld"><label class="lbl">主办方</label><input class="inp" id="fOrg" value="'+esc(p.org)+'"></div>'+
    '<div class="grid2">'+
      '<div class="fld"><label class="lbl">开始日期</label><input class="inp" id="fStart" type="date" value="'+esc(p.start)+'"></div>'+
      '<div class="fld"><label class="lbl">结束日期</label><input class="inp" id="fEnd" type="date" value="'+esc(p.end)+'"></div>'+
      '<div class="fld"><label class="lbl">开始时间</label><input class="inp" id="fStartT" type="time" value="'+esc(p.startTime)+'"></div>'+
      '<div class="fld"><label class="lbl">结束时间</label><input class="inp" id="fEndT" type="time" value="'+esc(p.endTime)+'"></div>'+
    '</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label class="lbl">地点</label><input class="inp" id="fPlace" value="'+esc(p.place)+'" placeholder="如：重庆·沙坪坝 / 线上"></div>'+
      '<div class="fld"><label class="lbl">报名截止</label><input class="inp" id="fDdl" type="date" value="'+esc(p.deadline)+'"></div>'+
    '</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label class="lbl">费用</label><input class="inp" id="fFee" value="'+esc(p.fee)+'" placeholder="免费 / 票价"></div>'+
      '<div class="fld"><label class="lbl">状态</label><select class="inp" id="fStatus">'+
        Object.entries(PSTATUS).map(([k,v])=>'<option value="'+k+'"'+(p.status===k?' selected':'')+'>'+v.n+'</option>').join('')+
      '</select></div>'+
    '</div>'+
    '<div class="fld"><label class="lbl">我为什么想去</label><textarea class="inp" id="fWhy" rows="2">'+esc(p.why||'')+'</textarea></div>'+
    '<div class="fld"><label class="lbl">报名要求（每行一条）</label><textarea class="inp" id="fReq" rows="3">'+esc((p.requirements||[]).join('\n'))+'</textarea></div>'+
    '<div class="fld"><label class="lbl">联系方式</label><div class="grid2">'+
      '<input class="inp" id="fMail" placeholder="邮箱" value="'+esc(p.contacts&&p.contacts.email||'')+'">'+
      '<input class="inp" id="fWx" placeholder="微信号" value="'+esc(p.contacts&&p.contacts.wechat||'')+'">'+
    '</div></div>'+
    '<div class="fld"><label class="lbl">活动内容 / 原文摘录</label><textarea class="inp" id="fContent" rows="4">'+esc(p.content||'')+'</textarea></div>'+
    '<div class="fld"><label class="lbl">人生链条</label><div class="chips" id="fChains">'+
      CHAINS.map(c=>'<button class="chip'+(p.chains&&p.chains.includes(c.k)?' on':'')+'" data-ch="'+c.k+'">'+c.n+'</button>').join('')+
    '</div></div>'+
    '<div class="fld"><label class="lbl">活动链接</label><input class="inp" id="fUrl" value="'+esc(p.url||'')+'"></div>',
    '<button class="btn" data-close>取消</button>'+
    (isNew?'':'<button class="btn danger" id="btnDel">删除</button>')+
    '<button class="btn primary" id="btnSave">保存</button>')

  const picked = new Set(p.chains||[])
  $$('#fChains .chip').forEach(c=>c.onclick=()=>{
    const k=c.dataset.ch
    if(picked.has(k)){ picked.delete(k); c.classList.remove('on') } else { picked.add(k); c.classList.add('on') }
  })
  $('#btnSave').onclick = ()=>{
    const t = $('#fTitle').value.trim()
    if(!t){ toast('标题不能为空'); return }
    p.title = t
    p.org = $('#fOrg').value.trim()
    p.start = $('#fStart').value
    p.end = $('#fEnd').value
    p.startTime = $('#fStartT').value
    p.endTime = $('#fEndT').value
    p.place = $('#fPlace').value.trim()
    p.isOnline = /线上|在线|zoom|腾讯|钉钉|微信会议/i.test(p.place)
    p.deadline = $('#fDdl').value
    p.fee = $('#fFee').value.trim()
    p.status = $('#fStatus').value
    p.why = $('#fWhy').value.trim()
    p.requirements = $('#fReq').value.split('\n').map(s=>s.trim()).filter(Boolean)
    p.contacts = Object.assign({}, p.contacts, {email:$('#fMail').value.trim(), wechat:$('#fWx').value.trim()})
    p.content = $('#fContent').value
    p.chains = Array.from(picked)
    p.url = $('#fUrl').value.trim()
    if(!p.cats||!p.cats.length) p.cats = inferCats(p)
    if(!isNew){
      const i = DB.projects.findIndex(x=>x._id===id)
      if(i>=0) DB.projects[i] = p
    } else {
      DB.projects.unshift(p)
    }
    save(); closeModal(); render(); toast(isNew?'已创建':'已保存')
  }
  if(!isNew) $('#btnDel').onclick = ()=>{
    if(!confirm('删除这条活动？')) return
    DB.projects = DB.projects.filter(x=>x._id!==id)
    DB.removed.push(id)
    save(); closeModal(); render(); toast('已删除')
  }
}

/* ============================================================
   21. 报名要求 → 待办（拆解）
   ============================================================ */
const REQ_TPL = {
  '作品集': '整理并提交作品集',
  '个人简历': '撰写并提交个人简历',
  '简历': '撰写并提交个人简历',
  '自述': '撰写个人自述',
  '报名表': '填写报名表',
  '身份证明': '准备身份证明材料',
  '学生证': '准备学生证',
  '获奖证明': '收集获奖证明扫描件',
  '技术方案': '撰写技术方案',
  '创作计划': '撰写创作计划',
  '一分钟视频': '拍摄一分钟自我介绍视频',
  '视频作品集': '剪辑视频作品集',
  '设计稿': '整理设计稿',
  '方案文本': '撰写方案文本',
  '推荐信': '联系推荐人并获取推荐信'
}
function proj2todo(pid){
  const p = DB.projects.find(x=>x._id===pid)
  if(!p) return
  const reqs = p.requirements||[]
  const base = [
    {title:'确认报名截止时间并设提醒', due:p.deadline, priority:'high'},
    {title:'准备「'+p.title.slice(0,16)+'」的报名材料', due:p.deadline, priority:'high'}
  ]
  let n = 0
  reqs.forEach(r=>{
    const key = Object.keys(REQ_TPL).find(k=>r.includes(k))
    if(key){
      addTodo({title:REQ_TPL[key], due:p.deadline, priority:'high', projectId:pid, note:'来自报名要求：'+r})
      n++
    }
  })
  base.forEach(b=>addTodo(Object.assign(b, {projectId:pid})))
  if(!p.contacts||!p.contacts.email){
    addTodo({title:'找到主办方联系方式并投递', due:p.deadline, priority:'high', projectId:pid})
  }
  save()
  closeModal(); view='todo'; render()
  toast('已生成 '+(n+base.length+(p.contacts&&p.contacts.email?0:1))+' 条待办')
}

/* ============================================================
   22. 一键邮件报名
   ============================================================ */
function mailTemplate(p){
  const name = p.who || '（你的名字）'
  const lines = []
  lines.push('主题：报名「'+p.title+'」——'+name+'（'+(p.school||'四川美术学院')+'）')
  lines.push('')
  lines.push('敬礼：')
  lines.push('')
  lines.push('您好，我是在校学生，冒昧来信报名「'+p.title+'」。')
  if(p.why) lines.push(''), lines.push('我关注这个活动，是因为：'+p.why)
  lines.push('')
  lines.push('基本信息：')
  lines.push('· 姓名：'+name)
  lines.push('· 学校：'+(p.school||'四川美术学院')+(p.major?'（'+p.major+'）':''))
  lines.push('· 年级 / 年龄：'+ (p.grade||'（请填写）'))
  lines.push('· 联系方式：'+ (p.phone||'（请填写）'))
  lines.push('')
  lines.push('随信附上：')
  ;(p.requirements||[]).forEach(r=>lines.push('· '+r))
  lines.push('')
  lines.push('如需补充材料，请随时告知，我会尽快提供。')
  lines.push('')
  lines.push('顺祝')
  lines.push('时祺')
  lines.push('')
  lines.push(name)
  lines.push('四川美术学院')
  return lines.join('\n')
}
function openProfile(){
  const mp = DB.myProfile || (DB.myProfile = {})
  let pending = null
  const b = openModal('我的资料 / 简历',
    '<div class="tiny" style="margin-bottom:12px">这些信息会<b>自动带进</b>「一键邮件报名」的落款与联系方式，不用每次重填。</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label class="lbl">姓名</label><input class="inp" id="mpName" value="'+esc(mp.name||'')+'" placeholder="你的名字"></div>'+
      '<div class="fld"><label class="lbl">学校</label><input class="inp" id="mpSchool" value="'+esc(mp.school||'四川美术学院')+'" placeholder="四川美术学院"></div>'+
    '</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label class="lbl">专业</label><input class="inp" id="mpMajor" value="'+esc(mp.major||'')+'" placeholder="如：视觉传达"></div>'+
      '<div class="fld"><label class="lbl">年级/年龄</label><input class="inp" id="mpGrade" value="'+esc(mp.grade||'')+'" placeholder="如：大三 / 21岁"></div>'+
    '</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label class="lbl">电话</label><input class="inp" id="mpPhone" value="'+esc(mp.phone||'')+'" placeholder="手机号"></div>'+
      '<div class="fld"><label class="lbl">邮箱</label><input class="inp" id="mpEmail" value="'+esc(mp.email||'')+'" placeholder="你的邮箱"></div>'+
    '</div>'+
    '<div class="fld"><label class="lbl">一句话简介（可留空）</label><textarea class="inp" id="mpOne" rows="2" placeholder="一句能让人记住你的话">'+esc(mp.oneLiner||'')+'</textarea></div>'+
    '<div class="fld"><label class="lbl">上传简历（.txt / .md 可读取全文；.pdf 仅记录文件名，正文请贴到下面）</label>'+
      '<input type="file" id="mpFile" accept=".txt,.md,.pdf" style="font-size:13px">'+
      '<textarea class="inp" id="mpResume" rows="5" style="margin-top:8px" placeholder="简历正文 / 要点（可手填，也可上传 txt/md 后自动填入）">'+esc(mp.resumeText||'')+'</textarea>'+
      '<div class="tiny" style="margin-top:6px" id="mpFileInfo">'+(mp.resumeName?('当前已存：'+esc(mp.resumeName)+'（'+(mp.resumeText?mp.resumeText.length+' 字':'仅文件名')+'）'):'未上传')+'</div></div>',
    '<button class="btn" data-close>取消</button><button class="btn primary" id="btnSaveProfile">保存</button>')

  const fileEl = $('#mpFile')
  if(fileEl) fileEl.onchange = (e)=>{
    const f = e.target.files && e.target.files[0]
    if(!f) return
    const info = $('#mpFileInfo')
    if(/\.pdf$/i.test(f.name)){
      pending = { name:f.name, text:'' }
      info.textContent = '已选 PDF：'+f.name+'（无法读取正文，请把要点贴到上方文本框）'
      return
    }
    const r = new FileReader()
    r.onload = ()=>{ pending = { name:f.name, text:String(r.result||'') }; $('#mpResume').value = String(r.result||''); info.textContent = '已读取：'+f.name+'（'+(r.result?String(r.result).length:0)+' 字）' }
    r.readAsText(f)
  }

  $('#btnSaveProfile').onclick = ()=>{
    const m = DB.myProfile
    m.name = $('#mpName').value.trim()
    m.school = $('#mpSchool').value.trim() || '四川美术学院'
    m.major = $('#mpMajor').value.trim()
    m.grade = $('#mpGrade').value.trim()
    m.phone = $('#mpPhone').value.trim()
    m.email = $('#mpEmail').value.trim()
    m.oneLiner = $('#mpOne').value.trim()
    if(pending){ m.resumeName = pending.name; m.resumeText = pending.text; pending = null }
    else { m.resumeName = mp.resumeName || ''; m.resumeText = $('#mpResume').value }
    m.updatedAt = Date.now()
    save(); closeModal(); toast('已保存我的资料')
  }
}

function openMail(pid){
  const p = DB.projects.find(x=>x._id===pid)
  if(!p) return
  const to = (p.contacts&&p.contacts.email)||''
  const mp = DB.myProfile || {}
  // 项目级信息优先；缺失时自动补「我的资料」
  const draft = Object.assign({}, p, {
    who: p.who || mp.name || '',
    school: mp.school || '四川美术学院',
    major: p.major || mp.major || '',
    grade: p.grade || mp.grade || '',
    phone: p.phone || mp.phone || ''
  })
  let body = mailTemplate(draft)
  // 自动附上简历要点
  if(mp.resumeText && mp.resumeText.trim()){
    body += '\n\n—— 附：我的简历要点 ——\n' + mp.resumeText.trim().slice(0, 2000)
  }
  const b = openModal('一键邮件报名',
    '<div class="warnbar">'+ICON('M12 9v4M12 17h.01','ico')+
    '<div>'+(to?'收件人已抓到：<b>'+esc(to)+'</b>':'<b>原文里没抓到邮箱</b>，请手动填一个收件人，或改用微信/表单联系。')+'</div></div>'+
    '<div class="fld"><label class="lbl">收件人</label><input class="inp" id="mTo" value="'+esc(to)+'" placeholder="对方邮箱"></div>'+
    '<div class="grid2">'+
      '<div class="fld"><label class="lbl">我的姓名</label><input class="inp" id="mName" value="'+esc(draft.who)+'" placeholder="你的名字"></div>'+
      '<div class="fld"><label class="lbl">我的电话</label><input class="inp" id="mPhone" value="'+esc(draft.phone)+'" placeholder="手机号"></div>'+
    '</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label class="lbl">年级/年龄</label><input class="inp" id="mGrade" value="'+esc(draft.grade)+'" placeholder="如：大三 / 21岁"></div>'+
      '<div class="fld"><label class="lbl">专业</label><input class="inp" id="mMajor" value="'+esc(draft.major)+'" placeholder="如：视觉传达"></div>'+
    '</div>'+
    '<div class="fld"><label class="lbl">正文（可改）</label><textarea class="inp" id="mBodyTxt" rows="14">'+esc(body)+'</textarea></div>'+
    '<div class="tiny">提示：微信内打开时，<b>网页版 mailto 常常不触发</b>。点「复制正文」后到微信里粘贴更稳。简历要点已自动附在末尾。</div>',
    '<button class="btn" id="btnCopyBody">复制正文</button>'+
    '<button class="btn primary" id="btnSendMail">用邮件客户端打开</button>')

  $('#btnCopyBody').onclick = ()=>{ copyText($('#mBodyTxt').value); }
  $('#btnSendMail').onclick = ()=>{
    const to = $('#mTo').value.trim()
    if(!to){ toast('先填收件人邮箱'); return }
    // 保存填写的信息，回写到项目
    p.who = $('#mName').value.trim()
    p.phone = $('#mPhone').value.trim()
    p.grade = $('#mGrade').value.trim()
    p.major = $('#mMajor').value.trim()
    save()
    const subj = encodeURIComponent($('#mBodyTxt').value.split('\n')[0].replace(/^主题：/,''))
    const content = encodeURIComponent($('#mBodyTxt').value)
    const href = 'mailto:'+encodeURIComponent(to)+'?subject='+subj+'&body='+content
    window.location.href = href
    toast('已调起邮件客户端；若没反应请用「复制正文」')
  }
}

/* ============================================================
   23. 甲方需求洞察 + 心理推断
   ============================================================ */
function openInsight(pid){
  const p = DB.projects.find(x=>x._id===pid)
  if(!p) return
  const t = [p.title,p.org,p.content,(p.requirements||[]).join(' ')].join(' ')
  const orgType = guessOrgType(p.org, t)
  const real = guessRealNeed(p, t, orgType)
  const theyWant = guessTheyWant(p, t, orgType)
  const myAngle = guessMyAngle(p, orgType)
  const risks = guessRisks(p, t)
  const talk = talkTracks(orgType, p)

  openModal('需求洞察 · '+esc(p.title.slice(0,18)),
    '<div class="card" style="margin-bottom:14px;background:var(--bg-sunken);box-shadow:none">'+
      '<div class="lbl">主办方类型推断</div>'+
      '<div style="font-size:15px;font-family:var(--font-serif)">'+esc(orgType)+'</div>'+
      '<div class="sub" style="margin-top:6px">依据：主办方名称与活动描述中的信号词。'+
      '这是<b>推断</b>不是事实，落地前请自行核对。</div></div>'+

    '<div class="ins" style="margin-bottom:14px">'+
      '<div class="ins-b"><div class="h">真实诉求（他们嘴上说的 vs 实际要的）</div>'+
        '<ul>'+real.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>'+
      '<div class="ins-b"><div class="h">他们会看重什么（选人标准）</div>'+
        '<ul>'+theyWant.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>'+
    '</div>'+

    '<div class="ins" style="margin-bottom:14px">'+
      '<div class="ins-b"><div class="h">我的切入角度</div>'+
        '<ul>'+myAngle.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>'+
      '<div class="ins-b red"><div class="h">风险与红旗</div>'+
        '<ul>'+(risks.length?risks.map(x=>'<li>'+esc(x)+'</li>').join(''):'<li>未发现明显红旗</li>')+'</ul></div>'+
    '</div>'+

    '<div class="fld"><div class="lbl">话术建议（按主办方类型）</div>'+
      '<div class="mail-pre">'+esc(talk)+'</div></div>'+
    '<div class="tiny">以上为基于公开文本的启发式推断，用于准备自己的表达。<b>不是事实断言</b>，别照抄。</div>',
    '<button class="btn" data-close>关闭</button><button class="btn primary" data-act="mail" data-id="'+pid+'">写报名信</button>')
  $$('#mBody [data-act]').forEach(x=>x.onclick=()=>openMail(pid))
}
function guessOrgType(org, text){
  const o = (org||'')+' '+text
  if(/(博物馆|美术馆|陈列馆|纪念馆|遗址|石窟|研究院|研究所)/.test(o)) return '博物馆/美术馆/文保机构'
  if(/(学院|大学|学校|院系|系部|研究生院)/.test(o)) return '高校院系'
  if(/(基金会|协会|学会|联合会|基金会)/.test(o)) return '行业协会/基金会'
  if(/(艺术节|双年展|博览会|展陈|艺委会|组委会)/.test(o)) return '艺术节/展览主办'
  if(/(社区|街道|乡镇|村委会|居民|村民)/.test(o)) return '社区/基层机构'
  if(/(公司|集团|品牌|企业|工作室|事务所)/.test(o)) return '企业/品牌'
  if(/(媒体|新媒体|公众号|电视台|报社|平台)/.test(o)) return '媒体/内容平台'
  if(/(政府|文旅局|文化馆|图书馆|文化中心|办公厅)/.test(o)) return '政府/公共文化机构'
  return '待确认（信息不足）'
}
function guessRealNeed(p, text, orgType){
  const out = []
  const n = p.requirements||[]
  if(n.some(x=>/作品集|设计稿|方案/.test(x)))
    out.push('他们要的不只是人手，而是<b>能直接用的产出</b>——作品集要能证明你能交付，不只是"喜欢艺术"。')
  if(n.some(x=>/简历|自述|报名表/.test(x)))
    out.push('筛选成本高，所以流程偏标准化。你的简历要<b>一眼可读</b>，不要写成散文。')
  if(n.some(x=>/视频/.test(x)))
    out.push('要视频说明<b>表达能力</b>，不只是作品展示。')
  if(/(免费|志愿者|实习)/.test(text) && orgType.includes('博物馆'))
    out.push('免费劳动 + 要作品集，常见于<b>换取作品集素材或学术产出</b>的交换，请确认署名权与作品归属。')
  if(/(驻留|创作营)/.test(text))
    out.push('驻留通常要<b>产出</b>（个展/作品/研究报告），进去之前先想清楚交什么。')
  if(/(工作坊|美育|公益|社区)/.test(text))
    out.push('面向公众的活动，真正的 KPI 常是<b>到场人数与传播效果</b>，不是艺术质量本身。')
  if(/(论坛|研讨|学术)/.test(text))
    out.push('学术活动看<b>发言准备度</b>，能提出一个具体问题比带来一篇成稿更有价值。')
  if(!out.length) out.push('信息不足，无法可靠判断。<b>不要编</b>——直接问对方："这个岗位/活动最看重什么？"')
  return out
}
function guessTheyWant(p, text, orgType){
  const out = []
  const n = p.requirements||[]
  if(n.some(x=>/作品集|设计稿/.test(x))) out.push('有<b>可展示的成品</b>，且风格与项目调性匹配')
  if(n.some(x=>/简历/.test(x))) out.push('基本功扎实、时间投入稳定')
  if(n.some(x=>/年级|年龄|专业/.test(x))) out.push('硬性条件先过，再看能力')
  if(/(指导|导师|评审|专家|教师)/.test(text)) out.push('能在专家面前<b>清晰表达自己的判断</b>')
  if(/(驻留|创作营|训练营)/.test(text)) out.push('持续创作能力与自我管理')
  if(/(志愿|公益|社区)/.test(text)) out.push('沟通亲和力与耐心')
  if(/(企业|品牌|工作室)/.test(orgType)) out.push('执行落地能力、配合度')
  out.push('合作意识：<b>能按对方节奏交付</b>，比个人表达更被看重')
  return out
}
function guessMyAngle(p, orgType){
  const out = []
  const c = p.chains||[]
  if(c.includes('culture')) out.push('你已有<b>文化服务</b>方向的积累，这是多数人没有的，直接讲你服务过谁、多少人参与')
  if(c.includes('world')) out.push('强调你的<b>视野</b>：看过什么、去过哪里，能给项目带来别人没有的参照')
  if(c.includes('people')) out.push('强调你<b>协作过</b>：说清团队里你负责哪一段，怎么推进别人')
  if(c.includes('temper')) out.push('强调你的<b>持续性</b>：长期在做的一件事，能证明你会把它做完')
  out.push('把你的「为什么想去」具体化：<b>不是"我很喜欢艺术"，而是"我在 XX 做过 XX，这次我能贡献 XX"</b>')
  out.push('主动提一件对方没写但需要的事（拍摄、物料、场务、记录），把自己从"报名者"变成"合作者"')
  return out
}
function guessRisks(p, text){
  const out = []
  const src = text || [p.title,p.org,p.content,(p.requirements||[]).join(' ')].join(' ')
  if(/(押金|保证金|报名费.*不退|材料费|培训费)/.test(src)) out.push('出现押金/不退费类表述，<b>先确认退款条款</b>')
  if(/(免费|无费用)/.test(src) && /(押金|保证金)/.test(src)) out.push('同时写"免费"和要钱，<b>自相矛盾</b>，先问清')
  if(/(作品集|设计稿|方案)/.test(src) && !/(署名|版权|使用权|归还)/.test(src)) out.push('要材料但没写<b>版权与署名</b>，建议邮件里主动问一句')
  if(/(包吃住|住宿|交通补贴|津贴|报酬)/.test(src) && !/\d/.test(src)) out.push('提到补贴但<b>没有具体金额</b>，别默认真的有')
  if(/(长期|长期招募|长期合作)/.test(src)) out.push('「长期」在艺术机构里常意味着<b>无偿</b>，问清楚是否有工作证明/实习证明')
  if(/(面试|答辩|presentation)/i.test(src)) out.push('有<b>面试环节</b>，建议提前准备 60 秒自我介绍')
  if(/(仅限本校|本校学生|本校生)/.test(src)) out.push('限定本校，你作为川美学生通常符合，但注意是否有年级限制')
  if(/(国家|统一|行政)/.test(src) && !/(志愿|实习)/.test(src)) out.push('涉及"统一"安排的，可能<b>占用大量时间</b>，先估算投入产出')
  return out
}
function talkTracks(orgType, p){
  const L = []
  L.push('【开场：先给对方一个理由看你】')
  L.push('"我是四川美术学院'+(p.major||'的学生')+'，看到贵方这次活动。我之前在「'+((p.chains||[]).length?'文化服务/见识世界':'相关方向')+'」有积累，'+
    (p.why?('也是因为'+p.why.slice(0,40)+'，'):'')+'所以特别想参与。"\n')
  L.push('【中段：把你的价值说成对方能用的东西】')
  L.push('"我不只是来学的。我可以负责 XX（拍摄/记录/视觉物料/现场执行/翻译），'+
    '你们缺的往往不是想法，是能把想法落地的人。"\n')
  L.push('【结尾：给对方一个低门槛的推进】')
  if(/面试|答辩/i.test((p.content||'')+p.title)) L.push('"如果需要面试，我随时可以，另外我附了一份 60 秒自我介绍。"\n')
  else if(/作品集/.test((p.requirements||[]).join(''))) L.push('"作品集我今天就能发，需要我先发一版给您看吗？"\n')
  else L.push('"我这边材料齐全了，您看还需要补什么？我这边随时可以配合时间。"\n')
  L.push('【禁忌】')
  L.push('· 不要在第一封邮件里谈钱（除非对方明确问）\n· 不要说"我很感兴趣"却不说能贡献什么\n· 不要长篇大论讲自己，控制在 200 字以内\n· 如果对方 3 天没回，再跟进一次，一次就够')
  return L.join('\n')
}

/* ============================================================
   24. 待办编辑
   ============================================================ */
function openTodoEdit(id){
  const t = id ? DB.todos.find(x=>x._id===id) : {
    _id:uid(), title:'', done:false, progress:0, priority:'mid',
    due:'', projectId:'', repeat:'', note:'', createdAt:Date.now(), doneAt:0, order:Date.now()
  }
  const isNew = !id
  const b = openModal(isNew?'新建待办':'编辑待办',
    '<div class="fld"><label class="lbl">做什么 *</label><input class="inp" id="tTitle" value="'+esc(t.title)+'" placeholder="动词开头，越具体越好"></div>'+
    '<div class="grid2">'+
      '<div class="fld"><label class="lbl">截止日期</label><input class="inp" id="tDue" type="date" value="'+esc(t.due)+'"></div>'+
      '<div class="fld"><label class="lbl">优先级</label><select class="inp" id="tPri">'+
        [['high','高'],['mid','中'],['low','低']].map(([k,n])=>'<option value="'+k+'"'+(t.priority===k?' selected':'')+'>'+n+'</option>').join('')+
      '</select></div>'+
    '</div>'+
    '<div class="grid2">'+
      '<div class="fld"><label class="lbl">关联活动</label><select class="inp" id="tProj"><option value="">（不关联）</option>'+
        DB.projects.map(p=>'<option value="'+p._id+'"'+(t.projectId===p._id?' selected':'')+'>'+esc(p.title.slice(0,22))+'</option>').join('')+
      '</select></div>'+
      '<div class="fld"><label class="lbl">重复</label><select class="inp" id="tRep">'+
        [['','不重复'],['1d','每天'],['3d','每 3 天'],['1w','每周'],['2w','每 2 周'],['1m','每月']].map(([k,n])=>
          '<option value="'+k+'"'+(t.repeat===k?' selected':'')+'>'+n+'</option>').join('')+
      '</select></div>'+
    '</div>'+
    '<div class="fld"><label class="lbl">备注</label><textarea class="inp" id="tNote" rows="3">'+esc(t.note||'')+'</textarea></div>'+
    '<div class="fld"><label class="lbl">进度</label><div style="display:flex;align-items:center;gap:10px">'+
      '<input type="range" id="tProg" min="0" max="100" step="10" value="'+(t.progress||0)+'" style="flex:1">'+
      '<span class="mono" id="tProgV">'+(t.progress||0)+'%</span></div></div>',
    '<button class="btn" data-close>取消</button>'+
    (isNew?'':'<button class="btn danger" id="btnDelT">删除</button>')+
    '<button class="btn primary" id="btnSaveT">保存</button>')
  $('#tProg').oninput = e=>{ $('#tProgV').textContent = e.target.value+'%' }
  $('#btnSaveT').onclick = ()=>{
    const title = $('#tTitle').value.trim()
    if(!title){ toast('写一句要做什么'); return }
    t.title = title
    t.due = $('#tDue').value
    t.priority = $('#tPri').value
    t.projectId = $('#tProj').value
    t.repeat = $('#tRep').value
    t.note = $('#tNote').value
    t.progress = +$('#tProg').value
    if(!isNew){ const i=DB.todos.findIndex(x=>x._id===id); if(i>=0) DB.todos[i]=t }
    else DB.todos.unshift(t)
    save(); closeModal(); render(); toast(isNew?'已新建':'已保存')
  }
  if(!isNew) $('#btnDelT').onclick = ()=>{ todoDel(id); closeModal() }
}
function todoDel(id){
  DB.todos = DB.todos.filter(x=>x._id!==id)
  save(); render(); toast('已删除')
}

/* ============================================================
   25. 复盘编辑
   ============================================================ */
function openReview(id){
  const r = id ? DB.reviews.find(x=>x._id===id) : {
    _id:uid(), title:'复盘 '+todayISO(), date:todayISO(),
    goal:'', result:'', loved:'', loathed:'', longed:'', learned:'', insight:'', createdAt:Date.now()
  }
  const isNew = !id
  openModal(isNew?'写复盘':'打开复盘',
    '<div class="fld"><label class="lbl">标题</label><input class="inp" id="rvTitle" value="'+esc(r.title)+'"></div>'+
    '<div class="fld"><label class="lbl">日期</label><input class="inp" id="rvDate" type="date" value="'+esc(r.date)+'"></div>'+
    RV_TPL.map(t=>'<div class="rv-fld" style="margin-bottom:10px"><div class="lbl">'+t.h+'</div>'+
      '<textarea class="inp" id="rv_'+t.k+'" rows="3" placeholder="'+esc(t.ph)+'">'+esc(r[t.k]||'')+'</textarea></div>').join(''),
    '<button class="btn" data-close>取消</button>'+
    (isNew?'':'<button class="btn danger" id="btnDelR">删除</button>')+
    '<button class="btn primary" id="btnSaveR">保存</button>')
  $('#btnSaveR').onclick = ()=>{
    r.title = $('#rvTitle').value.trim() || ('复盘 '+r.date)
    r.date = $('#rvDate').value
    RV_TPL.forEach(t=>{ r[t.k] = $('#rv_'+t.k).value })
    if(!isNew){ const i=DB.reviews.findIndex(x=>x._id===id); if(i>=0) DB.reviews[i]=r }
    else DB.reviews.unshift(r)
    save(); closeModal(); render(); toast('已保存')
  }
  if(!isNew) $('#btnDelR').onclick = ()=>{ reviewDel(id); closeModal() }
}
function reviewDel(id){
  DB.reviews = DB.reviews.filter(x=>x._id!==id)
  save(); render(); toast('已删除')
}

/* ============================================================
   26. 每周推荐：加入 / 忽略
   ============================================================ */
function pickAdd(id){
  const p = DB.picks.find(x=>x._id===id)
  if(!p) return
  const proj = {
    _id:uid(), title:p.title, org:p.source||'', start:p.start||'', end:'', startTime:'', endTime:'',
    place:p.place||'', isOnline:/线上|online/i.test(p.place||''), deadline:p.deadline||'',
    fee:'', content:p.content||p.why||'', why:p.why||'', requirements:[],
    contacts:{email:'',wechat:'',phone:'',form:p.url||''},
    chains:p.chains||inferChains(p.title+' '+p.why), cats:[], missing:[], status:'candidate',
    url:p.url||'', source:'每周推荐', createdAt:Date.now()
  }
  proj.cats = inferCats(proj)
  DB.projects.unshift(proj)
  p.status = 'added'
  p.addedId = proj._id
  save(); render(); toast('已加入活动库')
}
function pickIgnore(id){
  const p = DB.picks.find(x=>x._id===id)
  if(p){ p.status='ignored'; save(); render(); toast('已忽略') }
}

/* ============================================================
   27. 笔记相关
   ============================================================ */
function noteDel(id){
  DB.notes = DB.notes.filter(x=>x._id!==id)
  save(); render(); toast('已删除')
}
function note2todo(id){
  const n = DB.notes.find(x=>x._id===id)
  if(!n) return
  const t = addTodo({title:(n.transcript||'语音笔记').split(/[。！？\n]/)[0].slice(0,40), note:'来自语音笔记', due:todayISO(), priority:'mid'})
  save(); view='todo'; render(); toast('已转成待办：'+t.title)
}
function note2project(id){
  const n = DB.notes.find(x=>x._id===id)
  if(!n) return
  const p = parseLink(n.transcript||'')
  p.title = (n.transcript||'未命名活动').split(/[。！？\n]/)[0].slice(0,40)
  p.content = n.transcript
  p._id = uid(); p.status='candidate'; p.cats=inferCats(p); p.createdAt=Date.now()
  p.source='语音笔记'
  DB.projects.unshift(p)
  save(); view='lib'; render(); toast('已转成活动，请补全细节')
}

/* ============================================================
   28. 语音识别
   ============================================================ */
let rec = null, recording = false, recStart = 0, recTimer = null, recText = '', recFinal = ''
function supportsASR(){
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}
function toggleRec(){
  if(recording){ stopRec(); return }
  if(!supportsASR()){
    toast('当前浏览器不支持语音识别；可以改用文字笔记')
    const t = prompt('记一句：')
    if(t){ addNote(t, 0); render(); }
    return
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  rec = new SR()
  rec.lang = 'zh-CN'
  rec.continuous = true
  rec.interimResults = true
  recFinal = ''
  rec.onresult = e=>{
    let interim = ''
    for(let i=e.resultIndex;i<e.results.length;i++){
      const r = e.results[i]
      if(r.isFinal) recFinal += r[0].transcript
      else interim += r[0].transcript
    }
    const el = $('#recHint')
    if(el) el.textContent = (recFinal+interim) || '…'
  }
  rec.onerror = e=>{
    if(e.error === 'no-speech') return
    toast('语音识别出错：'+e.error)
  }
  rec.onend = ()=>{
    // Chrome 约 60 秒会自动断开，若仍在录音态则续接
    if(recording){ try{ rec.start() }catch(err){} }
  }
  try{
    rec.start()
    recording = true
    recStart = Date.now()
    recText = ''
    recTimer = setInterval(()=>{
      const el = $('#recTime')
      if(el) el.textContent = fmtDur(Date.now()-recStart)
      drawWave()
    }, 120)
    render()
    toast('开始录音，说完点停止')
  }catch(e){ toast('无法启动录音：'+e.message) }
}
function stopRec(){
  recording = false
  clearInterval(recTimer)
  try{ rec && rec.stop() }catch(e){}
  const dur = Date.now()-recStart
  addNote(recFinal.trim(), dur)
  recFinal = ''
  render()
  toast('已保存笔记')
}
function addNote(text, dur){
  DB.notes.unshift({_id:uid(), transcript:text||'', createdAt:Date.now(), duration:dur||0, source:'语音'})
  save()
}
function drawWave(){
  const el = $('#wave')
  if(!el) return
  const bars = $$('#wave i')
  bars.forEach((b,i)=>{
    const h = 5 + Math.abs(Math.sin(Date.now()/180 + i))*18
    b.style.height = h.toFixed(0)+'px'
  })
}

/* ============================================================
   29. 备份 / 导入 / 导出
   ============================================================ */
function openBackup(){
  openModal('数据备份',
    '<div class="sub" style="margin-bottom:14px">全部数据只存在这台设备的浏览器里（localStorage）。'+
    '换设备、清缓存前先导出。导出的 JSON 可以再导回来。</div>'+
    '<div class="fld"><div class="lbl">当前数据量</div>'+
      '<div class="tiny">活动 '+DB.projects.length+' · 待办 '+DB.todos.length+' · 复盘 '+DB.reviews.length+' · 笔记 '+DB.notes.length+'</div></div>'+
    '<div class="fld"><label class="lbl">导出为 JSON 文件</label>'+
      '<button class="btn block" id="btnExport">下载备份文件</button></div>'+
    '<div class="fld"><label class="lbl">从文件恢复</label>'+
      '<input type="file" id="fileIn" accept="application/json,.json" class="inp"></div>'+
    '<div class="fld"><label class="lbl">或者：复制到剪贴板</label>'+
      '<button class="btn block" id="btnCopyAll">复制全部数据</button></div>',
    '<button class="btn" data-close>关闭</button>')
  $('#btnExport').onclick = ()=>{
    const blob = new Blob([JSON.stringify(DB,null,2)], {type:'application/json'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'lifeos-backup-'+todayISO()+'.json'
    a.click()
    setTimeout(()=>URL.revokeObjectURL(a.href), 3000)
    toast('已下载')
  }
  $('#btnCopyAll').onclick = ()=>copyText(JSON.stringify(DB))
  $('#fileIn').onchange = e=>{
    const f = e.target.files[0]
    if(!f) return
    const r = new FileReader()
    r.onload = ()=>{
      try{
        const d = JSON.parse(r.result)
        if(!confirm('导入将覆盖当前数据，确定？')) return
        DB = Object.assign(deepClone(DEFAULT_DB), d)
        saveNow(); closeModal(); render(); toast('已恢复')
      }catch(err){ toast('文件解析失败：'+err.message) }
    }
    r.readAsText(f)
  }
}

/* ============================================================
   30. 主题
   ============================================================ */
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme')
  const next = cur === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  DB.meta.theme = next
  save()
  const t = $('#themeTxt')
  if(t) t.textContent = next === 'dark' ? '亮色' : '暗色'
  const meta = document.querySelector('meta[name="theme-color"]')
  if(meta) meta.setAttribute('content', next==='dark' ? '#141312' : '#F4F1EC')
}
