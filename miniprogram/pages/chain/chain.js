const C = require('../../utils/core.js')

Page({
  data: { chains: [] },

  onShow() { this.refresh() },

  refresh() {
    const db = C.load()
    const chains = C.CHAINS.map(c => {
      const p = C.chainProgress(db, c.k)
      const ps = db.projects.filter(x => (x.chains || []).indexOf(c.k) >= 0).slice(0, 6)
      return Object.assign({ k: c.k, n: c.n, c: c.c, d: c.d }, p, {
        projects: ps.map(x => ({ id: x._id, t: String(x.title).slice(0, 12) }))
      })
    })
    this.setData({ chains })
  },

  saveGoal(e) {
    const k = e.currentTarget.dataset.k
    const v = e.detail.value
    const db = C.load()
    db.chains = db.chains || {}
    db.chains[k] = Object.assign({ goal: '', notes: [] }, db.chains[k], { goal: v })
    C.save(db)
    wx.showToast({ title: '已保存', icon: 'none' })
    this.refresh()
  },

  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id }) }
})
