const C = require('../../utils/core.js')

const BLANK = {
  name: '', school: '四川美术学院', major: '', grade: '', phone: '', email: '',
  oneLiner: '', resumeText: '', resumeName: ''
}

Page({
  data: { mp: Object.assign({}, BLANK) },

  onShow() { this.refresh() },

  refresh() {
    const db = C.load()
    this.setData({ mp: Object.assign({}, BLANK, db.myProfile || {}) })
  },

  onInput(e) {
    const k = e.currentTarget.dataset.k
    this.setData({ ['mp.' + k]: e.detail.value })
  },

  // 上传简历：txt/md 读取正文，pdf 仅记文件名（小程序无法读 PDF 文本）
  chooseFile() {
    wx.chooseMessageFile({
      count: 1, type: 'file', extension: ['txt', 'md', 'pdf'],
      success: (res) => {
        const f = res.tempFiles[0]
        if (/\.pdf$/i.test(f.name)) {
          const db = C.load(); db.myProfile.resumeName = f.name; C.save(db)
          this.refresh()
          wx.showToast({ title: 'PDF 仅记文件名，正文请手填', icon: 'none' })
          return
        }
        wx.getFileSystemManager().readFile({
          filePath: f.path, encoding: 'utf-8',
          success: (r) => {
            const db = C.load()
            db.myProfile.resumeName = f.name
            db.myProfile.resumeText = r.data || ''
            C.save(db); this.refresh()
            wx.showToast({ title: '已读取简历正文', icon: 'success' })
          },
          fail: () => wx.showToast({ title: '读取失败', icon: 'none' })
        })
      },
      fail: () => {}
    })
  },

  save() {
    const db = C.load()
    const mp = Object.assign({}, db.myProfile, this.data.mp)
    mp.updatedAt = Date.now()
    db.myProfile = mp
    C.save(db)
    wx.showToast({ title: '已保存我的资料', icon: 'success' })
  }
})
