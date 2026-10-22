const C = require('../../utils/core.js')
const CAT_MAP = { academic: '学术类', practice: '实践类', scfai: '川美', chongqing: '重庆' }

Page({
  data: { p: null, todos: [], conflictMsg: '', hasContact: false, missingText: '' },

  onLoad(q) { this.id = q.id; this.refresh() },
  onShow() { this.refresh() },

  refresh() {
    const db = C.load()
    const p = (db.projects || []).find(x => x._id === this.id)
    if (!p) { wx.navigateBack(); return }
    const cm = C.conflictMap(db.projects)
    const cf = cm[p._id] || []
    const st = C.PSTATUS[p.status] || C.PSTATUS.candidate
    const r = C.relDeadline(p.deadline)

    this.setData({
      p: Object.assign({}, p, {
        stText: st.n, stCls: st.c,
        chainNames: (p.chains || []).map(k => { const c = C.CHAINS.find(x => x.k === k); return c ? c.n : '' }).filter(Boolean),
        catNames: (p.cats || []).map(c => CAT_MAP[c] || c),
        timeText: p.start ? (C.fmtDateFull(p.start) + (p.startTime ? ' ' + p.startTime : '') + (p.end ? ' → ' + C.fmtDateFull(p.end) + (p.endTime ? ' ' + p.endTime : '') : '')) : '未确认',
        ddlText: p.deadline ? (C.fmtDateFull(p.deadline) + ' ' + r.txt) : '未确认',
        missingText: (p.missing || []).join('、')
      }),
      todos: (db.todos || []).filter(t => t.projectId === p._id),
      conflictMsg: cf.length ? cf[0].msg : '',
      hasContact: !!(p.contacts && (p.contacts.email || p.contacts.wechat || p.contacts.phone || p.contacts.form)),
      missingText: (p.missing || []).join('、')
    })
  },

  toggleTodo(e) {
    const db = C.toggleTodo(C.load(), e.currentTarget.dataset.id)
    C.save(db); this.refresh()
  },

  genTodos() {
    const db = C.load()
    const r = C.proj2todo(db, this.id)
    C.save(r.db)
    wx.showToast({ title: '已生成 ' + r.count + ' 条待办', icon: 'none' })
    this.refresh()
  },

  cycleStatus() {
    const db = C.load()
    const p = db.projects.find(x => x._id === this.id)
    const order = ['candidate', 'signed', 'done', 'dropped']
    p.status = order[(order.indexOf(p.status) + 1) % order.length]
    if (p.status === 'done') p.doneAt = Date.now()
    C.save(db); this.refresh()
    wx.showToast({ title: '状态：' + (C.PSTATUS[p.status] || {}).n, icon: 'none' })
  },

  copyLink() {
    // 小程序无法直接内开第三方外链（web-view 仅认已配置的业务域名白名单），
    // 故采用「一键复制原链接 + 复制后微信/系统自动弹出打开气泡」这一最顺手的做法。
    const p = this.data.p
    if (!p || !p.url) { wx.showToast({ title: '这条没有原文链接', icon: 'none' }); return }
    wx.setClipboardData({ data: p.url, success: () => wx.showToast({ title: '已复制原链接，去微信/浏览器打开', icon: 'none' }) })
  },

  goMail() { wx.navigateTo({ url: '/pages/mail/mail?id=' + this.id }) },
  goInsight() { wx.navigateTo({ url: '/pages/insight/insight?id=' + this.id }) }
})
