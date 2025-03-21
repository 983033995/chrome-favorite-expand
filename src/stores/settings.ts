/**
 * 设置存储
 * 管理应用的全局设置
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { AppSettings } from '~/types'
import { DEFAULT_SETTINGS } from '~/constants'
import { storageService, themeService } from '~/services'

export const useSettingsStore = defineStore('settings', () => {
  // 设置状态
  const settings = ref<AppSettings>(DEFAULT_SETTINGS)
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)
  
  // 初始化函数
  async function initialize() {
    isLoading.value = true
    loadError.value = null
    
    try {
      // 从存储中获取设置
      const savedSettings = await storageService.getSettings()
      settings.value = { ...DEFAULT_SETTINGS, ...savedSettings }
      
      // 应用主题设置
      applyThemeSettings()
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : String(error)
      console.error('初始化设置失败:', error)
    } finally {
      isLoading.value = false
    }
  }
  
  // 更新设置
  async function updateSettings(newSettings: Partial<AppSettings>) {
    try {
      settings.value = { ...settings.value, ...newSettings }
      
      // 保存到存储
      await storageService.saveSettings(settings.value)
      
      // 应用主题设置
      applyThemeSettings()
      
      return true
    } catch (error) {
      console.error('更新设置失败:', error)
      return false
    }
  }
  
  // 重置设置
  async function resetSettings() {
    try {
      settings.value = { ...DEFAULT_SETTINGS }
      
      // 保存到存储
      await storageService.saveSettings(settings.value)
      
      // 应用主题设置
      applyThemeSettings()
      
      return true
    } catch (error) {
      console.error('重置设置失败:', error)
      return false
    }
  }
  
  // 应用主题设置
  function applyThemeSettings() {
    // 设置主题模式
    themeService.setThemeMode(settings.value.theme.mode)
    
    // 设置主题颜色
    themeService.setPrimaryColor(settings.value.theme.primaryColor)
  }
  
  // 监听设置变化，实时保存
  watch(
    settings,
    async (newSettings) => {
      try {
        await storageService.saveSettings(newSettings)
      } catch (error) {
        console.error('自动保存设置失败:', error)
      }
    },
    { deep: true }
  )
  
  return {
    settings,
    isLoading,
    loadError,
    initialize,
    updateSettings,
    resetSettings,
  }
})
