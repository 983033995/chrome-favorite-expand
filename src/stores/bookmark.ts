/**
 * 书签存储
 * 管理应用的书签数据
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { cloneDeep } from 'lodash-es'
import { Bookmark, Category, EnhancedBookmark, SearchParams, Tag } from '~/types'
import { DEFAULT_CATEGORIES, FolderState } from '~/constants'
import { storageService, bookmarkService, messageService } from '~/services'

export const useBookmarkStore = defineStore('bookmark', () => {
  // 状态
  const bookmarks = ref<Bookmark[]>([])
  const categories = ref<Category[]>([])
  const tags = ref<Tag[]>([])
  const lastSyncTime = ref<number>(0)
  
  const isLoading = ref(false)
  const isSyncing = ref(false)
  const searchParams = ref<SearchParams>({
    keyword: '',
    categoryId: 'all',
    sortBy: 'dateAdded',
    sortOrder: 'desc',
  })
  
  // 增强的书签列表（根据筛选和搜索条件）
  const filteredBookmarks = computed(() => {
    // 克隆书签以避免修改原始数据
    let result = cloneDeep(bookmarks.value)
    const search = searchParams.value
    
    // 应用分类筛选
    if (search.categoryId && search.categoryId !== 'all') {
      if (search.categoryId === 'uncategorized') {
        result = result.filter(bookmark => !bookmark.categoryId || bookmark.categoryId === 'uncategorized')
      } else if (search.categoryId === 'frequent') {
        // 排序后取访问次数最多的前20个
        result = result
          .slice()
          .sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, 20)
      } else if (search.categoryId === 'recent') {
        // 最近添加的30天内的书签
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
        result = result.filter(bookmark => bookmark.createdAt >= thirtyDaysAgo)
      } else {
        result = result.filter(bookmark => bookmark.categoryId === search.categoryId)
      }
    }
    
    // 应用标签筛选
    if (search.tags && search.tags.length > 0) {
      result = result.filter(bookmark => {
        return search.tags!.every(tag => bookmark.tags.includes(tag))
      })
    }
    
    // 应用关键词搜索
    if (search.keyword) {
      const keyword = search.keyword.toLowerCase()
      result = result.filter(bookmark => {
        return (
          bookmark.title.toLowerCase().includes(keyword) ||
          bookmark.url.toLowerCase().includes(keyword) ||
          bookmark.description?.toLowerCase().includes(keyword) ||
          bookmark.tags.some(tag => tag.toLowerCase().includes(keyword))
        )
      })
    }
    
    // 应用排序
    result.sort((a, b) => {
      let comparison = 0
      
      switch (search.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'dateAdded':
          comparison = a.createdAt - b.createdAt
          break
        case 'lastVisited':
          const aVisit = a.lastVisited || 0
          const bVisit = b.lastVisited || 0
          comparison = aVisit - bVisit
          break
        case 'url':
          comparison = a.url.localeCompare(b.url)
          break
        default:
          comparison = a.createdAt - b.createdAt
      }
      
      // 应用排序顺序
      return search.sortOrder === 'asc' ? comparison : -comparison
    })
    
    // 转换为增强书签
    const enhancedBookmarks = bookmarkService.enhanceBookmarks(result, categories.value)
    return enhancedBookmarks
  })
  
  // 构建后的分类树
  const categoryTree = computed(() => {
    return bookmarkService.buildCategoryTree(categories.value)
  })
  
  // 按名称排序的标签列表
  const sortedTags = computed(() => {
    return [...tags.value].sort((a, b) => a.name.localeCompare(b.name))
  })
  
  // 同步浏览器书签
  async function syncBookmarks() {
    if (isSyncing.value) return false
    
    isSyncing.value = true
    
    try {
      // 调用书签服务进行同步
      const success = await bookmarkService.syncBookmarks()
      
      if (success) {
        // 更新本地数据
        await loadData()
        
        // 更新同步时间
        lastSyncTime.value = Date.now()
        await storageService.saveLastSyncTime(lastSyncTime.value)
        
        // 发送更新消息
        messageService.send('bookmarks-updated')
      }
      
      return success
    } catch (error) {
      console.error('同步书签失败:', error)
      return false
    } finally {
      isSyncing.value = false
    }
  }
  
  // 初始化加载数据
  async function loadData() {
    isLoading.value = true
    
    try {
      // 加载书签数据
      bookmarks.value = await storageService.getBookmarks()
      
      // 加载分类数据，如果为空则使用默认分类
      const savedCategories = await storageService.getCategories()
      categories.value = savedCategories.length > 0
        ? savedCategories
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
      
      // 加载标签数据
      tags.value = await storageService.getTags()
      
      // 加载上次同步时间
      lastSyncTime.value = await storageService.getLastSyncTime()
      
      // 如果数据为空或者最后同步时间超过1天，则自动同步
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
      if (bookmarks.value.length === 0 || lastSyncTime.value < oneDayAgo) {
        syncBookmarks()
      }
      
      return true
    } catch (error) {
      console.error('加载数据失败:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  // 添加书签
  async function addBookmark(bookmark: Partial<Bookmark>): Promise<Bookmark | null> {
    try {
      // 创建新书签
      const newBookmark: Bookmark = {
        id: uuidv4(),
        title: bookmark.title || '未命名书签',
        url: bookmark.url || '',
        categoryId: bookmark.categoryId || 'uncategorized',
        tags: bookmark.tags || [],
        description: bookmark.description || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        visitCount: 0,
        ...bookmark
      }
      
      // 添加到浏览器书签
      if (!bookmark.originalId) {
        try {
          const browserBookmark = await bookmarkService.addBookmarkToBrowser(newBookmark)
          newBookmark.originalId = browserBookmark.id
        } catch (error) {
          console.error('添加到浏览器书签失败:', error)
          // 继续执行，即使添加到浏览器失败
        }
      }
      
      // 更新书签列表
      bookmarks.value.push(newBookmark)
      
      // 保存到存储
      await storageService.saveBookmarks(bookmarks.value)
      
      // 更新分类书签数量
      await updateCategoryBookmarkCount(newBookmark.categoryId)
      
      // 更新标签
      if (newBookmark.tags.length > 0) {
        await updateTags(newBookmark.tags)
      }
      
      // 发送更新消息
      messageService.send('bookmark-added', newBookmark)
      
      return newBookmark
    } catch (error) {
      console.error('添加书签失败:', error)
      return null
    }
  }
  
  // 更新书签
  async function updateBookmark(id: string, changes: Partial<Bookmark>): Promise<boolean> {
    try {
      // 查找书签
      const index = bookmarks.value.findIndex(b => b.id === id)
      if (index === -1) {
        return false
      }
      
      const oldBookmark = bookmarks.value[index]
      const oldCategoryId = oldBookmark.categoryId
      const oldTags = [...oldBookmark.tags]
      
      // 更新书签
      const updatedBookmark: Bookmark = {
        ...oldBookmark,
        ...changes,
        updatedAt: Date.now(),
      }
      
      // 更新浏览器书签
      if (updatedBookmark.originalId) {
        try {
          await bookmarkService.updateBookmarkInBrowser(
            updatedBookmark.originalId,
            {
              title: updatedBookmark.title,
              url: updatedBookmark.url,
            }
          )
        } catch (error) {
          console.error('更新浏览器书签失败:', error)
          // 继续执行，即使更新浏览器书签失败
        }
      }
      
      // 更新书签列表
      bookmarks.value[index] = updatedBookmark
      
      // 保存到存储
      await storageService.saveBookmarks(bookmarks.value)
      
      // 更新分类书签数量（如果分类发生变化）
      if (oldCategoryId !== updatedBookmark.categoryId) {
        await updateCategoryBookmarkCount(oldCategoryId)
        await updateCategoryBookmarkCount(updatedBookmark.categoryId)
      }
      
      // 更新标签（如果标签发生变化）
      if (JSON.stringify(oldTags) !== JSON.stringify(updatedBookmark.tags)) {
        await updateTags(updatedBookmark.tags)
      }
      
      // 发送更新消息
      messageService.send('bookmark-updated', updatedBookmark)
      
      return true
    } catch (error) {
      console.error('更新书签失败:', error)
      return false
    }
  }
  
  // 删除书签
  async function deleteBookmark(id: string): Promise<boolean> {
    try {
      // 查找书签
      const index = bookmarks.value.findIndex(b => b.id === id)
      if (index === -1) {
        return false
      }
      
      const bookmark = bookmarks.value[index]
      
      // 从浏览器删除书签
      if (bookmark.originalId) {
        try {
          await bookmarkService.removeBookmarkFromBrowser(bookmark.originalId)
        } catch (error) {
          console.error('从浏览器删除书签失败:', error)
          // 继续执行，即使从浏览器删除失败
        }
      }
      
      // 更新书签列表
      bookmarks.value.splice(index, 1)
      
      // 保存到存储
      await storageService.saveBookmarks(bookmarks.value)
      
      // 更新分类书签数量
      await updateCategoryBookmarkCount(bookmark.categoryId)
      
      // 更新标签
      if (bookmark.tags.length > 0) {
        await updateTags(bookmark.tags)
      }
      
      // 发送更新消息
      messageService.send('bookmark-deleted', bookmark)
      
      return true
    } catch (error) {
      console.error('删除书签失败:', error)
      return false
    }
  }
  
  // 更新分类书签数量
  async function updateCategoryBookmarkCount(categoryId: string) {
    // 查找分类
    const index = categories.value.findIndex(c => c.id === categoryId)
    if (index === -1) {
      return
    }
    
    // 计算书签数量
    const count = bookmarks.value.filter(b => b.categoryId === categoryId).length
    
    // 更新分类
    categories.value[index] = {
      ...categories.value[index],
      bookmarkCount: count,
      updatedAt: Date.now(),
    }
    
    // 保存到存储
    await storageService.saveCategories(categories.value)
  }
  
  // 更新标签（添加新标签并更新计数）
  async function updateTags(tagNames: string[]) {
    // 临时标签映射
    const tagMap = new Map<string, Tag>()
    
    // 初始化标签映射
    tags.value.forEach(tag => {
      tagMap.set(tag.name, { ...tag, count: 0 })
    })
    
    // 统计所有书签中的标签使用数量
    bookmarks.value.forEach(bookmark => {
      bookmark.tags.forEach(tagName => {
        if (tagMap.has(tagName)) {
          const tag = tagMap.get(tagName)!
          tag.count++
        } else {
          // 添加新标签
          tagMap.set(tagName, {
            id: uuidv4(),
            name: tagName,
            count: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isAiGenerated: false,
          })
        }
      })
    })
    
    // 检查是否有需要删除的标签（计数为0）
    const updatedTags = Array.from(tagMap.values()).filter(tag => tag.count > 0)
    
    // 更新标签列表
    tags.value = updatedTags
    
    // 保存到存储
    await storageService.saveTags(updatedTags)
  }
  
  // 添加分类
  async function addCategory(category: Partial<Category>): Promise<Category | null> {
    try {
      // 创建新分类
      const newCategory: Category = {
        id: uuidv4(),
        name: category.name || '新分类',
        parentId: category.parentId || undefined,
        order: categories.value.length,
        bookmarkCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isAiGenerated: category.isAiGenerated || false,
        ...category,
      }
      
      // 更新分类列表
      categories.value.push(newCategory)
      
      // 保存到存储
      await storageService.saveCategories(categories.value)
      
      // 发送更新消息
      messageService.send('category-added', newCategory)
      
      return newCategory
    } catch (error) {
      console.error('添加分类失败:', error)
      return null
    }
  }
  
  // 更新分类
  async function updateCategory(id: string, changes: Partial<Category>): Promise<boolean> {
    try {
      // 查找分类
      const index = categories.value.findIndex(c => c.id === id)
      if (index === -1) {
        return false
      }
      
      const oldCategory = categories.value[index]
      
      // 更新分类
      const updatedCategory: Category = {
        ...oldCategory,
        ...changes,
        updatedAt: Date.now(),
      }
      
      // 更新分类列表
      categories.value[index] = updatedCategory
      
      // 保存到存储
      await storageService.saveCategories(categories.value)
      
      // 发送更新消息
      messageService.send('category-updated', updatedCategory)
      
      return true
    } catch (error) {
      console.error('更新分类失败:', error)
      return false
    }
  }
  
  // 删除分类
  async function deleteCategory(id: string): Promise<boolean> {
    try {
      // 检查是否是内置分类
      const category = categories.value.find(c => c.id === id)
      if (!category || category.builtin) {
        return false
      }
      
      // 更新引用此分类的书签
      const affectedBookmarks = bookmarks.value.filter(b => b.categoryId === id)
      for (const bookmark of affectedBookmarks) {
        await updateBookmark(bookmark.id, { categoryId: 'uncategorized' })
      }
      
      // 更新分类列表
      categories.value = categories.value.filter(c => c.id !== id)
      
      // 保存到存储
      await storageService.saveCategories(categories.value)
      
      // 发送更新消息
      messageService.send('category-deleted', category)
      
      return true
    } catch (error) {
      console.error('删除分类失败:', error)
      return false
    }
  }
  
  // 更新分类折叠状态
  function updateCategoryFolderState(
    id: string, 
    folderState: FolderState
  ) {
    // 查找和更新分类的折叠状态（不保存到存储）
    const findAndUpdate = (
      cats: Category[], 
      targetId: string, 
      state: FolderState
    ): boolean => {
      for (let i = 0; i < cats.length; i++) {
        if (cats[i].id === targetId) {
          cats[i].folderState = state
          return true
        }
        
        // 递归检查子分类
        if (cats[i].children && cats[i].children.length > 0) {
          const found = findAndUpdate(cats[i].children, targetId, state)
          if (found) return true
        }
      }
      
      return false
    }
    
    // 在计算属性中查找和更新
    const catTree = categoryTree.value
    findAndUpdate(catTree, id, folderState)
  }
  
  // 更新搜索参数
  function updateSearchParams(params: Partial<SearchParams>) {
    searchParams.value = { ...searchParams.value, ...params }
  }
  
  // 添加书签访问记录
  async function addBookmarkVisit(id: string) {
    // 查找书签
    const index = bookmarks.value.findIndex(b => b.id === id)
    if (index === -1) {
      return
    }
    
    // 更新访问次数和最后访问时间
    const bookmark = bookmarks.value[index]
    const updatedBookmark: Bookmark = {
      ...bookmark,
      visitCount: (bookmark.visitCount || 0) + 1,
      lastVisited: Date.now(),
    }
    
    // 更新书签列表
    bookmarks.value[index] = updatedBookmark
    
    // 保存到存储
    await storageService.saveBookmarks(bookmarks.value)
  }
  
  return {
    // 状态
    bookmarks,
    categories,
    tags,
    lastSyncTime,
    isLoading,
    isSyncing,
    searchParams,
    
    // 计算属性
    filteredBookmarks,
    categoryTree,
    sortedTags,
    
    // 方法
    loadData,
    syncBookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    addCategory,
    updateCategory,
    deleteCategory,
    updateCategoryFolderState,
    updateSearchParams,
    addBookmarkVisit,
  }
})
