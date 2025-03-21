<template>
  <div class="category-tree">
    <!-- 加载中 -->
    <div v-if="isLoading" class="category-tree__loading">
      <Icon name="sync" spin size="24" />
      <span>加载中...</span>
    </div>
    
    <!-- 分类树 -->
    <template v-else>
      <!-- 内置快捷分类 -->
      <div class="category-tree__built-in">
        <div 
          v-for="category in builtInCategories"
          :key="category.id"
          :class="[
            'category-tree__node', 
            { 'category-tree__node--active': selectedCategoryId === category.id }
          ]"
          @click="handleSelectCategory(category.id)"
          @contextmenu.prevent="openContextMenu($event, category)"
        >
          <div class="category-tree__node-inner">
            <div class="category-tree__node-icon">
              <Icon :name="category.icon || 'folder'" />
            </div>
            <div class="category-tree__node-content">
              <div class="category-tree__node-title">{{ category.name }}</div>
              <div v-if="category.bookmarkCount > 0" class="category-tree__node-count">
                {{ category.bookmarkCount }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 自定义分类分割线 -->
      <div class="category-tree__divider">
        <span>自定义分类</span>
      </div>
      
      <!-- 自定义分类 -->
      <div class="category-tree__custom">
        <!-- 无自定义分类时显示 -->
        <div v-if="customCategories.length === 0" class="category-tree__empty">
          <p>暂无自定义分类</p>
          <a-button type="primary" size="small" @click="handleAddCategory">
            <Icon name="plus" />
            添加分类
          </a-button>
        </div>
        
        <!-- 有自定义分类时显示 -->
        <div v-else class="category-tree__list">
          <div 
            v-for="category in customCategories"
            :key="category.id"
            :class="[
              'category-tree__node', 
              { 'category-tree__node--active': selectedCategoryId === category.id }
            ]"
          >
            <div
              class="category-tree__node-inner"
              @click="handleSelectCategory(category.id)"
              @contextmenu.prevent="openContextMenu($event, category)"
            >
              <!-- 折叠/展开图标 -->
              <div 
                v-if="category.children && category.children.length > 0"
                :class="[
                  'category-tree__node-expand',
                  { 'expanded': category.folderState === 'expanded' }
                ]"
                @click.stop="toggleFolder(category)"
              >
                <Icon name="right" />
              </div>
              <div v-else class="category-tree__node-expand-placeholder"></div>
              
              <!-- 分类图标 -->
              <div class="category-tree__node-icon">
                <Icon :name="category.folderState === 'expanded' ? 'folder-open' : 'folder'" />
              </div>
              
              <!-- 分类内容 -->
              <div class="category-tree__node-content">
                <div class="category-tree__node-title">{{ category.name }}</div>
                <div v-if="category.bookmarkCount > 0" class="category-tree__node-count">
                  {{ category.bookmarkCount }}
                </div>
              </div>
            </div>
            
            <!-- 子分类 -->
            <div 
              v-if="category.children && category.children.length > 0"
              :class="[
                'category-tree__children',
                { 'category-tree__children--expanded': category.folderState === 'expanded' }
              ]"
            >
              <div 
                v-for="child in category.children"
                :key="child.id"
                :class="[
                  'category-tree__node', 
                  { 'category-tree__node--active': selectedCategoryId === child.id }
                ]"
              >
                <div
                  class="category-tree__node-inner"
                  @click="handleSelectCategory(child.id)"
                  @contextmenu.prevent="openContextMenu($event, child)"
                >
                  <!-- 子分类递进 -->
                  <div class="category-tree__node-indent"></div>
                  
                  <!-- 子分类图标 -->
                  <div class="category-tree__node-icon">
                    <Icon :name="child.folderState === 'expanded' ? 'folder-open' : 'folder'" />
                  </div>
                  
                  <!-- 子分类内容 -->
                  <div class="category-tree__node-content">
                    <div class="category-tree__node-title">{{ child.name }}</div>
                    <div v-if="child.bookmarkCount > 0" class="category-tree__node-count">
                      {{ child.bookmarkCount }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <!-- 添加分类对话框 -->
    <a-modal
      v-model:visible="showAddDialog"
      title="添加分类"
      @ok="saveCategory"
      :ok-loading="isSaving"
    >
      <a-form :model="categoryForm" layout="vertical">
        <a-form-item label="分类名称" required>
          <a-input v-model="categoryForm.name" placeholder="请输入分类名称" />
        </a-form-item>
        <a-form-item label="父分类">
          <a-select v-model="categoryForm.parentId" placeholder="选择父分类（可选）">
            <a-option value="">无（顶级分类）</a-option>
            <a-option 
              v-for="category in nonBuiltInCategories" 
              :key="category.id" 
              :value="category.id"
              :disabled="category.level > 0"
            >
              {{ category.name }}
            </a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useBookmarkStore, useSidebarStore, useNotificationStore } from '~/stores'
import { Category, FolderState } from '~/types'
import Icon from '../common/Icon.vue'

// 定义属性
const props = defineProps({
  // 是否加载中
  isLoading: {
    type: Boolean,
    default: false
  }
})

// 定义事件
const emit = defineEmits(['select', 'add', 'edit', 'delete'])

// Store
const bookmarkStore = useBookmarkStore()
const sidebarStore = useSidebarStore()
const notificationStore = useNotificationStore()

// 计算选中的分类ID
const selectedCategoryId = computed(() => {
  return sidebarStore.selectedCategoryId
})

// 计算内置分类
const builtInCategories = computed(() => {
  return bookmarkStore.categories.filter(c => c.builtin)
})

// 计算自定义分类（顶级）
const customCategories = computed(() => {
  return bookmarkStore.categoryTree.filter(c => !c.builtin)
})

// 计算非内置分类（用于父分类选择）
const nonBuiltInCategories = computed(() => {
  return bookmarkStore.categories.filter(c => !c.builtin)
})

// 添加分类状态
const showAddDialog = ref(false)
const isSaving = ref(false)
const categoryForm = reactive({
  name: '',
  parentId: ''
})

// 选择分类
const handleSelectCategory = (categoryId: string) => {
  sidebarStore.selectCategory(categoryId)
  emit('select', categoryId)
}

// 切换文件夹折叠状态
const toggleFolder = (category: Category) => {
  if (!category.children || category.children.length === 0) {
    return
  }
  
  const newState = category.folderState === FolderState.EXPANDED 
    ? FolderState.COLLAPSED 
    : FolderState.EXPANDED
  
  bookmarkStore.updateCategoryFolderState(category.id, newState)
}

// 打开右键菜单
const openContextMenu = (event: MouseEvent, category: Category) => {
  // 内置分类不允许编辑和删除
  if (category.builtin) {
    return
  }
  
  sidebarStore.showContextMenu(event, 'category', category)
}

// 显示添加分类对话框
const handleAddCategory = () => {
  categoryForm.name = ''
  categoryForm.parentId = ''
  showAddDialog.value = true
}

// 保存分类
const saveCategory = async () => {
  if (!categoryForm.name) {
    notificationStore.warning('验证失败', '请输入分类名称')
    return
  }
  
  isSaving.value = true
  
  try {
    const newCategory = await bookmarkStore.addCategory({
      name: categoryForm.name,
      parentId: categoryForm.parentId || undefined
    })
    
    if (newCategory) {
      notificationStore.success('添加成功', `分类"${newCategory.name}"已添加`)
      showAddDialog.value = false
      
      // 发送添加事件
      emit('add', newCategory)
    } else {
      notificationStore.error('添加失败', '无法添加分类，请稍后重试')
    }
  } catch (error) {
    notificationStore.error('添加失败', `${error}`)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.category-tree {
  padding: 8px 0;
}

/* 加载状态 */
.category-tree__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: var(--text-secondary);
}

.category-tree__loading span {
  margin-left: 8px;
}

/* 内置分类 */
.category-tree__built-in {
  margin-bottom: 12px;
}

/* 分割线 */
.category-tree__divider {
  padding: 0 16px;
  margin: 8px 0;
  position: relative;
  height: 20px;
  display: flex;
  align-items: center;
}

.category-tree__divider::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 16px;
  right: 16px;
  height: 1px;
  background-color: var(--divider-color);
  z-index: 1;
}

.category-tree__divider span {
  position: relative;
  z-index: 2;
  background-color: var(--bg-white);
  padding: 0 8px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 8px;
}

/* 空状态 */
.category-tree__empty {
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--text-secondary);
}

.category-tree__empty p {
  margin-bottom: 8px;
  font-size: 13px;
}

/* 分类节点 */
.category-tree__node {
  padding: 0;
  margin: 0;
  position: relative;
}

.category-tree__node-inner {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: var(--border-radius);
  transition: var(--transition-normal);
}

.category-tree__node-inner:hover {
  background-color: var(--bg-gray);
}

.category-tree__node--active .category-tree__node-inner {
  background-color: var(--primary-bg);
  color: var(--primary-color);
}

.category-tree__node-expand,
.category-tree__node-expand-placeholder {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  transition: transform 0.2s;
}

.category-tree__node-expand.expanded {
  transform: rotate(90deg);
}

.category-tree__node-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  color: var(--text-secondary);
}

.category-tree__node--active .category-tree__node-icon {
  color: var(--primary-color);
}

.category-tree__node-content {
  flex: 1;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.category-tree__node-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-tree__node-count {
  margin-left: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  background-color: var(--bg-gray);
  border-radius: 10px;
  padding: 0 6px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-tree__node--active .category-tree__node-count {
  background-color: var(--primary-bg);
  color: var(--primary-color);
}

/* 子分类 */
.category-tree__children {
  height: 0;
  overflow: hidden;
  transition: height 0.3s;
}

.category-tree__children--expanded {
  height: auto;
}

.category-tree__node-indent {
  width: 16px;
  margin-right: 4px;
}

/* 暗色主题 */
body[theme-mode="dark"] .category-tree__divider::before {
  background-color: var(--divider-color);
}

body[theme-mode="dark"] .category-tree__divider span {
  background-color: var(--bg-white);
}

body[theme-mode="dark"] .category-tree__node-inner:hover {
  background-color: var(--bg-gray);
}
</style>
