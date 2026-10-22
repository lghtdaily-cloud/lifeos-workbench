const C = require('../../utils/core.js')

Page({
  data: { p: null, to: '', who: '', phone: '', grade: '', major: '', body: '' },

  onLoad(q) { this.id = q.id; this.refresh() },

  refresh() {
    const db = C.load()
    const p = (db.projects || []).find(x => x._id === this.id)
    if (!p) { wx.navigateBack(); return }
    const fill = Object.assign({}, p, { who: p.who || '', phone: p.phone || '', grade: p.grade || '', major: p.major || '' })
    this.setData({
      p: fill,
      to: (p.contacts && p.contacts.email) || '',
      who: fill.who, phone: fill.phone, grade: fill.grade, major: fill.major,
      body: C.mailTemplate(fill)
    })
  },

  onTo(e) { this.setData({ to: e.detail.value }) },
  onWho(e) { this.setData({ who: e.detail.value }) },
  onPhone(e) { this.setData({ phone: e.detail.value }) },
  onGrade(e) { this.setData({ grade: e.detail.value }) },
  onMajor(e) { this.setData({ major: e.detail.value }) },

  copyBody() {
    const db = C.load()
    const p = db.projects.find(x => x._id === this.id)
    if (p) {
      p.who = this.data.who; p.phone = this.data.phone
      p.grade = this.data.grade; p.major = this.data.major
      C.save(db)
    }
    wx.setClipboardData({ data: this.data.body, success: () => wx.showToast({ title: '正文已复制', icon: 'success' }) })
  }
})
