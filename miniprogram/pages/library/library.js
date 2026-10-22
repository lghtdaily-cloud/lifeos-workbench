const C = require('../../utils/core.js')

const CAT_MAP = {
  academic: '学术类', practice: '实践类', scfai: '川美', chongqing: '重庆'
}

Page({
  data: { list: [], total: 0, cats: [], filter: 'all', kw: '' },

  onShow() { this.refresh() },

  refresh() {
    const db = C.load()
    const cm = C.conflictMap(db.projects)
    const list = db.projects.filter(p => p.status !== 'dropped')
      .filter(p => this.matchFilter(p))
      .filter(p => {
        if (!this.data.kw.trim()) return true
        const t = [p.title, p.org, p.why, p.content, p.place, (p.requirements || []).join(' ')].join(' ').toLowerCase()
        return t.indexOf(this.data.kw.trim().toLowerCase()) >= 0
      })
      .sort((a, b) => {
        const sa = a.status === 'signed' ? 0 : a.status === 'candidate' ? 1 : 2
        const sb = b.status === 'signed' ? 0 : b.status === 'candidate' ? 1 : 2
        if (sa !== sb) return sa - sb
        return (a.start || '9999') < (b.start || '9999') ? -1 : 1
      })
      .map(p => {
        const st = C.PSTATUS[p.status] || C.PSTATUS.candidate
        const r = C.relDeadline(p.deadline)
        return Object.assign({}, p, {
          stText: st.n, stCls: st.c,
          cats: (p.cats || []).map(c => CAT_MAP[c] || c),
          ddlText: r.txt,
          dateText: p.start ? (C.fmtDate(p.start) + (p.startTime ? ' ' + p.startTime : '')) : '时间未定',
          conflictMsg: cm[p._id] && cm[p._id].length ? cm[p._id][0].msg : ''
        })
      })

    const all = db.projects.filter(p => p.status !== 'dropped')
    const cats = [
      { k: 'all', n: '全部', c: all.length },
      { k: 'candidate', n: '候选', c: all.filter(p => p.status === 'candidate').length },
      { k: 'signed', n: '已报名', c: all.filter(p => p.status === 'signed').length },
      { k: 'done', n: '已完成', c: all.filter(p => p.status === 'done').length },
      { k: 'academic', n: '学术类', c: all.filter(p => (p.cats || []).indexOf('academic') >= 0).length },
      { k: 'practice', n: '实践类', c: all.filter(p => (p.cats || []).indexOf('practice') >= 0).length },
      { k: 'scfai', n: '川美', c: all.filter(p => (p.cats || []).indexOf('scfai') >= 0).length },
      { k: 'chongqing', n: '重庆', c: all.filter(p => (p.cats || []).indexOf('chongqing') >= 0).length },
      { k: 'culture', n: '文化服务', c: all.filter(p => (p.chains || []).indexOf('culture') >= 0).length },
      { k: 'world', n: '见识世界', c: all.filter(p => (p.chains || []).indexOf('world') >= 0).length },
      { k: 'people', n: '人际合作', c: all.filter(p => (p.chains || []).indexOf('people') >= 0).length },
      { k: 'temper', n: '性情修养', c: all.filter(p => (p.chains || []).indexOf('temper') >= 0).length }
    ]

    this.setData({ list, total: db.projects.length, cats })
  },

  matchFilter(p) {
    const f = this.data.filter
    if (f === 'all') return true
    if (['candidate', 'signed', 'done'].indexOf(f) >= 0) return p.status === f
    if (['academic', 'practice', 'scfai', 'chongqing'].indexOf(f) >= 0) return (p.cats || []).indexOf(f) >= 0
    if (['culture', 'world', 'people', 'temper'].indexOf(f) >= 0) return (p.chains || []).indexOf(f) >= 0
    return true
  },

  setFilter(e) { this.setData({ filter: e.currentTarget.dataset.k }, () => this.refresh()) },
  onKw(e) { this.setData({ kw: e.detail.value }, () => this.refresh()) },
  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id }) },
  goMail(e) { wx.navigateTo({ url: '/pages/mail/mail?id=' + e.currentTarget.dataset.id }) },
  goInsight(e) { wx.navigateTo({ url: '/pages/insight/insight?id=' + e.currentTarget.dataset.id }) },
  goImport() { wx.navigateTo({ url: '/pages/import/import' }) }
})
