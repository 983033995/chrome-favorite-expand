<template>
  <i
    :class="[
      'icon-component',
      `icon-${name}`,
      { 'icon-spin': spin },
      className
    ]"
    :style="{
      color,
      fontSize: size ? `${size}px` : undefined,
      ...customStyle
    }"
  >
    <slot></slot>
  </i>
</template>

<script setup lang="ts">
defineProps({
  // 图标名称
  name: {
    type: String,
    required: true
  },
  // 图标颜色
  color: {
    type: String,
    default: ''
  },
  // 图标尺寸
  size: {
    type: [Number, String],
    default: ''
  },
  // 是否旋转
  spin: {
    type: Boolean,
    default: false
  },
  // 自定义样式类
  className: {
    type: String,
    default: ''
  },
  // 自定义样式
  customStyle: {
    type: Object,
    default: () => ({})
  }
})
</script>

<style scoped>
.icon-component {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 旋转动画 */
.icon-spin {
  animation: icon-spin 1s infinite linear;
}

@keyframes icon-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 常用图标 */
.icon-bookmark::before {
  content: "🔖";
}

.icon-folder::before {
  content: "📁";
}

.icon-folder-open::before {
  content: "📂";
}

.icon-tag::before {
  content: "🏷️";
}

.icon-star::before {
  content: "⭐";
}

.icon-clock::before {
  content: "🕒";
}

.icon-search::before {
  content: "🔍";
}

.icon-settings::before {
  content: "⚙️";
}

.icon-plus::before {
  content: "➕";
}

.icon-minus::before {
  content: "➖";
}

.icon-edit::before {
  content: "✏️";
}

.icon-delete::before {
  content: "🗑️";
}

.icon-close::before {
  content: "❌";
}

.icon-check::before {
  content: "✅";
}

.icon-warning::before {
  content: "⚠️";
}

.icon-info::before {
  content: "ℹ️";
}

.icon-error::before {
  content: "❗";
}

.icon-success::before {
  content: "✅";
}

.icon-left::before {
  content: "⬅️";
}

.icon-right::before {
  content: "➡️";
}

.icon-up::before {
  content: "⬆️";
}

.icon-down::before {
  content: "⬇️";
}

.icon-menu::before {
  content: "☰";
}

.icon-link::before {
  content: "🔗";
}

.icon-refresh::before {
  content: "🔄";
}

.icon-sync::before {
  content: "🔄";
}

.icon-ai::before {
  content: "🤖";
}

.icon-help::before {
  content: "❓";
}

.icon-expand::before {
  content: "📑";
}

.icon-collapse::before {
  content: "📔";
}

.icon-filter::before {
  content: "🔍";
}

.icon-sort::before {
  content: "↕️";
}

.icon-export::before {
  content: "📤";
}

.icon-import::before {
  content: "📥";
}

.icon-visible::before {
  content: "👁️";
}

.icon-hidden::before {
  content: "👁️‍🗨️";
}

.icon-move::before {
  content: "↔️";
}

.icon-copy::before {
  content: "📋";
}

.icon-dark::before {
  content: "🌙";
}

.icon-light::before {
  content: "☀️";
}

.icon-view-grid::before {
  content: "🔲";
}

.icon-view-list::before {
  content: "📃";
}
</style>
