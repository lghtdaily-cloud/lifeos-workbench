const C = require('../../utils/core.js')

// 把解析结果整理成预览卡片需要的字段（与 wxml 里的 preview.* 对齐）
function toPreview(p) {
  const ct = p.contacts || {}
  const c = [ct.email, ct.wechat ? '微信:' + ct.wechat : '', ct.phone, ct.form].filter(Boolean)
  return {
    title: p.title || '未命名活动',
    start: p.start, startTime: p.startTime, end: p.end, endTime: p.endTime,
    place: p.place, deadline: p.deadline, fee: p.fee,
    contactText: c.length ? c.join(' / ') : '未抓到',
    reqText: (p.requirements && p.requirements.length) ? p.requirements.join('、') : '未识别',
    missingText: (p.missing && p.missing.length) ? p.missing.join('、') : ''
  }
}

Page({
  data: { raw: '', why: '', picked: {}, chains: C.CHAINS, preview: null },

  onLoad(q) { this.q = q || {} },

  onShow() {
    // 从剪贴板自动载入（App 检测到新链接会置 pendingClip，或带 ?clip=1 进来）
    if ((this.q && this.q.clip) || getApp().globalData.pendingClip) {
      this.readClip()
      getApp().globalData.pendingClip = ''
    }
  },

  onRaw(e) {
    const raw = e.detail.value
    this.setData({ raw })
    this.setData({ preview: toPreview(C.parseLink(raw)) })
  },
  onWhy(e) { this.setData({ why: e.detail.value }) },

  // 一键从微信剪贴板读入（兼容「自动载入」与用户主动点按钮）
  readClip() {
    wx.getClipboardData({
      success: (res) => {
        const txt = (res.data || '').toString().trim()
        if (!txt) { wx.showToast({ title: '剪贴板是空的', icon: 'none' }); return }
        this.setData({ raw: txt, preview: toPreview(C.parseLink(txt)) })
        wx.showToast({ title: '已从剪贴板填入', icon: 'none' })
      },
      fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' })
    })
  },

  toggleChain(e) {
    const k = e.currentTarget.dataset.k
    const picked = Object.assign({}, this.data.picked)
    if (picked[k]) delete picked[k]; else picked[k] = true
    this.setData({ picked })
  },

  doParse() {
    const raw = this.data.raw.trim()
    if (!raw) { wx.showToast({ title: '先粘贴一段链接或原文', icon: 'none' }); return }
    if (!this.data.why.trim()) { wx.showToast({ title: '请写一句「我为什么想去」', icon: 'none' }); return }

    const p = C.parseLink(raw)
    const pickedKeys = Object.keys(this.data.picked)
    if (pickedKeys.length) p.chains = pickedKeys

    const db = C.load()
    p._id = C.uid()
    p.status = 'candidate'
    p.cats = C.inferCats(p)
    p.createdAt = Date.now()
    p.why = this.data.why.trim()
    p.source = '手动导入'
    db.projects.unshift(p)
    C.save(db)

    wx.showToast({ title: '已加入活动库', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 700)
  }
})
