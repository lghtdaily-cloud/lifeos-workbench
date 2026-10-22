const C = require('../../utils/core.js')

Page({
  data: { p: null, orgType: '', realNeed: [], theyWant: [], myAngle: [], risks: [] },

  onLoad(q) { this.id = q.id; this.refresh() },

  refresh() {
    const db = C.load()
    const p = (db.projects || []).find(x => x._id === this.id)
    if (!p) { wx.navigateBack(); return }
    const t = [p.title, p.org, p.content, (p.requirements || []).join(' ')].join(' ')
    const orgType = C.guessOrgType(p.org, t)
    const chains = p.chains || []
    const myAngle = []
    if (chains.indexOf('culture') >= 0) myAngle.push('你已有文化服务方向的积累，这是多数人没有的，直接讲你服务过谁、多少人参与')
    if (chains.indexOf('world') >= 0) myAngle.push('强调你的视野：看过什么、去过哪里，能给项目带来别人没有的参照')
    if (chains.indexOf('people') >= 0) myAngle.push('强调你协作过：说清团队里你负责哪一段，怎么推进别人')
    if (chains.indexOf('temper') >= 0) myAngle.push('强调你的持续性：长期在做的一件事，能证明你会把它做完')
    myAngle.push('把你的「为什么想去」具体化：不是"我很喜欢艺术"，而是"我在XX做过XX，这次我能贡献XX"')
    myAngle.push('主动提一件对方没写但需要的事（拍摄、物料、场务、记录），把自己从"报名者"变成"合作者"')

    this.setData({
      p, orgType,
      realNeed: C.guessRealNeed(p, t, orgType),
      theyWant: C.guessTheyWant(p, t),
      myAngle,
      risks: C.guessRisks(p, t)
    })
  },

  goMail() { wx.navigateTo({ url: '/pages/mail/mail?id=' + this.id }) }
})
