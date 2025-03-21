/**
 * 日期格式化工具函数
 * @param date 日期对象或日期字符串
 * @param format 格式化模式，例如 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(d.getTime())) {
    console.error('Invalid date provided to formatDate')
    return 'Invalid Date'
  }

  const padZero = (num: number): string => {
    return num < 10 ? `0${num}` : `${num}`
  }

  const year = d.getFullYear()
  const month = padZero(d.getMonth() + 1)
  const day = padZero(d.getDate())
  const hours = padZero(d.getHours())
  const minutes = padZero(d.getMinutes())
  const seconds = padZero(d.getSeconds())

  return format
    .replace('YYYY', `${year}`)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 获取相对时间描述
 * @param date 日期对象或日期字符串
 * @param locale 本地化设置，默认为'zh-CN'
 * @returns 相对时间描述
 */
export function getRelativeTimeDescription(date: Date | string, locale: string = 'zh-CN'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  
  if (isNaN(d.getTime())) {
    console.error('Invalid date provided to getRelativeTimeDescription')
    return 'Invalid Date'
  }

  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)
  
  // 1分钟内
  if (diffInSeconds < 60) {
    return locale === 'zh-CN' ? '刚刚' : 'just now'
  }
  
  // 1小时内
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return locale === 'zh-CN' ? `${minutes}分钟前` : `${minutes} minutes ago`
  }
  
  // 24小时内
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return locale === 'zh-CN' ? `${hours}小时前` : `${hours} hours ago`
  }
  
  // 30天内
  if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return locale === 'zh-CN' ? `${days}天前` : `${days} days ago`
  }
  
  // 12个月内
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000)
    return locale === 'zh-CN' ? `${months}个月前` : `${months} months ago`
  }
  
  // 超过1年
  const years = Math.floor(diffInSeconds / 31536000)
  return locale === 'zh-CN' ? `${years}年前` : `${years} years ago`
}
