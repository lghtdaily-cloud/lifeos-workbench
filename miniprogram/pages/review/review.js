const C = require('../../utils/core.js')

const FIELDS = [
  { k: 'goal', h: '本周目标', ph: '≤3 条，必须能判断完成与否' },
  { k: 'result', h: '实际结果', ph: '只写事实，不写评价' },
  { k: 'loved', h: 'Loved · 有能量的瞬间', ph: '哪个瞬间让你觉得"这就对了"？' },
  { k: 'loathed', h: 'Loathed · 被消耗的', ph: '什么在持续抽走你的能量？' },
  { k: 'longed', h: 'Longed for · 缺的', ph: '缺什么会让这周顺很多？' },
  { k: 'learned', h: 'Learned · 学到的', ph: '具体到一个能复用的做法' },
  { k: 'insight', h: '洞察', ph: '一句话，写给下周的自己' }
]

Page({
  data: { list: [], editing: null, fields: FIELDS },

  onShow() { this.refresh() },

  refresh() {
    const db = C.load()
    const list = (db.reviews || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(r => ({
      _id: r._id, title: r.title, date: r.date,
      preview: (r.insight || r.goal || r.result || '').slice(0, 80)
    }))
    this.setData({ list })
  },

  create() {
    this.setData({
      editing: { _id: '', title: '复盘 ' + C.todayISO(), date: C.todayISO(), goal: '', result: '', loved: '', loathed: '', longed: '', learned: '', insight: '' },
      list: this.data.list
    })
  },

  open(e) {
    const db = C.load()
    const r = (db.reviews || []).find(x => x._id === e.currentTarget.dataset.id)
    if (r) this.setData({ editing: Object.assign({}, r) })
  },

  onField(e) {
    const f = e.currentTarget.dataset.f
    const editing = Object.assign({}, this.data.editing)
    editing[f] = e.detail.value
    this.setData({ editing })
  },
  onDate(e) {
    const editing = Object.assign({}, this.data.editing)
    editing.date = e.detail.value
    this.setData({ editing })
  },
  cancelEdit() { this.setData({ editing: null }) },

  saveEdit() {
    const db = C.load()
    const r = this.data.editing
    if (!r.title.trim()) { wx.showToast({ title: '标题不能为空', icon: 'none' }); return }
    if (r._id) {
      const i = db.reviews.findIndex(x => x._id === r._id)
      if (i >= 0) db.reviews[i] = r
    } else {
      r._id = C.uid(); r.createdAt = Date.now()
      db.reviews.unshift(r)
    }
    C.save(db)
    this.setData({ editing: null })
    this.refresh()
    wx.showToast({ title: '已保存', icon: 'success' })
  }
})
