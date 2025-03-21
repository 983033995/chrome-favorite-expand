/*
 * @FilePath: /chrome-favorite-expand/src/types/bookmark.ts
 * @Description: 书签数据类型定义
 */

/**
 * 书签数据模型
 */
export interface Bookmark {
  id: string; // 唯一标识符
  title: string; // 书签标题
  url: string; // 网址
  favicon?: string; // 网站图标URL
  description?: string; // 描述或摘要
  categoryId: string; // 所属分类ID
  tags: string[]; // 标签列表
  createdAt: number; // 创建时间
  updatedAt: number; // 最后更新时间
  lastVisited?: number; // 最后访问时间
  visitCount: number; // 访问次数
  aiGenerated?: {
    category?: string; // AI推荐分类
    tags?: string[]; // AI推荐标签
    summary?: string; // AI生成摘要
    confidence?: number; // 分类置信度
  };
}

/**
 * 分类数据模型
 */
export interface Category {
  id: string; // 唯一标识符
  name: string; // 分类名称
  parentId?: string; // 父分类ID（空表示顶级分类）
  color?: string; // 分类颜色
  icon?: string; // 分类图标
  order: number; // 排序位置
  createdAt: number; // 创建时间
  updatedAt: number; // 最后更新时间
  bookmarkCount: number; // 包含书签数量
  isAiGenerated: boolean; // 是否由AI生成
}

/**
 * 书签树数据结构
 */
export interface BookmarkTreeNode {
  id: string;
  parentId?: string;
  index?: number;
  title: string;
  url?: string;
  dateAdded?: number;
  dateGroupModified?: number;
  children?: BookmarkTreeNode[];
}

/**
 * 设置数据模型
 */
export interface BookmarkSettings {
  theme: {
    mode: 'light' | 'dark'; // light/dark
    primaryColor: string; // 主题色
    density: 'compact' | 'comfortable'; // 界面密度：compact/comfortable
  };
  ai: {
    provider: string; // 服务提供商: 'claude' | 'chatgpt' | 'openrouter' | 'siliconFlowAPI'
    apiKey: string; // API密钥（加密存储）
    autoClassify: boolean; // 是否自动分类
    scanInterval: number; // 扫描更新间隔（分钟）
  };
  sync: {
    enabled: boolean; // 是否启用同步
    interval: number; // 同步间隔（分钟）
    scope: string[]; // 同步范围
  };
  view: {
    defaultCategory: string; // 默认显示分类
    bookmarkDisplay: 'card' | 'list'; // 卡片/列表显示
  };
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: BookmarkSettings = {
  theme: {
    mode: 'light',
    primaryColor: '#165DFF',
    density: 'comfortable'
  },
  ai: {
    provider: 'openrouter',
    apiKey: '',
    autoClassify: false,
    scanInterval: 60
  },
  sync: {
    enabled: true,
    interval: 30,
    scope: ['all']
  },
  view: {
    defaultCategory: 'all',
    bookmarkDisplay: 'list'
  }
};
