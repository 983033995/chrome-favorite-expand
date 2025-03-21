/**
 * 项目类型定义
 */
import { FolderState } from '~/constants'

/**
 * 应用设置
 */
export interface AppSettings {
  theme: {
    mode: 'light' | 'dark'
    primaryColor: string
    density: 'compact' | 'comfortable'
  }
  ai: {
    provider: string
    apiKey: string
    autoClassify: boolean
    scanInterval: number
  }
  sync: {
    enabled: boolean
    interval: number
    scope: string[]
  }
  view: {
    defaultCategory: string
    bookmarkDisplay: 'card' | 'list'
    sidebarWidth: number
    showFavicon: boolean
    showDescription: boolean
  }
  startup: {
    autoLaunch: boolean
    showOnStartup: boolean
  }
}

/**
 * 书签数据
 */
export interface Bookmark {
  id: string
  title: string
  url: string
  favicon?: string
  description?: string
  categoryId: string
  tags: string[]
  createdAt: number
  updatedAt: number
  lastVisited?: number
  visitCount: number
  aiGenerated?: {
    category?: string
    tags?: string[]
    summary?: string
    confidence?: number
  }
  originalId?: string // 浏览器原始书签ID
  parentId?: string // 所属文件夹ID
  index?: number // 排序索引
}

/**
 * 增强型书签数据（用于展示）
 */
export interface EnhancedBookmark extends Bookmark {
  isFolder: boolean
  level: number // 树形结构层级
  folderState?: FolderState // 文件夹状态
  children?: EnhancedBookmark[] // 子书签
  path?: string[] // 所属路径
  formattedDate?: string // 格式化日期
  relativeTime?: string // 相对时间
}

/**
 * 分类数据
 */
export interface Category {
  id: string
  name: string
  parentId?: string
  color?: string
  icon?: string
  order: number
  createdAt: number
  updatedAt: number
  bookmarkCount: number
  isAiGenerated: boolean
  builtin?: boolean // 是否为内置分类
  children?: Category[] // 子分类
  level?: number // 层级（用于展示）
  folderState?: FolderState // 文件夹状态
}

/**
 * 标签数据
 */
export interface Tag {
  id: string
  name: string
  color?: string
  count: number
  createdAt: number
  updatedAt: number
  isAiGenerated: boolean
}

/**
 * 搜索参数
 */
export interface SearchParams {
  keyword?: string
  categoryId?: string
  tags?: string[]
  sortBy?: 'title' | 'dateAdded' | 'lastVisited' | 'url'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * AI服务接口参数
 */
export interface AIServiceParams {
  provider: string
  apiKey: string
  url?: string
  bookmark?: Bookmark
  text?: string
  task?: 'classify' | 'summarize' | 'suggest_tags'
}

/**
 * AI服务响应
 */
export interface AIServiceResponse {
  success: boolean
  data?: {
    category?: string
    tags?: string[]
    summary?: string
    confidence?: number
  }
  error?: string
}

/**
 * 消息接口
 */
export interface Message {
  type: string
  data?: any
}

/**
 * 浏览器原生书签节点
 */
export interface BrowserBookmarkNode {
  id: string
  parentId?: string
  index?: number
  url?: string
  title: string
  dateAdded?: number
  dateGroupModified?: number
  children?: BrowserBookmarkNode[]
}
