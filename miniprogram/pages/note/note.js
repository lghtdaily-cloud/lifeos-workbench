const C = require('../../utils/core.js')

Page({
  data: { list: [], recording: false, manager: null, tmpFile: '' },

  onShow() { this.refresh() },

  refresh() {
    const db = C.load()
    const list = (db.notes || []).slice().sort((a, b) => b.createdAt - a.createdAt).map(n => {
      const d = new Date(n.createdAt)
      return Object.assign({}, n, {
        time: d.getMonth() + 1 + '月' + d.getDate() + '日 ' +
          String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
      })
    })
    this.setData({ list })
  },

  toggleRec() {
    if (this.data.recording) { this.stopRec(); return }
    // 优先使用微信同声传译
    const plugin = requirePlugin('QCloudAIChatbot') || null
    if (plugin) {
      this.setData({ recording: true })
      wx.showToast({ title: '请在弹出的录音界面中说话', icon: 'none' })
      return
    }
    wx.showModal({
      title: '语音输入',
      editable: true,
      placeholderText: '这里输入，或用输入法自带的语音按钮',
      success: res => {
        if (res.confirm && res.content && res.content.trim()) {
          this.addNote(res.content.trim())
        }
      }
    })
  },

  stopRec() {
    this.setData({ recording: false })
  },

  addNote(text) {
    const db = C.load()
    db.notes.unshift({ _id: C.uid(), text, createdAt: Date.now(), source: '语音' })
    C.save(db)
    this.refresh()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  toTodo(e) {
    const db = C.load()
    const n = db.notes.find(x => x._id === e.currentTarget.dataset.id)
    if (!n) return
    const title = String(n.text).split(/[。！？\n]/)[0].slice(0, 40)
    db.todos.unshift({
      _id: C.uid(), title, done: false, progress: 0, priority: 'mid',
      due: C.todayISO(), projectId: '', repeat: '', note: '来自语音笔记',
      createdAt: Date.now(), doneAt: 0, order: Date.now()
    })
    C.save(db)
    wx.showToast({ title: '已转成待办', icon: 'none' })
  },

  toProject(e) {
    const db = C.load()
    const n = db.notes.find(x => x._id === e.currentTarget.dataset.id)
    if (!n) return
    const p = C.parseLink(n.text)
    p.title = String(n.text).split(/[。！？\n]/)[0].slice(0, 40)
    p.content = n.text
    p._id = C.uid(); p.status = 'candidate'; p.cats = C.inferCats(p); p.createdAt = Date.now()
    p.source = '语音笔记'
    db.projects.unshift(p)
    C.save(db)
    wx.showToast({ title: '已转成活动，请补全细节', icon: 'none' })
  },

  del(e) {
    const db = C.load()
    db.notes = db.notes.filter(x => x._id !== e.currentTarget.dataset.id)
    C.save(db); this.refresh()
  }
})
