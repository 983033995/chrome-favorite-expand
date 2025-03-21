/**
 * 书签服务
 * 提供浏览器书签操作和同步功能
 */
import browser from 'webextension-polyfill'
import { v4 as uuidv4 } from 'uuid'
import type { Bookmark, BrowserBookmarkNode, Category, Tag } from '~/types'
import { storageService } from './storage'
import { DEFAULT_CATEGORIES, FolderState } from '~/constants'
import { aiService } from './ai'

/**
 * 书签服务类
 */
class BookmarkService {
  private _initialized: boolean = false

  /**
   * 初始化书签服务
   */
  async initialize(): Promise<void> {
    if (this._initialized) return
    
    try {
      // 确保有默认分类
      await this.ensureDefaultCategories()
      
      // 初始完成标记
      this._initialized = true
    } catch (error) {
      console.error('初始化书签服务失败:', error)
      throw error
    }
  }

  /**
   * 确保默认分类存在
   */
  private async ensureDefaultCategories(): Promise<void> {
    try {
      const categories = await storageService.getCategories()
      
      // 检查是否需要创建默认分类
      if (categories.length === 0) {
        const defaultCategories: Category[] = DEFAULT_CATEGORIES.map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          bookmarkCount: 0,
          isAiGenerated: false,
          builtin: true
        }))
        
        await storageService.saveCategories(defaultCategories)
      } else {
        // 确保所有默认分类都存在
        const existingIds = new Set(categories.map(c => c.id))
        const missingCategories: Category[] = []
        
        for (const cat of DEFAULT_CATEGORIES) {
          if (!existingIds.has(cat.id)) {
            missingCategories.push({
              id: cat.id,
              name: cat.name,
              icon: cat.icon,
              order: 0,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              bookmarkCount: 0,
              isAiGenerated: false,
              builtin: true
            })
          }
        }
        
        if (missingCategories.length > 0) {
          await storageService.saveCategories([...categories, ...missingCategories])
        }
      }
    } catch (error) {
      console.error('确保默认分类存在失败:', error)
      throw error
    }
  }

  /**
   * 同步浏览器书签到插件
   */
  async syncBookmarks(): Promise<void> {
    try {
      // 获取浏览器根书签
      const rootNode = await browser.bookmarks.getTree()
      if (!rootNode || rootNode.length === 0) {
        throw new Error('无法获取浏览器书签')
      }

      // 获取现有书签和分类
      const existingBookmarks = await storageService.getBookmarks()
      const existingCategories = await storageService.getCategories()
      
      // 书签ID映射表，用于查找现有书签
      const bookmarkMap = new Map<string, Bookmark>()
      existingBookmarks.forEach(bookmark => {
        // 使用原始ID作为键
        if (bookmark.originalId) {
          bookmarkMap.set(bookmark.originalId, bookmark)
        }
      })
      
      // 处理的书签数组
      const bookmarks: Bookmark[] = []
      // 新增的分类
      const newCategories: Category[] = [...existingCategories]
      // 分类映射
      const categoryMap = new Map<string, Category>()
      existingCategories.forEach(cat => categoryMap.set(cat.id, cat))
      
      // 递归处理书签树
      const processBookmarkNode = (node: BrowserBookmarkNode, parentCategoryId?: string): void => {
        // 忽略根节点
        if (!node.parentId) {
          if (node.children) {
            node.children.forEach(child => processBookmarkNode(child))
          }
          return
        }
        
        // 处理文件夹（创建分类）
        if (!node.url) {
          // 为文件夹创建分类
          let categoryId = ''
          
          // 检查是否已有对应的分类
          const existingCategory = existingCategories.find(c => c.name === node.title && !c.builtin)
          
          if (existingCategory) {
            categoryId = existingCategory.id
          } else {
            // 创建新分类
            categoryId = uuidv4()
            const newCategory: Category = {
              id: categoryId,
              name: node.title,
              parentId: parentCategoryId,
              order: node.index || 0,
              createdAt: node.dateAdded || Date.now(),
              updatedAt: Date.now(),
              bookmarkCount: 0,
              isAiGenerated: false,
              folderState: FolderState.COLLAPSED
            }
            
            newCategories.push(newCategory)
            categoryMap.set(categoryId, newCategory)
          }
          
          // 递归处理子书签
          if (node.children) {
            node.children.forEach(child => processBookmarkNode(child, categoryId))
          }
          
          return
        }
        
        // 处理书签
        const existingBookmark = bookmarkMap.get(node.id)
        
        // 如果书签已存在且未更新，则保留
        if (existingBookmark && existingBookmark.updatedAt >= (node.dateAdded || 0)) {
          bookmarks.push(existingBookmark)
          return
        }
        
        // 创建或更新书签
        const categoryId = parentCategoryId || 'uncategorized'
        const bookmark: Bookmark = {
          id: existingBookmark?.id || uuidv4(),
          title: node.title,
          url: node.url,
          favicon: `chrome://favicon/${node.url}`,
          categoryId,
          tags: existingBookmark?.tags || [],
          createdAt: existingBookmark?.createdAt || (node.dateAdded || Date.now()),
          updatedAt: Date.now(),
          visitCount: existingBookmark?.visitCount || 0,
          originalId: node.id,
          parentId: node.parentId,
          index: node.index
        }
        
        // 保留已有的AI生成数据
        if (existingBookmark?.aiGenerated) {
          bookmark.aiGenerated = existingBookmark.aiGenerated
        }
        
        bookmarks.push(bookmark)
        
        // 更新分类书签计数
        const category = categoryMap.get(categoryId)
        if (category) {
          category.bookmarkCount += 1
        }
      }
      
      // 处理所有书签
      rootNode[0].children?.forEach(child => processBookmarkNode(child))
      
      // 保存同步后的数据
      await storageService.saveBookmarks(bookmarks)
      await storageService.saveCategories(newCategories)
      await storageService.saveLastSyncTime(Date.now())
      
      console.log(`同步完成: ${bookmarks.length} 个书签, ${newCategories.length} 个分类`)
    } catch (error) {
      console.error('同步书签失败:', error)
      throw error
    }
  }

  /**
   * 添加新书签
   * @param bookmark 书签数据
   */
  async addBookmark(bookmark: Partial<Bookmark>): Promise<Bookmark> {
    try {
      const now = Date.now()
      const bookmarkId = uuidv4()
      
      // 创建新书签对象
      const newBookmark: Bookmark = {
        id: bookmarkId,
        title: bookmark.title || '',
        url: bookmark.url || '',
        favicon: bookmark.favicon || `chrome://favicon/${bookmark.url}`,
        description: bookmark.description || '',
        categoryId: bookmark.categoryId || 'uncategorized',
        tags: bookmark.tags || [],
        createdAt: now,
        updatedAt: now,
        visitCount: 0,
        ...bookmark,
      }
      
      // 获取现有书签并添加新书签
      const existingBookmarks = await storageService.getBookmarks()
      const updatedBookmarks = [...existingBookmarks, newBookmark]
      
      // 更新分类书签计数
      await this.updateCategoryCount(newBookmark.categoryId, 1)
      
      // 保存更新后的书签列表
      await storageService.saveBookmarks(updatedBookmarks)
      
      // 如果配置了自动分类，则进行分析
      const settings = await storageService.getSettings()
      if (settings.ai.autoClassify && settings.ai.apiKey) {
        this.analyzeBookmark(newBookmark.id).catch(err => 
          console.error('自动分析书签失败:', err)
        )
      }
      
      return newBookmark
    } catch (error) {
      console.error('添加书签失败:', error)
      throw error
    }
  }

  /**
   * 更新书签
   * @param id 书签ID
   * @param data 更新数据
   */
  async updateBookmark(id: string, data: Partial<Bookmark>): Promise<Bookmark> {
    try {
      const bookmarks = await storageService.getBookmarks()
      const bookmarkIndex = bookmarks.findIndex(b => b.id === id)
      
      if (bookmarkIndex === -1) {
        throw new Error(`书签不存在: ${id}`)
      }
      
      const oldBookmark = bookmarks[bookmarkIndex]
      const updatedBookmark: Bookmark = {
        ...oldBookmark,
        ...data,
        updatedAt: Date.now()
      }
      
      // 更新书签数组
      bookmarks[bookmarkIndex] = updatedBookmark
      
      // 如果分类发生变化，更新分类书签计数
      if (data.categoryId && data.categoryId !== oldBookmark.categoryId) {
        await this.updateCategoryCount(oldBookmark.categoryId, -1)
        await this.updateCategoryCount(data.categoryId, 1)
      }
      
      // 保存更新后的书签列表
      await storageService.saveBookmarks(bookmarks)
      
      return updatedBookmark
    } catch (error) {
      console.error('更新书签失败:', error)
      throw error
    }
  }

  /**
   * 删除书签
   * @param id 书签ID
   */
  async deleteBookmark(id: string): Promise<boolean> {
    try {
      const bookmarks = await storageService.getBookmarks()
      const bookmarkIndex = bookmarks.findIndex(b => b.id === id)
      
      if (bookmarkIndex === -1) {
        return false
      }
      
      const bookmark = bookmarks[bookmarkIndex]
      
      // 更新分类书签计数
      await this.updateCategoryCount(bookmark.categoryId, -1)
      
      // 从数组中移除书签
      bookmarks.splice(bookmarkIndex, 1)
      
      // 保存更新后的书签列表
      await storageService.saveBookmarks(bookmarks)
      
      return true
    } catch (error) {
      console.error('删除书签失败:', error)
      throw error
    }
  }

  /**
   * 分析书签内容
   * @param id 书签ID
   */
  async analyzeBookmark(id: string): Promise<Bookmark | null> {
    try {
      const bookmarks = await storageService.getBookmarks()
      const bookmarkIndex = bookmarks.findIndex(b => b.id === id)
      
      if (bookmarkIndex === -1) {
        throw new Error(`书签不存在: ${id}`)
      }
      
      const bookmark = bookmarks[bookmarkIndex]
      const settings = await storageService.getSettings()
      
      // 调用AI服务分析书签
      const aiResult = await aiService.analyzeBookmark({
        provider: settings.ai.provider,
        apiKey: settings.ai.apiKey,
        bookmark
      })
      
      if (!aiResult.success) {
        throw new Error(`AI分析失败: ${aiResult.error}`)
      }
      
      // 更新书签的AI生成数据
      const updatedBookmark: Bookmark = {
        ...bookmark,
        aiGenerated: aiResult.data,
        updatedAt: Date.now()
      }
      
      // 如果AI推荐了分类，且与当前不同，则更新分类
      if (aiResult.data?.category && 
          updatedBookmark.categoryId === 'uncategorized') {
        
        // 查找或创建推荐的分类
        const categories = await storageService.getCategories()
        let categoryId = 'uncategorized'
        
        // 查找匹配的现有分类
        const existingCategory = categories.find(
          c => c.name.toLowerCase() === aiResult.data!.category!.toLowerCase()
        )
        
        if (existingCategory) {
          categoryId = existingCategory.id
        } else {
          // 创建新分类
          const newCategory: Category = {
            id: uuidv4(),
            name: aiResult.data!.category!,
            order: categories.length,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            bookmarkCount: 1,
            isAiGenerated: true
          }
          
          await storageService.saveCategories([...categories, newCategory])
          categoryId = newCategory.id
        }
        
        // 更新书签分类
        updatedBookmark.categoryId = categoryId
        
        // 更新分类书签计数
        await this.updateCategoryCount('uncategorized', -1)
        await this.updateCategoryCount(categoryId, 1)
      }
      
      // 如果AI推荐了标签，更新标签
      if (aiResult.data?.tags && aiResult.data.tags.length > 0) {
        // 获取当前标签
        const tags = await storageService.getTags()
        const tagMap = new Map<string, Tag>()
        
        // 建立标签映射
        tags.forEach(tag => tagMap.set(tag.name.toLowerCase(), tag))
        
        // 处理推荐的标签
        const newTags: Tag[] = []
        const bookmarkTags: string[] = []
        
        for (const tagName of aiResult.data.tags) {
          const normTagName = tagName.toLowerCase()
          
          // 查找现有标签
          if (tagMap.has(normTagName)) {
            const tag = tagMap.get(normTagName)!
            // 增加计数
            tag.count += 1
            tag.updatedAt = Date.now()
            bookmarkTags.push(tag.id)
          } else {
            // 创建新标签
            const tagId = uuidv4()
            const newTag: Tag = {
              id: tagId,
              name: tagName,
              count: 1,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              isAiGenerated: true
            }
            
            newTags.push(newTag)
            tagMap.set(normTagName, newTag)
            bookmarkTags.push(tagId)
          }
        }
        
        // 保存标签
        await storageService.saveTags([...tags, ...newTags])
        
        // 更新书签标签
        updatedBookmark.tags = bookmarkTags
      }
      
      // 更新书签
      bookmarks[bookmarkIndex] = updatedBookmark
      await storageService.saveBookmarks(bookmarks)
      
      return updatedBookmark
    } catch (error) {
      console.error('分析书签失败:', error)
      return null
    }
  }

  /**
   * 更新分类书签计数
   * @param categoryId 分类ID
   * @param delta 增减数量
   */
  private async updateCategoryCount(categoryId: string, delta: number): Promise<void> {
    try {
      const categories = await storageService.getCategories()
      const categoryIndex = categories.findIndex(c => c.id === categoryId)
      
      if (categoryIndex !== -1) {
        categories[categoryIndex].bookmarkCount += delta
        categories[categoryIndex].updatedAt = Date.now()
        await storageService.saveCategories(categories)
      }
    } catch (error) {
      console.error(`更新分类计数失败: ${categoryId}`, error)
    }
  }

  /**
   * 添加书签到浏览器
   * @param bookmark 书签数据
   */
  async addToBrowser(bookmark: Bookmark): Promise<string> {
    try {
      let parentId = ''
      
      // 如果有分类，尝试在浏览器中创建对应的文件夹
      if (bookmark.categoryId && bookmark.categoryId !== 'uncategorized') {
        const categories = await storageService.getCategories()
        const category = categories.find(c => c.id === bookmark.categoryId)
        
        if (category && !category.builtin) {
          // 检查浏览器中是否已存在该文件夹
          const searchResults = await browser.bookmarks.search({ title: category.name })
          const folders = searchResults.filter(item => !item.url)
          
          if (folders.length > 0) {
            // 使用现有文件夹
            parentId = folders[0].id
          } else {
            // 创建新文件夹
            const newFolder = await browser.bookmarks.create({
              title: category.name,
              parentId: undefined // 添加到根目录
            })
            parentId = newFolder.id
          }
        }
      }
      
      // 创建书签
      const createdBookmark = await browser.bookmarks.create({
        title: bookmark.title,
        url: bookmark.url,
        parentId: parentId || undefined
      })
      
      return createdBookmark.id
    } catch (error) {
      console.error('添加书签到浏览器失败:', error)
      throw error
    }
  }

  /**
   * 搜索书签
   * @param keyword 关键词
   * @param categoryId 分类ID
   * @param tags 标签IDs
   */
  async searchBookmarks(keyword?: string, categoryId?: string, tags?: string[]): Promise<Bookmark[]> {
    try {
      const bookmarks = await storageService.getBookmarks()
      let filtered = [...bookmarks]
      
      // 按分类过滤
      if (categoryId && categoryId !== 'all') {
        if (categoryId === 'frequent') {
          // 常用书签 - 按访问次数排序取前20
          filtered = filtered.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0)).slice(0, 20)
        } else if (categoryId === 'recent') {
          // 最近添加 - 按创建时间排序取近7天
          const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
          filtered = filtered.filter(b => b.createdAt > oneWeekAgo)
            .sort((a, b) => b.createdAt - a.createdAt)
        } else if (categoryId === 'uncategorized') {
          // 未分类
          filtered = filtered.filter(b => b.categoryId === 'uncategorized')
        } else {
          // 特定分类
          filtered = filtered.filter(b => b.categoryId === categoryId)
        }
      }
      
      // 按标签过滤
      if (tags && tags.length > 0) {
        filtered = filtered.filter(b => 
          tags.some(tagId => b.tags.includes(tagId))
        )
      }
      
      // 按关键词搜索
      if (keyword && keyword.trim()) {
        const searchTerm = keyword.trim().toLowerCase()
        filtered = filtered.filter(b => 
          b.title.toLowerCase().includes(searchTerm) || 
          b.url.toLowerCase().includes(searchTerm) ||
          (b.description && b.description.toLowerCase().includes(searchTerm))
        )
      }
      
      return filtered
    } catch (error) {
      console.error('搜索书签失败:', error)
      return []
    }
  }

  /**
   * 获取分类树
   * 将平面分类列表转换为树形结构
   */
  async getCategoryTree(): Promise<Category[]> {
    try {
      const categories = await storageService.getCategories()
      const tree: Category[] = []
      const map = new Map<string, Category>()
      
      // 首先添加内置分类
      DEFAULT_CATEGORIES.forEach(defaultCat => {
        const cat = categories.find(c => c.id === defaultCat.id)
        if (cat) {
          cat.level = 0
          tree.push(cat)
        }
      })
      
      // 创建ID映射
      categories.forEach(cat => {
        // 克隆分类对象并添加子分类数组
        const category = { ...cat, children: [] as Category[] }
        map.set(cat.id, category)
      })
      
      // 构建树形结构
      categories.forEach(cat => {
        // 跳过内置分类
        if (DEFAULT_CATEGORIES.some(dc => dc.id === cat.id)) {
          return
        }
        
        if (cat.parentId && map.has(cat.parentId)) {
          // 添加到父分类的子分类列表
          const parent = map.get(cat.parentId)!
          const child = map.get(cat.id)!
          child.level = (parent.level || 0) + 1
          parent.children!.push(child)
        } else if (!cat.parentId) {
          // 根分类
          const rootCat = map.get(cat.id)!
          rootCat.level = 0
          tree.push(rootCat)
        }
      })
      
      // 排序
      const sortCategories = (cats: Category[]) => {
        cats.sort((a, b) => a.order - b.order)
        cats.forEach(cat => {
          if (cat.children && cat.children.length > 0) {
            sortCategories(cat.children)
          }
        })
      }
      
      sortCategories(tree)
      
      return tree
    } catch (error) {
      console.error('获取分类树失败:', error)
      return []
    }
  }
}

// 导出书签服务单例
export const bookmarkService = new BookmarkService()
