/**
 * 存储入口文件
 * 集中导出所有Pinia存储
 */

// 设置存储
export { useSettingsStore } from './settings'

// 书签存储
export { useBookmarkStore } from './bookmark'

// 侧边栏存储
export { useSidebarStore } from './sidebar'

// AI状态存储
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AIServiceResponse } from '~/types'

/**
 * AI状态存储
 * 管理AI服务的状态和响应
 */
export const useAIStore = defineStore('ai', () => {
  // AI处理状态
  const isProcessing = ref(false)
  const lastResponse = ref<AIServiceResponse | null>(null)
  const error = ref<string | null>(null)
  
  // 设置处理状态
  function setProcessing(processing: boolean) {
    isProcessing.value = processing
  }
  
  // 设置响应结果
  function setResponse(response: AIServiceResponse | null) {
    lastResponse.value = response
    
    if (response && !response.success) {
      error.value = response.error || '未知错误'
    } else {
      error.value = null
    }
  }
  
  // 清除结果
  function clearResponse() {
    lastResponse.value = null
    error.value = null
  }
  
  // 设置错误信息
  function setError(errorMessage: string | null) {
    error.value = errorMessage
  }
  
  return {
    isProcessing,
    lastResponse,
    error,
    setProcessing,
    setResponse,
    clearResponse,
    setError,
  }
})

// 通知存储
import { nanoid } from 'nanoid'

/**
 * 通知类型
 */
export interface Notification {
  id: string
  type: 'success' | 'info' | 'warning' | 'error'
  title: string
  message: string
  duration: number
  createdAt: number
}

/**
 * 通知存储
 * 管理应用内通知消息
 */
export const useNotificationStore = defineStore('notification', () => {
  // 通知列表
  const notifications = ref<Notification[]>([])
  
  // 显示通知
  function notify({
    type = 'info',
    title,
    message,
    duration = 3000,
  }: {
    type?: 'success' | 'info' | 'warning' | 'error'
    title: string
    message: string
    duration?: number
  }) {
    const id = nanoid()
    
    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration,
      createdAt: Date.now(),
    }
    
    // 添加到通知列表
    notifications.value.push(notification)
    
    // 设置自动关闭
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }
    
    return id
  }
  
  // 移除通知
  function removeNotification(id: string) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }
  
  // 清除所有通知
  function clearAll() {
    notifications.value = []
  }
  
  // 成功通知快捷方法
  function success(title: string, message: string, duration = 3000) {
    return notify({ type: 'success', title, message, duration })
  }
  
  // 信息通知快捷方法
  function info(title: string, message: string, duration = 3000) {
    return notify({ type: 'info', title, message, duration })
  }
  
  // 警告通知快捷方法
  function warning(title: string, message: string, duration = 3000) {
    return notify({ type: 'warning', title, message, duration })
  }
  
  // 错误通知快捷方法
  function error(title: string, message: string, duration = 4000) {
    return notify({ type: 'error', title, message, duration })
  }
  
  return {
    notifications,
    notify,
    removeNotification,
    clearAll,
    success,
    info,
    warning,
    error,
  }
})

// 导出存储初始化函数
import { createPinia } from 'pinia'

/**
 * 初始化所有存储
 * @returns Pinia实例
 */
export function setupStores() {
  const pinia = createPinia()
  return pinia
}
