/*
 * @FilePath: /chrome-favorite-expand/src/background/main.ts
 * @Description:
 */
import { onMessage, sendMessage } from 'webext-bridge/background'
import type { Tabs } from 'webextension-polyfill'

// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
  // load latest content script
  import('./contentScriptHMR')
}

browser.runtime.onInstalled.addListener((): void => {
  console.log('Extension installed')
})

let previousTabId = 0

// 通信示例：从后台页面发送上一个选项卡标题
// 有关类型声明，请参见shim.dts
browser.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!previousTabId) {
    previousTabId = tabId
    return
  }

  let tab: Tabs.Tab

  try {
    tab = await browser.tabs.get(previousTabId)
    previousTabId = tabId
  }
  catch {
    return
  }

  console.log('previous tab', tab)
  sendMessage('tab-prev', { title: tab.title }, { context: 'content-script', tabId })
})

onMessage('get-current-tab', async () => {
  try {
    const tab = await browser.tabs.get(previousTabId)
    return {
      title: tab?.title,
    }
  }
  catch {
    return {
      title: undefined,
    }
  }
})
// browser.tabs.query({ active: true, currentWindow: true }).then((tabs: Expand<Tabs.Tab>[]) => {
//   browser.tabs.executeScript(tabs[0].id, {
//     code: 'var width = window.innerWidth; var height = window.innerHeight;',
//   }, (res) => {
//     console.log('-----res', res)
//   })
//   browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.cmd === 'get_size') {
//       sendResponse({
//         width,
//         height,
//       })
//     }
//   })
// })
// 接收内容脚本发送的宽高消息
browser.runtime.onMessage.addListener((message) => {
  console.log('-----message', message)
  if (message.width && message.height) {
    const width = message.width
    const height = message.height
    console.log(`宽:${width}`, `高:${height}`)
    browser.storage.local.set({
      commonData: {
        width,
        height,
      },
    })
  }
})
