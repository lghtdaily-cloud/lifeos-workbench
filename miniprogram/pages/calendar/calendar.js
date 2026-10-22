const C = require('../../utils/core.js')

Page({
  data: {
    title: '', cells: [], dows: ['日','一','二','三','四','五','六'],
    dayList: [], dayTitle: ''
  },

  onShow() { this.refresh() },

  refresh() {
    const db = C.load()
    const cm = C.conflictMap(db.projects)
    const y = this.data.y || new Date().getFullYear()
    const m = this.data.m === undefined ? new Date().getMonth() : this.data.m
    const first = new Date(y, m, 1)
    const lead = first.getDay()
    const days = new Date(y, m + 1, 0).getDate()
    const prevDays = new Date(y, m, 0).getDate()
    const today = C.todayISO()

    const cells = []
    for (let i = 0; i < 42; i++) {
      let d, dim = false
      if (i < lead) { d = new Date(y, m - 1, prevDays - lead + 1 + i); dim = true }
      else if (i >= lead + days) { d = new Date(y, m + 1, i - lead - days + 1); dim = true }
      else d = new Date(y, m, i - lead + 1)
      const ds = C.iso(d)
      const evs = db.projects.filter(p => p.start === ds && p.status !== 'dropped').map(p => {
        let cls = ''
        if ((cm[p._id] || []).length) cls = 'conflict'
        else if (p.status === 'done') cls = 'done'
        return { id: p._id, cls, text: (p.startTime ? p.startTime + ' ' : '') + String(p.title).slice(0, 8) }
      })
      cells.push({
        date: ds, dn: d.getDate(), dim, today: ds === today, evs,
        todoN: db.todos.filter(t => t.due === ds && !t.done).length
      })
    }

    const sel = this.data.sel || today
    const dayList = db.projects.filter(p => p.start === sel && p.status !== 'dropped')
      .sort((a, b) => (a.startTime || '') < (b.startTime || '') ? -1 : 1)
      .map(p => Object.assign({}, p, { timeText: p.startTime || '全天' }))

    this.setData({
      y, m, sel,
      title: y + '年' + (m + 1) + '月',
      cells,
      dayList,
      dayTitle: sel === today ? '今天' : sel
    })
  },

  prev() {
    const m = this.data.m - 1
    const y = m < 0 ? this.data.y - 1 : this.data.y
    this.setData({ m: m < 0 ? 11 : m, y }, () => this.refresh())
  },
  next() {
    const m = this.data.m + 1
    const y = m > 11 ? this.data.y + 1 : this.data.y
    this.setData({ m: m > 11 ? 0 : m, y }, () => this.refresh())
  },
  goToday() {
    const d = new Date()
    this.setData({ y: d.getFullYear(), m: d.getMonth(), sel: C.todayISO() }, () => this.refresh())
  },
  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id }) }
})
