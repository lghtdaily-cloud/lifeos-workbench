// utils/seed.js —— 首次启动的示例数据（与网页版 seedDemo 保持一致）
const C = require('./core.js')

function buildSeed() {
  const db = JSON.parse(JSON.stringify(C.DEFAULT_DB))
  db.projects.push({
    _id: 'demo_1',
    title: '敦煌研究院「从美索不达米亚到敦煌——丝绸之路文化艺术研究班」',
    org: '敦煌研究院',
    start: C.dayOffset(9), end: C.dayOffset(11), startTime: '09:30', endTime: '17:00',
    place: '甘肃·敦煌', isOnline: false, deadline: C.dayOffset(3), fee: '免费',
    content: '研究班面向青年研究者，含石窟现场考察与研究方法工作坊。\n报名请提交个人简历与研究计划。',
    why: '我的方向是敦煌与丝路图像，缺一次现场考察的经验；研究班有系统的田野方法训练，还能拿到一线的档案线索。',
    requirements: ['个人简历', '研究计划', '作品集'],
    contacts: { email: 'apply@example.com', wechat: '', phone: '', form: '' },
    chains: ['world', 'culture'], cats: ['academic', 'chongqing'], missing: [],
    status: 'candidate', url: 'https://www.dha.ac.cn/', source: '示例', createdAt: Date.now()
  })
  db.projects.push({
    _id: 'demo_2',
    title: '大足石刻研究院「志愿小讲解员」招募',
    org: '大足石刻研究院',
    start: C.dayOffset(20), end: '', startTime: '09:00', endTime: '',
    place: '重庆·大足', isOnline: false, deadline: C.dayOffset(12), fee: '免费',
    content: '面向有讲解意愿的青年，需参与培训与考核，提供工作午餐与交通补助。',
    why: '这是离川美最近的一条文化遗产志愿线，能把讲解能力练出来，也能进石窟现场。',
    requirements: ['个人简历', '作品集'],
    contacts: { email: '', wechat: '', phone: '', form: 'https://www.dzshike.com/' },
    chains: ['culture', 'world', 'people'], cats: ['practice', 'chongqing'], missing: ['邮箱'],
    status: 'candidate', url: 'https://www.dzshike.com/', source: '示例', createdAt: Date.now()
  })
  db.todos.push({
    _id: 'demo_t1', title: '把「敦煌研究院研究班」的报名材料清单列出来', done: false, progress: 30,
    priority: 'high', due: C.dayOffset(2), projectId: 'demo_1', repeat: '', note: '先列清单，再逐项准备',
    createdAt: Date.now(), doneAt: 0, order: Date.now()
  })
  db.todos.push({
    _id: 'demo_t2', title: '查大足石刻研究院上期志愿者招募的通知', done: false, progress: 0,
    priority: 'mid', due: C.dayOffset(5), projectId: 'demo_2', repeat: '', note: '',
    createdAt: Date.now(), doneAt: 0, order: Date.now() - 1
  })
  db.chains.culture = { goal: '今年做出 3 次能被记住的公共文化服务', notes: [] }
  db.chains.world = { goal: '完成一次丝路方向的现场调研', notes: [] }

  // 首批推荐：只放已核实仍在活跃的信源，不编造具体招募活动
  const PICKS = [
    ['敦煌研究院 · 官网', 'https://www.dha.ac.cn/', '石窟与丝路图像的一手机构，研究班、研修班、志愿者招募通常先在自家官网发。你的敦煌方向跟这里最直接对口。', ['culture', 'world'], 92, '甘肃·敦煌'],
    ['大足石刻研究院', 'https://www.dzshike.com/', '离川美最近的一条石窟志愿线，讲解员招募走这里。能练讲解、能进现场，通勤成本最低。', ['culture', 'people'], 88, '重庆·大足'],
    ['中国博物馆协会', 'http://www.chinamuseum.org.cn/', '博物馆系统的培训、征集与行业交流公告集散地，适合找文化服务类的长期线索。', ['culture'], 80, '线上'],
    ['ICOMOS China 国际古迹遗址理事会中国委员会', 'https://www.icomoschina.org.cn/', '文化遗产保护领域的专业网络，研修、论坛与国际合作信息集中，是「见识世界」这一链的入口。', ['world', 'culture'], 84, '线上'],
    ['EveryArt 艺术招聘', 'https://www.everyart.cn/', '国内艺术类岗位的垂直发布源，策展、研究助理、艺术机构实习都在上面，更新频率高。', ['people', 'temper'], 76, '线上'],
    ['On the Move', 'https://on-the-move.org/', '全球艺术与文化遗产的驻留、工作坊、跨国项目机会，英文发布，适合攒国际视野与申请经验。', ['world'], 78, '线上']
  ]
  PICKS.forEach(function (r, i) {
    db.picks.push({
      _id: 'seed_pick_' + (i + 1), score: r[4], title: r[0], url: r[1], why: r[2], chains: r[3],
      source: '信源', place: r[5], deadline: '', start: '', content: '', status: 'pending', createdAt: Date.now()
    })
  })
  return db
}

module.exports = { buildSeed }
