// app.js — 人生事务规划工作台（小程序端）全局初始化
App({
  globalData: {
    // 主题：light / dark
    theme: 'light',
    // 是否已完成首次引导
    onboarded: false,
    // 等待导入页消费的剪贴板链接
    pendingClip: ''
  },

  onLaunch() {
    // 恢复主题
    try {
      const t = wx.getStorageSync('lifeos_theme')
      if (t) {
        this.globalData.theme = t
        wx.setThemeData({ theme: t })
      }
    } catch (e) {}

    // 首次进入：灌入示例数据，避免空屏
    if (!wx.getStorageSync('lifeos_db_v1')) {
      const seed = require('./utils/seed.js')
      wx.setStorageSync('lifeos_db_v1', seed.buildSeed())
    }
  },

  onShow() {
    // 剪贴板监听：微信不开放读取聊天记录，但「复制链接」后剪贴板里会有。
    // 这里做成被动捕获：检测到一条「新」链接（按指纹去重）就提示导入活动库，
    // 不强制、不打扰——用户点「忽略」后该链接指纹已记下，不会重复弹窗。
    this.checkClipboard()
  },

  checkClipboard() {
    try {
      const finger = wx.getStorageSync('lifeos_clip_finger') || ''
      wx.getClipboardData({
        success: (res) => {
          const txt = (res.data || '').toString().trim()
          const m = txt.match(/https?:\/\/[^\s，,。；;"'）)]+/)
          const url = m ? m[0] : ''
          if (!url) return
          if (url === finger) return
          wx.setStorageSync('lifeos_clip_finger', url)
          this.globalData.pendingClip = url
          wx.showModal({
            title: '检测到微信里的链接',
            content: '剪贴板里有一条新链接，是否导入活动库？\n\n' + (url.length > 52 ? url.slice(0, 52) + '…' : url),
            confirmText: '去导入',
            cancelText: '忽略',
            success: (r) => {
              if (r.confirm) {
                wx.navigateTo({ url: '/pages/import/import?clip=1' })
              }
            }
          })
        }
      })
    } catch (e) {}
  },

  // 切换主题
  toggleTheme() {
    const t = this.globalData.theme === 'dark' ? 'light' : 'dark'
    this.globalData.theme = t
    wx.setStorageSync('lifeos_theme', t)
    wx.setThemeData({ theme: t })
    return t
  }
})
