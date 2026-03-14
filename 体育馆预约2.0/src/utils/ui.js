let loadingCount = 0

// 显示加载提示
export function showLoading(title = '加载中...') {
  loadingCount += 1
  if (loadingCount === 1) {
    uni.showLoading({
      title,
      mask: true
    })
  }
}

// 隐藏加载提示
export function hideLoading() {
  if (loadingCount <= 0) return
  loadingCount -= 1
  if (loadingCount === 0) {
    uni.hideLoading()
  }
}

// 显示消息提示
export function showToast(options) {
  if (typeof options === 'string') {
    options = { title: options }
  }
  
  const defaultOptions = {
    title: '',
    icon: 'none',
    duration: 2000,
    mask: false
  }
  
  uni.showToast({
    ...defaultOptions,
    ...options
  })
}

// 显示成功提示
export function showSuccess(title) {
  showToast({
    title,
    icon: 'success'
  })
}

// 显示错误提示
export function showError(title) {
  showToast({
    title,
    icon: 'error'
  })
}

// 显示确认对话框
export function showConfirm(options) {
  if (typeof options === 'string') {
    options = { content: options }
  }
  
  const defaultOptions = {
    title: '提示',
    content: '',
    showCancel: true,
    confirmText: '确定',
    cancelText: '取消'
  }
  
  return new Promise((resolve) => {
    uni.showModal({
      ...defaultOptions,
      ...options,
      success: (res) => {
        resolve(res.confirm)
      }
    })
  })
}

// 显示操作菜单
export function showActionSheet(itemList) {
  return new Promise((resolve, reject) => {
    uni.showActionSheet({
      itemList,
      success: (res) => {
        resolve(res.tapIndex)
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}
