/**
 * 书签处理相关工具函数
 */
import { formatDate, getRelativeTimeDescription } from './dateFormatter'

export interface BookmarkNode {
  id: string
  parentId?: string
  index?: number
  url?: string
  title: string
  dateAdded?: number
  dateGroupModified?: number
  children?: BookmarkNode[]
  [key: string]: any
}

export interface EnhancedBookmarkNode extends BookmarkNode {
  level: number
  formattedDateAdded?: string
  relativeTimeAdded?: string
  isFolder: boolean
  folderState?: 'expanded' | 'collapsed'
  path?: string[]
}

/**
 * 将Chrome书签数据转换为增强版书签数据
 * @param node Chrome书签节点
 * @param level 当前节点层级
 * @param parentPath 父节点路径
 * @returns 增强版书签节点
 */
export function enhanceBookmarkNode(
  node: BookmarkNode, 
  level: number = 0, 
  parentPath: string[] = []
): EnhancedBookmarkNode {
  const isFolder = !node.url
  const path = [...parentPath, node.title]
  
  const enhanced: EnhancedBookmarkNode = {
    ...node,
    level,
    isFolder,
    path,
  }
  
  // 处理日期
  if (node.dateAdded) {
    const dateAdded = new Date(node.dateAdded)
    enhanced.formattedDateAdded = formatDate(dateAdded)
    enhanced.relativeTimeAdded = getRelativeTimeDescription(dateAdded)
  }
  
  // 如果是文件夹，设置初始折叠状态
  if (isFolder) {
    enhanced.folderState = level < 1 ? 'expanded' : 'collapsed'
    
    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      enhanced.children = node.children.map(child => 
        enhanceBookmarkNode(child, level + 1, path)
      )
    }
  }
  
  return enhanced
}

/**
 * 搜索书签节点
 * @param nodes 书签节点数组
 * @param query 搜索关键词
 * @returns 匹配的书签节点数组
 */
export function searchBookmarks(
  nodes: EnhancedBookmarkNode[], 
  query: string
): EnhancedBookmarkNode[] {
  if (!query) return []
  
  const results: EnhancedBookmarkNode[] = []
  const lowerQuery = query.toLowerCase()
  
  function search(node: EnhancedBookmarkNode) {
    // 匹配标题或URL
    const matchesTitle = node.title.toLowerCase().includes(lowerQuery)
    const matchesUrl = node.url ? node.url.toLowerCase().includes(lowerQuery) : false
    
    if (matchesTitle || matchesUrl) {
      results.push(node)
    }
    
    // 递归搜索子节点
    if (node.children && node.children.length > 0) {
      node.children.forEach(search)
    }
  }
  
  nodes.forEach(search)
  return results
}

/**
 * 按照不同的排序方式对书签进行排序
 * @param bookmarks 书签节点数组
 * @param sortBy 排序方式：'title'(标题),'dateAdded'(添加日期),'url'(地址)
 * @param sortOrder 排序顺序：'asc'(升序),'desc'(降序)
 * @returns 排序后的书签节点数组
 */
export function sortBookmarks(
  bookmarks: EnhancedBookmarkNode[],
  sortBy: 'title' | 'dateAdded' | 'url' = 'title',
  sortOrder: 'asc' | 'desc' = 'asc'
): EnhancedBookmarkNode[] {
  // 复制数组以避免修改原始数据
  const sorted = [...bookmarks]
  
  sorted.sort((a, b) => {
    let valueA, valueB
    
    // 根据排序字段获取比较值
    switch (sortBy) {
      case 'title':
        valueA = a.title.toLowerCase()
        valueB = b.title.toLowerCase()
        break
      case 'dateAdded':
        valueA = a.dateAdded || 0
        valueB = b.dateAdded || 0
        break
      case 'url':
        valueA = a.url || ''
        valueB = b.url || ''
        break
      default:
        valueA = a.title.toLowerCase()
        valueB = b.title.toLowerCase()
    }
    
    // 文件夹始终排在前面
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1
    
    // 根据排序顺序进行比较
    if (sortOrder === 'asc') {
      return valueA < valueB ? -1 : valueA > valueB ? 1 : 0
    } else {
      return valueA > valueB ? -1 : valueA < valueB ? 1 : 0
    }
  })
  
  // 递归处理子节点
  sorted.forEach(node => {
    if (node.children && node.children.length > 0) {
      node.children = sortBookmarks(node.children, sortBy, sortOrder)
    }
  })
  
  return sorted
}
