const C = require('../../utils/core.js')

Page({
  data: { list: [], pending: 0, filter: 'pending' },

  onShow() { this.refresh() },

  refresh() {
    const db = C.load()
    const list = (db.picks || []).filter(p => p.status === this.data.filter)
    this.setData({
      list,
      pending: (db.picks || []).filter(p => p.status === 'pending').length
    })
  },

  setFilter(e) { this.setData({ filter: e.currentTarget.dataset.k }, () => this.refresh()) },

  add(e) {
    const db = C.load()
    const p = db.picks.find(x => x._id === e.currentTarget.dataset.id)
    if (!p) return
    const proj = {
      _id: C.uid(), title: p.title, org: p.source || '',
      start: p.start || '', end: '', startTime: '', endTime: '',
      place: p.place || '', isOnline: false, deadline: p.deadline || '',
      fee: '', content: p.why || '', why: p.why || '', requirements: [],
      contacts: { email: '', wechat: '', phone: '', form: p.url || '' },
      chains: p.chains || C.inferChains(p.title + ' ' + (p.why || '')),
      cats: [], missing: [], status: 'candidate',
      url: p.url || '', source: '每周推荐', createdAt: Date.now()
    }
    proj.cats = C.inferCats(proj)
    db.projects.unshift(proj)
    p.status = 'added'
    p.addedId = proj._id
    C.save(db); this.refresh()
    wx.showToast({ title: '已加入活动库', icon: 'success' })
  },

  ignore(e) {
    const db = C.load()
    const p = db.picks.find(x => x._id === e.currentTarget.dataset.id)
    if (p) { p.status = 'ignored'; C.save(db); this.refresh() }
  },

  openUrl(e) {
    const db = C.load()
    const p = db.picks.find(x => x._id === e.currentTarget.dataset.id)
    if (!p || !p.url) { wx.showToast({ title: '没有原文链接', icon: 'none' }); return }
    wx.setClipboardData({ data: p.url, success: () => wx.showToast({ title: '链接已复制，去微信打开', icon: 'none' }) })
  }
})
