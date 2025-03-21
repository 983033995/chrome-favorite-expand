/**
 * 存储服务
 * 提供浏览器存储API的封装，支持本地存储和同步存储
 */
import browser from 'webextension-polyfill'
import { AppSettings, Bookmark, Category, Tag } from '~/types'
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '~/constants'

/**
 * 存储服务类
 */
class StorageService {
  /**
   * 获取设置
   * @returns 应用设置
   */
  async getSettings(): Promise<AppSettings> {
    try {
      const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS)
      return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS
    } catch (error) {
      console.error('获取设置失败:', error)
      return DEFAULT_SETTINGS
    }
  }

  /**
   * 保存设置
   * @param settings 设置对象
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await browser.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: settings,
      })
    } catch (error) {
      console.error('保存设置失败:', error)
      throw error
    }
  }

  /**
   * 获取书签
   * @returns 书签列表
   */
  async getBookmarks(): Promise<Bookmark[]> {
    try {
      const result = await browser.storage.local.get(STORAGE_KEYS.BOOKMARKS)
      return result[STORAGE_KEYS.BOOKMARKS] || []
    } catch (error) {
      console.error('获取书签失败:', error)
      return []
    }
  }

  /**
   * 保存书签
   * @param bookmarks 书签列表
   */
  async saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
    try {
      await browser.storage.local.set({
        [STORAGE_KEYS.BOOKMARKS]: bookmarks,
      })
    } catch (error) {
      console.error('保存书签失败:', error)
      throw error
    }
  }

  /**
   * 获取分类
   * @returns 分类列表
   */
  async getCategories(): Promise<Category[]> {
    try {
      const result = await browser.storage.local.get(STORAGE_KEYS.CATEGORIES)
      return result[STORAGE_KEYS.CATEGORIES] || []
    } catch (error) {
      console.error('获取分类失败:', error)
      return []
    }
  }

  /**
   * 保存分类
   * @param categories 分类列表
   */
  async saveCategories(categories: Category[]): Promise<void> {
    try {
      await browser.storage.local.set({
        [STORAGE_KEYS.CATEGORIES]: categories,
      })
    } catch (error) {
      console.error('保存分类失败:', error)
      throw error
    }
  }

  /**
   * 获取标签
   * @returns 标签列表
   */
  async getTags(): Promise<Tag[]> {
    try {
      const result = await browser.storage.local.get(STORAGE_KEYS.TAGS)
      return result[STORAGE_KEYS.TAGS] || []
    } catch (error) {
      console.error('获取标签失败:', error)
      return []
    }
  }

  /**
   * 保存标签
   * @param tags 标签列表
   */
  async saveTags(tags: Tag[]): Promise<void> {
    try {
      await browser.storage.local.set({
        [STORAGE_KEYS.TAGS]: tags,
      })
    } catch (error) {
      console.error('保存标签失败:', error)
      throw error
    }
  }

  /**
   * 获取上次同步时间
   * @returns 上次同步时间戳
   */
  async getLastSyncTime(): Promise<number> {
    try {
      const result = await browser.storage.local.get(STORAGE_KEYS.LAST_SYNC)
      return result[STORAGE_KEYS.LAST_SYNC] || 0
    } catch (error) {
      console.error('获取上次同步时间失败:', error)
      return 0
    }
  }

  /**
   * 保存上次同步时间
   * @param timestamp 时间戳
   */
  async saveLastSyncTime(timestamp: number): Promise<void> {
    try {
      await browser.storage.local.set({
        [STORAGE_KEYS.LAST_SYNC]: timestamp,
      })
    } catch (error) {
      console.error('保存上次同步时间失败:', error)
      throw error
    }
  }

  /**
   * 清除所有数据
   * 慎用！
   */
  async clearAll(): Promise<void> {
    try {
      await browser.storage.local.clear()
    } catch (error) {
      console.error('清除所有数据失败:', error)
      throw error
    }
  }

  /**
   * 导出所有数据
   * @returns 数据对象
   */
  async exportData(): Promise<Record<string, any>> {
    try {
      const settings = await this.getSettings()
      const bookmarks = await this.getBookmarks()
      const categories = await this.getCategories()
      const tags = await this.getTags()

      return {
        settings,
        bookmarks,
        categories,
        tags,
        exportDate: Date.now(),
        version: browser.runtime.getManifest().version,
      }
    } catch (error) {
      console.error('导出数据失败:', error)
      throw error
    }
  }

  /**
   * 导入数据
   * @param data 数据对象
   */
  async importData(data: Record<string, any>): Promise<void> {
    try {
      if (data.settings) {
        await this.saveSettings(data.settings)
      }
      if (data.bookmarks) {
        await this.saveBookmarks(data.bookmarks)
      }
      if (data.categories) {
        await this.saveCategories(data.categories)
      }
      if (data.tags) {
        await this.saveTags(data.tags)
      }
    } catch (error) {
      console.error('导入数据失败:', error)
      throw error
    }
  }
}

// 导出存储服务单例
export const storageService = new StorageService()
