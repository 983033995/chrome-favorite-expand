/**
 * AI服务
 * 提供AI相关功能，包括书签分类、内容摘要生成和标签推荐
 */
import axios from 'axios'
import { AIServiceParams, AIServiceResponse, Bookmark, Category } from '~/types'
import { storageService } from './storage'

// AI提供商的API端点
const API_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  claude: 'https://api.anthropic.com/v1/messages',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  sijiliu: 'https://api.liulingling.cn/api/openai/v1/chat/completions',
}

// 默认分类任务提示词
const CLASSIFY_PROMPT = `
分析以下网页信息，并将其分类到最适合的现有分类中。如果现有分类不适合，请推荐一个新的分类名称。
同时，提取5个或更少的关键词作为标签，并生成一个简短的内容摘要。

网页标题: {title}
网页URL: {url}

现有分类: {categories}

返回JSON格式如下:
{
  "category": "最适合的分类名称",
  "tags": ["标签1", "标签2", "标签3"],
  "summary": "简短的内容摘要（不超过100个字符）",
  "confidence": 0.8 // 置信度，0-1之间的数字
}
`

// OpenAI的模型映射
const OPENAI_MODELS = {
  classify: 'gpt-3.5-turbo-0125',
  summarize: 'gpt-3.5-turbo-0125',
  suggest_tags: 'gpt-3.5-turbo-0125',
}

// Claude的模型映射
const CLAUDE_MODELS = {
  classify: 'claude-3-haiku-20240307',
  summarize: 'claude-3-haiku-20240307',
  suggest_tags: 'claude-3-haiku-20240307',
}

/**
 * AI服务类
 */
class AIService {
  /**
   * 分析书签数据
   * @param params AI服务调用参数
   * @returns AI分析响应
   */
  async analyzeBookmark(params: AIServiceParams): Promise<AIServiceResponse> {
    const { provider, apiKey, bookmark, task = 'classify' } = params
    
    if (!apiKey) {
      return {
        success: false,
        error: '未提供API密钥，请在设置中配置AI服务',
      }
    }
    
    if (!bookmark) {
      return {
        success: false,
        error: '未提供书签数据',
      }
    }
    
    try {
      // 获取所有分类
      const categories = await storageService.getCategories()
      const categoryNames = categories
        .filter(cat => !cat.builtin) // 过滤掉内置分类
        .map(cat => cat.name)
        .join(', ')
      
      // 准备提示词
      let prompt = CLASSIFY_PROMPT
        .replace('{title}', bookmark.title)
        .replace('{url}', bookmark.url)
        .replace('{categories}', categoryNames || '尚无自定义分类')
      
      // 调用不同提供商的API
      switch (provider) {
        case 'openai':
          return await this.callOpenAI(apiKey, prompt, task, bookmark)
        case 'claude':
          return await this.callClaude(apiKey, prompt, task, bookmark)
        case 'openrouter':
          return await this.callOpenRouter(apiKey, prompt, task, bookmark)
        case 'sijiliu':
          return await this.callSiJiLiu(apiKey, prompt, task, bookmark)
        default:
          return {
            success: false,
            error: `不支持的AI服务提供商: ${provider}`,
          }
      }
    } catch (error) {
      console.error('AI分析书签失败:', error)
      return {
        success: false,
        error: `AI服务调用失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
  
  /**
   * 调用OpenAI API
   * @param apiKey API密钥
   * @param prompt 提示词
   * @param task 任务类型
   * @param bookmark 书签数据
   * @returns AI响应
   */
  private async callOpenAI(
    apiKey: string,
    prompt: string,
    task: string,
    bookmark: Bookmark
  ): Promise<AIServiceResponse> {
    const model = OPENAI_MODELS[task as keyof typeof OPENAI_MODELS] || OPENAI_MODELS.classify
    
    try {
      const response = await axios.post(
        API_ENDPOINTS.openai,
        {
          model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的网页分析和分类助手。你需要根据提供的网页信息，将其分类并提取关键信息。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      )
      
      const content = response.data.choices[0]?.message?.content
      
      if (!content) {
        return {
          success: false,
          error: '无法获取AI响应内容',
        }
      }
      
      try {
        const data = JSON.parse(content)
        return {
          success: true,
          data,
        }
      } catch (error) {
        return {
          success: false,
          error: '无法解析AI返回的JSON数据',
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: `OpenAI API错误 (${error.response?.status}): ${error.response?.data?.error?.message || error.message}`,
        }
      }
      throw error
    }
  }
  
  /**
   * 调用Claude API
   * @param apiKey API密钥
   * @param prompt 提示词
   * @param task 任务类型
   * @param bookmark 书签数据
   * @returns AI响应
   */
  private async callClaude(
    apiKey: string,
    prompt: string,
    task: string,
    bookmark: Bookmark
  ): Promise<AIServiceResponse> {
    const model = CLAUDE_MODELS[task as keyof typeof CLAUDE_MODELS] || CLAUDE_MODELS.classify
    
    try {
      const response = await axios.post(
        API_ENDPOINTS.claude,
        {
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
          system: '你是一个专业的网页分析和分类助手。你需要根据提供的网页信息，将其分类并提取关键信息。请以JSON格式返回。',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      )
      
      const content = response.data.content?.[0]?.text
      
      if (!content) {
        return {
          success: false,
          error: '无法获取Claude响应内容',
        }
      }
      
      try {
        // 尝试提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : content
        
        const data = JSON.parse(jsonStr)
        return {
          success: true,
          data,
        }
      } catch (error) {
        return {
          success: false,
          error: '无法解析Claude返回的JSON数据',
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: `Claude API错误 (${error.response?.status}): ${error.response?.data?.error?.message || error.message}`,
        }
      }
      throw error
    }
  }
  
  /**
   * 调用OpenRouter API
   * @param apiKey API密钥
   * @param prompt 提示词
   * @param task 任务类型
   * @param bookmark 书签数据
   * @returns AI响应
   */
  private async callOpenRouter(
    apiKey: string,
    prompt: string,
    task: string,
    bookmark: Bookmark
  ): Promise<AIServiceResponse> {
    try {
      const response = await axios.post(
        API_ENDPOINTS.openrouter,
        {
          model: 'openai/gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的网页分析和分类助手。你需要根据提供的网页信息，将其分类并提取关键信息。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://chrome-favorite-expand',
            'X-Title': 'Chrome书签助手',
          },
        }
      )
      
      const content = response.data.choices[0]?.message?.content
      
      if (!content) {
        return {
          success: false,
          error: '无法获取OpenRouter响应内容',
        }
      }
      
      try {
        const data = JSON.parse(content)
        return {
          success: true,
          data,
        }
      } catch (error) {
        return {
          success: false,
          error: '无法解析OpenRouter返回的JSON数据',
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: `OpenRouter API错误 (${error.response?.status}): ${error.response?.data?.error?.message || error.message}`,
        }
      }
      throw error
    }
  }
  
  /**
   * 调用硅基流动 API
   * @param apiKey API密钥
   * @param prompt 提示词
   * @param task 任务类型
   * @param bookmark 书签数据
   * @returns AI响应
   */
  private async callSiJiLiu(
    apiKey: string,
    prompt: string,
    task: string,
    bookmark: Bookmark
  ): Promise<AIServiceResponse> {
    try {
      const response = await axios.post(
        API_ENDPOINTS.sijiliu,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的网页分析和分类助手。你需要根据提供的网页信息，将其分类并提取关键信息。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      )
      
      const content = response.data.choices[0]?.message?.content
      
      if (!content) {
        return {
          success: false,
          error: '无法获取硅基流动响应内容',
        }
      }
      
      try {
        const data = JSON.parse(content)
        return {
          success: true,
          data,
        }
      } catch (error) {
        return {
          success: false,
          error: '无法解析硅基流动返回的JSON数据',
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: `硅基流动 API错误 (${error.response?.status}): ${error.response?.data?.error?.message || error.message}`,
        }
      }
      throw error
    }
  }
  
  /**
   * 验证AI服务API密钥
   * @param provider AI服务提供商
   * @param apiKey API密钥
   * @returns 是否有效
   */
  async verifyApiKey(provider: string, apiKey: string): Promise<boolean> {
    // 构造一个简单的测试查询
    const testParams: AIServiceParams = {
      provider,
      apiKey,
      bookmark: {
        id: 'test',
        title: 'Test Bookmark',
        url: 'https://example.com',
        categoryId: 'uncategorized',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        visitCount: 0,
      },
      task: 'classify',
    }
    
    try {
      const response = await this.analyzeBookmark(testParams)
      return response.success
    } catch (error) {
      console.error('验证API密钥失败:', error)
      return false
    }
  }
  
  /**
   * 从URL内容生成摘要
   * @param url 网页URL
   * @param apiKey API密钥
   * @param provider AI服务提供商
   * @returns 摘要文本
   */
  async generateSummaryFromUrl(
    url: string,
    apiKey: string,
    provider: string
  ): Promise<string> {
    try {
      // 尝试获取页面标题和内容
      const response = await fetch(url)
      const html = await response.text()
      
      // 提取页面标题和内容（简单实现）
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/)
      const title = titleMatch ? titleMatch[1] : ''
      
      // 提取页面文本内容（去除HTML标签）
      const textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000) // 限制文本长度
      
      // 构造摘要生成提示词
      const prompt = `
      生成这个网页内容的简短摘要（不超过100个字符）:
      
      标题: ${title}
      URL: ${url}
      
      内容摘要:
      ${textContent}
      `
      
      // 调用AI服务
      const params: AIServiceParams = {
        provider,
        apiKey,
        text: prompt,
        task: 'summarize',
      }
      
      const result = await this.analyzeText(params)
      
      if (result.success && result.data?.summary) {
        return result.data.summary
      }
      
      return '无法生成摘要'
    } catch (error) {
      console.error('从URL生成摘要失败:', error)
      return '无法生成摘要'
    }
  }
  
  /**
   * 分析文本
   * @param params AI服务调用参数
   * @returns AI分析响应
   */
  async analyzeText(params: AIServiceParams): Promise<AIServiceResponse> {
    const { provider, apiKey, text, task = 'summarize' } = params
    
    if (!apiKey) {
      return {
        success: false,
        error: '未提供API密钥',
      }
    }
    
    if (!text) {
      return {
        success: false,
        error: '未提供文本',
      }
    }
    
    try {
      // 调用不同提供商的API
      switch (provider) {
        case 'openai':
          return await this.callOpenAI(apiKey, text, task, {} as Bookmark)
        case 'claude':
          return await this.callClaude(apiKey, text, task, {} as Bookmark)
        case 'openrouter':
          return await this.callOpenRouter(apiKey, text, task, {} as Bookmark)
        case 'sijiliu':
          return await this.callSiJiLiu(apiKey, text, task, {} as Bookmark)
        default:
          return {
            success: false,
            error: `不支持的AI服务提供商: ${provider}`,
          }
      }
    } catch (error) {
      console.error('AI分析文本失败:', error)
      return {
        success: false,
        error: `AI服务调用失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}

// 导出AI服务单例
export const aiService = new AIService()
