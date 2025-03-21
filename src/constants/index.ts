/**
 * 项目常量定义
 */

// 插件名称
export const APP_NAME = '智能书签助手'

// 存储键名
export const STORAGE_KEYS = {
  SETTINGS: 'bookmark_assistant_settings', // 设置
  BOOKMARKS: 'bookmark_assistant_bookmarks', // 书签数据
  CATEGORIES: 'bookmark_assistant_categories', // 分类数据
  TAGS: 'bookmark_assistant_tags', // 标签数据
  FAVORITES: 'bookmark_assistant_favorites', // 收藏夹
  LAST_SYNC: 'bookmark_assistant_last_sync', // 上次同步时间
}

// 默认设置
export const DEFAULT_SETTINGS = {
  theme: {
    mode: 'light', // light/dark
    primaryColor: '#2B6DE5', // 主题色
    density: 'comfortable', // 界面密度: compact/comfortable
  },
  ai: {
    provider: 'openai', // 服务提供商
    apiKey: '', // API密钥
    autoClassify: true, // 是否自动分类
    scanInterval: 60, // 扫描更新间隔(分钟)
  },
  sync: {
    enabled: true, // 是否启用同步
    interval: 5, // 同步间隔(分钟)
    scope: ['all'], // 同步范围
  },
  view: {
    defaultCategory: 'all', // 默认显示分类
    bookmarkDisplay: 'card', // 显示模式: card/list
    sidebarWidth: 320, // 侧边栏宽度
    showFavicon: true, // 显示网站图标
    showDescription: true, // 显示描述
  },
  startup: {
    autoLaunch: true, // 自动启动
    showOnStartup: true, // 启动时显示
  },
}

// AI服务提供商
export const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Claude' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'sijiliu', label: '硅基流动' },
]

// 书签排序方式
export const SORT_OPTIONS = [
  { value: 'title', label: '按标题' },
  { value: 'dateAdded', label: '按添加时间' },
  { value: 'lastVisited', label: '按访问时间' },
  { value: 'url', label: '按网址' },
]

// 默认书签分类
export const DEFAULT_CATEGORIES = [
  { id: 'all', name: '所有书签', icon: 'bookmark', builtin: true },
  { id: 'frequent', name: '常用书签', icon: 'star', builtin: true },
  { id: 'recent', name: '最近添加', icon: 'clock', builtin: true },
  { id: 'uncategorized', name: '未分类', icon: 'folder', builtin: true },
]

// 侧边栏状态
export enum SidebarState {
  HIDDEN = 'hidden',
  COLLAPSED = 'collapsed',
  EXPANDED = 'expanded',
}

// 侧边栏位置
export enum SidebarPosition {
  LEFT = 'left',
  RIGHT = 'right',
}

// 文件夹状态
export enum FolderState {
  EXPANDED = 'expanded',
  COLLAPSED = 'collapsed',
}

// 消息类型
export enum MessageType {
  TOGGLE_SIDEBAR = 'toggle_sidebar',
  SYNC_BOOKMARKS = 'sync_bookmarks',
  UPDATE_SETTINGS = 'update_settings',
  GET_SETTINGS = 'get_settings',
  ANALYZE_BOOKMARK = 'analyze_bookmark',
}
