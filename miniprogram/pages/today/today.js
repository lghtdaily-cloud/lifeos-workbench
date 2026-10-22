const C = require('../../utils/core.js')

Page({
  data: {
    dateStr: '', greet: '', heroSub: '',
    stats: {}, chains: [], todayProjects: [], focusTodos: [], soonProjects: [],
    conflicts: [], overdueCount: 0, soonCount: 0
  },

  onShow() { this.refresh() },

  refresh() {
    const db = C.load()
    const td = C.todayISO()
    const hour = new Date().getHours()
    const greet = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
    const d = new Date()
    const dateStr = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' +
      ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()]

    const cm = C.conflictMap(db.projects)
    const conflicts = []
    Object.keys(cm).forEach(id => {
      if (cm[id].length) {
        const p = db.projects.find(x => x._id === id)
        conflicts.push({ id, title: p.title, msg: cm[id][0].msg })
      }
    })

    const todayProjects = db.projects
      .filter(p => p.start === td && p.status !== 'dropped')
      .map(p => Object.assign({}, p, { timeText: p.startTime || '全天' }))

    const overdue = db.todos.filter(t => !t.done && t.due && t.due < td)
    const todayTodos = db.todos.filter(t => !t.done && t.due === td)
    const focusTodos = overdue.concat(todayTodos).slice(0, 8).map(t =>
      Object.assign({}, t, { due: t.due ? (C.daysLeft(t.due) < 0 ? '已逾期 ' + C.fmtDate(t.due) : C.fmtDate(t.due)) : '' }))

    const soonProjects = db.projects
      .filter(p => { const dd = C.daysLeft(p.deadline); return dd !== null && dd >= 0 && dd <= 7 && p.status !== 'done' && p.status !== 'dropped' })
      .map(p => Object.assign({}, p, { ddlText: C.relDeadline(p.deadline).txt }))

    const chains = C.CHAINS.map(c => {
      const p = C.chainProgress(db, c.k)
      return Object.assign({ k: c.k, n: c.n, c: c.c }, p)
    })

    const heroSub = todayProjects.length
      ? '今天有 ' + todayProjects.length + ' 场安排。' + (conflicts.length ? '有 ' + conflicts.length + ' 处冲突需要你决定取舍。' : '暂无冲突，按计划走就好。')
      : '今天没有硬性安排。' + (overdue.length ? '有 ' + overdue.length + ' 项待办已逾期。' : '可以利用这段时间推进手上进行中的事。')

    this.setData({
      dateStr, greet, heroSub, conflicts, todayProjects, focusTodos, soonProjects, chains,
      overdueCount: overdue.length, soonCount: soonProjects.length,
      stats: {
        signed: db.projects.filter(p => p.status === 'signed').length,
        done: db.projects.filter(p => p.status === 'done').length,
        todo: db.todos.filter(t => !t.done).length,
        soon: soonProjects.length,
        candidate: db.projects.filter(p => p.status === 'candidate').length
      }
    })
  },

  toggleTodo(e) {
    const db = C.toggleTodo(C.load(), e.currentTarget.dataset.id)
    C.save(db)
    this.refresh()
  },

  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id }) },
  goImport() { wx.navigateTo({ url: '/pages/import/import' }) }
})
