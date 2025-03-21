/**
 * 侧边栏存储
 * 管理侧边栏的状态和行为
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { SidebarPosition, SidebarState } from '~/constants'
import { messageService } from '~/services'

export const useSidebarStore = defineStore('sidebar', () => {
  // 侧边栏状态
  const state = ref<SidebarState>(SidebarState.HIDDEN)
  const position = ref<SidebarPosition>(SidebarPosition.RIGHT)
  const isDragging = ref<boolean>(false)
  const width = ref<number>(320)
  
  // 当前选中项
  const selectedCategoryId = ref<string>('all')
  const selectedBookmarkId = ref<string | null>(null)
  
  // 右键菜单状态
  const contextMenu = ref<{
    visible: boolean
    x: number
    y: number
    type: 'bookmark' | 'category' | 'tag' | null
    target: any
  }>({
    visible: false,
    x: 0,
    y: 0,
    type: null,
    target: null,
  })
  
  // 显示/隐藏侧边栏
  function toggleSidebar() {
    state.value = state.value === SidebarState.HIDDEN 
      ? SidebarState.EXPANDED 
      : SidebarState.HIDDEN
    
    // 更新页面样式
    updateBodyStyle()
    
    // 发送状态变更消息
    messageService.send('sidebar-toggled', { state: state.value })
  }
  
  // 展开侧边栏
  function expandSidebar() {
    if (state.value === SidebarState.HIDDEN) {
      state.value = SidebarState.EXPANDED
      updateBodyStyle()
      messageService.send('sidebar-expanded')
    }
  }
  
  // 收起侧边栏
  function collapseSidebar() {
    if (state.value !== SidebarState.HIDDEN) {
      state.value = SidebarState.HIDDEN
      updateBodyStyle()
      messageService.send('sidebar-collapsed')
    }
  }
  
  // 切换侧边栏位置
  function togglePosition() {
    position.value = position.value === SidebarPosition.LEFT
      ? SidebarPosition.RIGHT
      : SidebarPosition.LEFT
    
    updateBodyStyle()
    
    // 保存位置设置
    localStorage.setItem('sidebar-position', position.value)
    
    // 发送位置变更消息
    messageService.send('sidebar-position-changed', { position: position.value })
  }
  
  // 设置侧边栏宽度
  function setWidth(newWidth: number) {
    // 限制宽度范围
    const limitedWidth = Math.max(250, Math.min(500, newWidth))
    width.value = limitedWidth
    
    // 保存宽度设置
    localStorage.setItem('sidebar-width', String(limitedWidth))
    
    // 更新CSS变量
    document.documentElement.style.setProperty('--sidebar-width', `${limitedWidth}px`)
    
    // 发送宽度变更消息
    messageService.send('sidebar-width-changed', { width: limitedWidth })
  }
  
  // 开始拖拽
  function startDrag() {
    isDragging.value = true
    document.body.classList.add('sidebar-dragging')
  }
  
  // 结束拖拽
  function endDrag() {
    isDragging.value = false
    document.body.classList.remove('sidebar-dragging')
  }
  
  // 更新页面样式，处理侧边栏与页面内容的关系
  function updateBodyStyle() {
    const bodyEl = document.body
    
    // 重置样式
    bodyEl.classList.remove('sidebar-open-left', 'sidebar-open-right')
    
    if (state.value === SidebarState.EXPANDED) {
      // 根据位置添加对应类名
      if (position.value === SidebarPosition.LEFT) {
        bodyEl.classList.add('sidebar-open-left')
      } else {
        bodyEl.classList.add('sidebar-open-right')
      }
    }
  }
  
  // 选择分类
  function selectCategory(categoryId: string) {
    selectedCategoryId.value = categoryId
    
    // 如果选择了分类，取消书签选择
    selectedBookmarkId.value = null
    
    // 关闭右键菜单
    closeContextMenu()
    
    // 发送选择变更消息
    messageService.send('category-selected', { categoryId })
  }
  
  // 选择书签
  function selectBookmark(bookmarkId: string | null) {
    selectedBookmarkId.value = bookmarkId
    
    // 关闭右键菜单
    closeContextMenu()
    
    if (bookmarkId) {
      // 发送选择变更消息
      messageService.send('bookmark-selected', { bookmarkId })
    }
  }
  
  // 显示右键菜单
  function showContextMenu(
    event: MouseEvent, 
    type: 'bookmark' | 'category' | 'tag', 
    target: any
  ) {
    // 阻止默认右键菜单
    event.preventDefault()
    
    // 设置右键菜单状态
    contextMenu.value = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      type,
      target,
    }
    
    // 添加全局点击事件监听器，用于关闭菜单
    setTimeout(() => {
      document.addEventListener('click', closeContextMenuOnClick, { once: true })
    }, 0)
  }
  
  // 关闭右键菜单
  function closeContextMenu() {
    contextMenu.value.visible = false
    contextMenu.value.target = null
    
    // 移除全局点击事件监听器
    document.removeEventListener('click', closeContextMenuOnClick)
  }
  
  // 点击其他区域关闭右键菜单的处理函数
  function closeContextMenuOnClick(event: MouseEvent) {
    // 检查点击是否在菜单外部
    const menuElement = document.querySelector('.context-menu')
    if (menuElement && !menuElement.contains(event.target as Node)) {
      closeContextMenu()
    } else {
      // 如果点击在菜单内部，继续监听下一次点击
      document.addEventListener('click', closeContextMenuOnClick, { once: true })
    }
  }
  
  // 初始化
  function initialize() {
    // 从本地存储加载位置设置
    const savedPosition = localStorage.getItem('sidebar-position')
    if (savedPosition === SidebarPosition.LEFT || savedPosition === SidebarPosition.RIGHT) {
      position.value = savedPosition
    }
    
    // 从本地存储加载宽度设置
    const savedWidth = localStorage.getItem('sidebar-width')
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10)
      if (!isNaN(parsedWidth) && parsedWidth >= 250 && parsedWidth <= 500) {
        width.value = parsedWidth
        // 更新CSS变量
        document.documentElement.style.setProperty('--sidebar-width', `${parsedWidth}px`)
      }
    }
    
    // 从本地存储加载选中分类
    const savedCategoryId = localStorage.getItem('selected-category-id')
    if (savedCategoryId) {
      selectedCategoryId.value = savedCategoryId
    }
    
    // 监听键盘事件
    document.addEventListener('keydown', handleKeyDown)
    
    // 添加窗口大小变化监听
    window.addEventListener('resize', handleWindowResize)
  }
  
  // 处理键盘快捷键
  function handleKeyDown(event: KeyboardEvent) {
    // Alt+B 切换侧边栏
    if (event.altKey && event.key === 'b') {
      event.preventDefault()
      toggleSidebar()
    }
    
    // Esc 关闭右键菜单或侧边栏
    if (event.key === 'Escape') {
      if (contextMenu.value.visible) {
        closeContextMenu()
      } else if (state.value !== SidebarState.HIDDEN) {
        collapseSidebar()
      }
    }
  }
  
  // 处理窗口大小变化
  function handleWindowResize() {
    // 在窄屏幕上自动关闭侧边栏
    if (window.innerWidth < 768 && state.value !== SidebarState.HIDDEN) {
      collapseSidebar()
    }
  }
  
  // 清理
  function cleanup() {
    document.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('resize', handleWindowResize)
    document.removeEventListener('click', closeContextMenuOnClick)
  }
  
  return {
    // 状态
    state,
    position,
    isDragging,
    width,
    selectedCategoryId,
    selectedBookmarkId,
    contextMenu,
    
    // 方法
    toggleSidebar,
    expandSidebar,
    collapseSidebar,
    togglePosition,
    setWidth,
    startDrag,
    endDrag,
    selectCategory,
    selectBookmark,
    showContextMenu,
    closeContextMenu,
    initialize,
    cleanup,
  }
})
