/**
 * 书签服务
 * 提供浏览器书签API的封装，实现书签的获取、添加、修改和删除等功能
 */
import browser from 'webextension-polyfill'
import { v4 as uuidv4 } from 'uuid'
import { Bookmark, BrowserBookmarkNode, Category, EnhancedBookmark } from '~/types'
import { DEFAULT_CATEGORIES, FolderState } from '~/constants'
import { formatDate, getRelativeTimeDescription } from '~/utils'
import { storageService } from './storage'

/**
 * 书签服务类
 */
class BookmarkService {
  /**
   * 同步浏览器书签到本地存储
   * @returns 是否同步成功
   */
  async syncBookmarks(): Promise<boolean> {
    try {
      // 获取浏览器书签树
      const bookmarkTree = await browser.bookmarks.getTree()
      
      // 将浏览器书签树转换为扁平结构
      const browserBookmarks = this.flattenBookmarkTree(bookmarkTree)
      
      // 获取本地存储的书签和分类
      const storedBookmarks = await storageService.getBookmarks()
      const storedCategories = await storageService.getCategories()
      
      // 将浏览器书签转换为应用书签格式
      const { bookmarks, categories } = await this.convertBrowserBookmarks(
        browserBookmarks,
        storedBookmarks,
        storedCategories
      )
      
      // 保存转换后的书签和分类
      await storageService.saveBookmarks(bookmarks)
      await storageService.saveCategories(categories)
      
      // 更新最后同步时间
      await storageService.saveLastSyncTime(Date.now())
      
      return true
    } catch (error) {
      console.error('同步书签失败:', error)
      return false
    }
  }
  
  /**
   * 将书签树扁平化处理
   * @param tree 书签树
   * @returns 扁平化后的书签节点数组
   */
  flattenBookmarkTree(tree: browser.Bookmarks.BookmarkTreeNode[]): BrowserBookmarkNode[] {
    const result: BrowserBookmarkNode[] = []
    
    const traverse = (nodes: browser.Bookmarks.BookmarkTreeNode[], parentId?: string) => {
      nodes.forEach((node) => {
        // 排除根书签栏节点 (位置: "toolbar_____")
        if (node.id === 'toolbar_____') {
          if (node.children) {
            traverse(node.children, node.id)
          }
          return
        }
        
        // 转换为内部数据结构
        const bookmarkNode: BrowserBookmarkNode = {
          id: node.id,
          parentId: parentId || node.parentId,
          title: node.title,
          url: node.url,
          dateAdded: node.dateAdded,
          dateGroupModified: node.dateGroupModified,
          index: node.index,
        }
        
        result.push(bookmarkNode)
        
        // 递归处理子节点
        if (node.children) {
          traverse(node.children, node.id)
        }
      })
    }
    
    traverse(tree)
    return result
  }
  
  /**
   * 将浏览器书签转换为应用书签格式
   * @param browserBookmarks 浏览器书签
   * @param storedBookmarks 已存储的书签
   * @param storedCategories 已存储的分类
   * @returns 转换后的书签和分类
   */
  async convertBrowserBookmarks(
    browserBookmarks: BrowserBookmarkNode[],
    storedBookmarks: Bookmark[],
    storedCategories: Category[]
  ): Promise<{ bookmarks: Bookmark[], categories: Category[] }> {
    // 初始化结果
    const bookmarks: Bookmark[] = []
    let categories = storedCategories.length > 0 
      ? [...storedCategories]
      : DEFAULT_CATEGORIES.map(cat => ({
          ...cat,
          id: cat.id,
          name: cat.name,
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          bookmarkCount: 0,
          isAiGenerated: false,
        }))
    
    // 创建ID映射，用于快速查找已存在的书签
    const bookmarkMap = new Map(storedBookmarks.map(b => [b.originalId, b]))
    
    // 遍历浏览器书签
    for (const node of browserBookmarks) {
      // 跳过文件夹节点
      if (!node.url) {
        // 可能需要处理文件夹作为分类的逻辑
        continue
      }
      
      // 查找已存在的书签
      const existingBookmark = bookmarkMap.get(node.id)
      
      let categoryId = 'uncategorized'
      
      if (existingBookmark) {
        // 使用现有书签的分类
        categoryId = existingBookmark.categoryId
      }
      
      // 创建或更新书签
      const bookmark: Bookmark = existingBookmark ? {
        ...existingBookmark,
        title: node.title || existingBookmark.title,
        url: node.url || existingBookmark.url,
        updatedAt: Date.now(),
        originalId: node.id,
      } : {
        id: uuidv4(),
        title: node.title || '未命名书签',
        url: node.url,
        categoryId,
        tags: [],
        createdAt: node.dateAdded || Date.now(),
        updatedAt: Date.now(),
        visitCount: 0,
        originalId: node.id,
      }
      
      // 提取favicon (如果没有)
      if (!bookmark.favicon) {
        try {
          const url = new URL(bookmark.url)
          bookmark.favicon = `chrome://favicon/${url.origin}`
        } catch (e) {
          // 无法解析URL，忽略
        }
      }
      
      bookmarks.push(bookmark)
    }
    
    // 更新分类的书签数量
    categories = categories.map(category => {
      const count = bookmarks.filter(b => b.categoryId === category.id).length
      return {
        ...category,
        bookmarkCount: count,
        updatedAt: Date.now(),
      }
    })
    
    return { bookmarks, categories }
  }
  
  /**
   * 将书签转换为增强型书签（用于显示）
   * @param bookmarks 书签数组
   * @param categories 分类数组
   * @returns 增强型书签数组
   */
  enhanceBookmarks(
    bookmarks: Bookmark[],
    categories: Category[]
  ): EnhancedBookmark[] {
    return bookmarks.map(bookmark => {
      const category = categories.find(c => c.id === bookmark.categoryId)
      
      const enhanced: EnhancedBookmark = {
        ...bookmark,
        isFolder: false,
        level: 0,
        formattedDate: formatDate(new Date(bookmark.createdAt)),
        relativeTime: getRelativeTimeDescription(new Date(bookmark.createdAt)),
        path: category ? [category.name] : ['未分类'],
      }
      
      return enhanced
    })
  }
  
  /**
   * 构建分类树
   * @param categories 分类数组
   * @returns 树形结构的分类数组
   */
  buildCategoryTree(categories: Category[]): Category[] {
    // 先按 parentId 对分类进行分组
    const categoryMap = new Map<string, Category[]>()
    
    // 初始化一个map，让每个parentId都有一个空数组
    categories.forEach(category => {
      const parentId = category.parentId || 'root'
      if (!categoryMap.has(parentId)) {
        categoryMap.set(parentId, [])
      }
    })
    
    // 将分类添加到对应的父分类分组中
    categories.forEach(category => {
      const parentId = category.parentId || 'root'
      const children = categoryMap.get(parentId) || []
      children.push(category)
      categoryMap.set(parentId, children)
    })
    
    // 递归构建树
    const buildTree = (parentId: string = 'root', level: number = 0): Category[] => {
      const children = categoryMap.get(parentId) || []
      
      return children.map(child => {
        const childCategories = buildTree(child.id, level + 1)
        
        return {
          ...child,
          children: childCategories,
          level,
          folderState: level < 1 ? FolderState.EXPANDED : FolderState.COLLAPSED,
        }
      }).sort((a, b) => a.order - b.order)
    }
    
    return buildTree()
  }
  
  /**
   * 添加书签到浏览器
   * @param bookmark 书签对象
   * @returns 创建的浏览器书签
   */
  async addBookmarkToBrowser(bookmark: Bookmark): Promise<browser.Bookmarks.BookmarkTreeNode> {
    try {
      const createInfo: browser.Bookmarks.CreateDetails = {
        title: bookmark.title,
        url: bookmark.url,
      }
      
      return await browser.bookmarks.create(createInfo)
    } catch (error) {
      console.error('添加书签到浏览器失败:', error)
      throw error
    }
  }
  
  /**
   * 从浏览器删除书签
   * @param id 浏览器书签ID
   */
  async removeBookmarkFromBrowser(id: string): Promise<void> {
    try {
      await browser.bookmarks.remove(id)
    } catch (error) {
      console.error('从浏览器删除书签失败:', error)
      throw error
    }
  }
  
  /**
   * 更新浏览器中的书签
   * @param id 浏览器书签ID
   * @param changes 变更内容
   */
  async updateBookmarkInBrowser(
    id: string,
    changes: Partial<Pick<Bookmark, 'title' | 'url'>>
  ): Promise<browser.Bookmarks.BookmarkTreeNode> {
    try {
      return await browser.bookmarks.update(id, changes)
    } catch (error) {
      console.error('更新浏览器书签失败:', error)
      throw error
    }
  }
}

// 导出书签服务单例
export const bookmarkService = new BookmarkService()
