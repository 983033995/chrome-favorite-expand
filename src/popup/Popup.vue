<!--
 * @FilePath: /chrome-favorite-expand/src/popup/Popup.vue
 * @Description:
-->
<script setup lang="ts">
import { storageDemo } from '~/logic/storage'
function openOptionsPage() {
  browser.runtime.openOptionsPage()
}
const size = ref({
  width: '0px',
  height: '0px',
})
browser.storage.local.get('commonData').then((data) => {
  console.log('-----popup--', data)
  const { commonData: { width, height } } = data
  size.value = {
    width: `${width}px`,
    height: `${height}px`,
  }
})
browser.bookmarks.getTree().then((data) => {
  console.log('----tree', data)
})
</script>

<template>
  <main class="w-[400px] h-[600px] p-[24px] text-center text-gray-700 popup-content">
    <Logo />
    <div>Popup</div>
    <SharedSubtitle />

    <button class="btn mt-2" @click="openOptionsPage">
      Open Options
    </button>
    <div class="mt-2">
      <span class="opacity-50">Storage:</span> {{ storageDemo }}
    </div>
    <a-button type="primary">
      Open Drawer
    </a-button>
  </main>
</template>

<style lang="scss" scoped>
</style>
