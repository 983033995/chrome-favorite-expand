/**
 * 服务入口文件
 * 集中导出所有服务
 */

// 存储服务
export { storageService } from './storage'

// 书签服务
export { bookmarkService } from './bookmark'

// AI服务
export { aiService } from './ai'

// 消息服务，用于组件间通信
class MessageService {
  private listeners: Map<string, Function[]> = new Map()
  
  /**
   * 监听消息
   * @param type 消息类型
   * @param callback 回调函数
   * @returns 取消监听的函数
   */
  listen(type: string, callback: Function): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    
    const callbacks = this.listeners.get(type)!
    callbacks.push(callback)
    
    // 返回取消监听的函数
    return () => {
      const index = callbacks.indexOf(callback)
      if (index !== -1) {
        callbacks.splice(index, 1)
      }
    }
  }
  
  /**
   * 发送消息
   * @param type 消息类型
   * @param data 消息数据
   */
  send(type: string, data?: any): void {
    if (this.listeners.has(type)) {
      const callbacks = this.listeners.get(type)!
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`消息处理异常 (${type}):`, error)
        }
      })
    }
  }
  
  /**
   * 清除指定类型的所有监听器
   * @param type 消息类型
   */
  clear(type: string): void {
    this.listeners.delete(type)
  }
  
  /**
   * 清除所有监听器
   */
  clearAll(): void {
    this.listeners.clear()
  }
}

// 导出消息服务单例
export const messageService = new MessageService()

// 主题服务，用于管理应用主题
class ThemeService {
  /**
   * 设置主题模式
   * @param mode 主题模式 'light' | 'dark'
   */
  setThemeMode(mode: 'light' | 'dark'): void {
    if (mode === 'dark') {
      document.body.setAttribute('theme-mode', 'dark')
    } else {
      document.body.removeAttribute('theme-mode')
    }
    
    // 保存主题设置到本地存储
    localStorage.setItem('theme-mode', mode)
    
    // 通知主题变更
    messageService.send('theme-changed', { mode })
  }
  
  /**
   * 获取当前主题模式
   * @returns 主题模式
   */
  getThemeMode(): 'light' | 'dark' {
    // 优先从本地存储获取
    const savedMode = localStorage.getItem('theme-mode')
    if (savedMode === 'light' || savedMode === 'dark') {
      return savedMode
    }
    
    // 否则从系统偏好获取
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    
    return 'light'
  }
  
  /**
   * 切换主题模式
   */
  toggleThemeMode(): void {
    const currentMode = this.getThemeMode()
    this.setThemeMode(currentMode === 'light' ? 'dark' : 'light')
  }
  
  /**
   * 设置主题颜色
   * @param color 主题颜色
   */
  setPrimaryColor(color: string): void {
    document.documentElement.style.setProperty('--primary-color', color)
    
    // 根据主色计算其他相关颜色
    const rgb = this.hexToRgb(color)
    if (rgb) {
      // 计算hover颜色（稍微亮一些）
      const hoverColor = this.adjustBrightness(rgb, 20)
      document.documentElement.style.setProperty('--primary-hover', hoverColor)
      
      // 计算active颜色（稍微暗一些）
      const activeColor = this.adjustBrightness(rgb, -20)
      document.documentElement.style.setProperty('--primary-active', activeColor)
      
      // 计算背景色（半透明）
      document.documentElement.style.setProperty(
        '--primary-bg', 
        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`
      )
    }
    
    // 保存颜色设置到本地存储
    localStorage.setItem('primary-color', color)
    
    // 通知颜色变更
    messageService.send('color-changed', { color })
  }
  
  /**
   * 获取当前主题颜色
   * @returns 主题颜色
   */
  getPrimaryColor(): string {
    // 优先从本地存储获取
    const savedColor = localStorage.getItem('primary-color')
    if (savedColor) {
      return savedColor
    }
    
    // 否则返回默认颜色
    return '#2B6DE5'
  }
  
  /**
   * 将十六进制颜色转换为RGB对象
   * @param hex 十六进制颜色值
   * @returns RGB对象或null
   */
  private hexToRgb(hex: string): { r: number, g: number, b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }
  
  /**
   * 调整RGB颜色的亮度
   * @param rgb RGB对象
   * @param amount 调整量（正值变亮，负值变暗）
   * @returns 调整后的十六进制颜色
   */
  private adjustBrightness(
    rgb: { r: number, g: number, b: number }, 
    amount: number
  ): string {
    const r = Math.max(0, Math.min(255, rgb.r + amount))
    const g = Math.max(0, Math.min(255, rgb.g + amount))
    const b = Math.max(0, Math.min(255, rgb.b + amount))
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  }
  
  /**
   * 初始化主题
   */
  init(): void {
    // 应用保存的主题模式
    this.setThemeMode(this.getThemeMode())
    
    // 应用保存的主题颜色
    this.setPrimaryColor(this.getPrimaryColor())
    
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      // 仅当用户没有手动设置主题时跟随系统
      if (!localStorage.getItem('theme-mode')) {
        this.setThemeMode(e.matches ? 'dark' : 'light')
      }
    })
  }
}

// 导出主题服务单例
export const themeService = new ThemeService()
