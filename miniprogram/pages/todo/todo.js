const C = require('../../utils/core.js')

Page({
  data: { list: [], tabs: [], tab: 'open', openCount: 0 },

  onShow() { this.refresh() },

  refresh() {
    const db = C.load()
    const td = C.todayISO()
    const open = db.todos.filter(t => !t.done)
    const tabs = [
      { k: 'open', n: '未完成', c: open.length },
      { k: 'today', n: '今天', c: open.filter(t => t.due === td).length },
      { k: 'over', n: '已逾期', c: open.filter(t => t.due && t.due < td).length },
      { k: 'done', n: '已完成', c: db.todos.filter(t => t.done).length }
    ]
    let list = db.todos.slice()
    if (this.data.tab === 'open') list = list.filter(t => !t.done)
    else if (this.data.tab === 'today') list = list.filter(t => !t.done && t.due === td)
    else if (this.data.tab === 'over') list = list.filter(t => !t.done && t.due && t.due < td)
    else list = list.filter(t => t.done)
    list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1
      if (!a.due && b.due) return 1
      if (a.due && !b.due) return -1
      return (b.order || 0) - (a.order || 0)
    })
    const list2 = list.map(t => {
      const p = db.projects.find(x => x._id === t.projectId)
      return Object.assign({}, t, {
        od: !t.done && t.due && t.due < td,
        dueText: t.due ? (C.daysLeft(t.due) < 0 ? '逾期 ' + C.fmtDate(t.due) : C.fmtDate(t.due)) : '',
        projectTitle: p ? String(p.title).slice(0, 12) : ''
      })
    })
    this.setData({ list: list2, tabs, openCount: open.length })
  },

  setTab(e) { this.setData({ tab: e.currentTarget.dataset.k }, () => this.refresh()) },

  toggle(e) {
    const db = C.toggleTodo(C.load(), e.currentTarget.dataset.id)
    C.save(db); this.refresh()
  },

  del(e) {
    const id = e.currentTarget.dataset.id
    const db = C.load()
    db.todos = db.todos.filter(x => x._id !== id)
    C.save(db); this.refresh()
    wx.showToast({ title: '已删除', icon: 'none' })
  },

  create() {
    const db = C.load()
    const t = {
      _id: C.uid(), title: '', done: false, progress: 0, priority: 'mid',
      due: C.todayISO(), projectId: '', repeat: '', note: '',
      createdAt: Date.now(), doneAt: 0, order: Date.now()
    }
    db.todos.unshift(t)
    C.save(db); this.refresh()
    wx.showModal({
      title: '新建待办',
      editable: true,
      placeholderText: '动词开头，越具体越好',
      success: res => {
        if (res.confirm && res.content) {
          const db2 = C.load()
          const it = db2.todos.find(x => x._id === t._id)
          if (it) { it.title = res.content.trim(); C.save(db2); this.refresh() }
        } else {
          const db2 = C.load()
          db2.todos = db2.todos.filter(x => x._id !== t._id)
          C.save(db2); this.refresh()
        }
      }
    })
  },

  edit(e) {
    const id = e.currentTarget.dataset.id
    const db = C.load()
    const t = db.todos.find(x => x._id === id)
    if (!t) return
    wx.showModal({
      title: '编辑待办',
      editable: true,
      content: t.title,
      success: res => {
        if (res.confirm && res.content) {
          t.title = res.content.trim(); C.save(db); this.refresh()
        }
      }
    })
  }
})
