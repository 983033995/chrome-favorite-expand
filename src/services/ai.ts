/**
 * AI服务
 * 提供智能分析书签的能力
 */
import axios from 'axios'
import type { AIServiceParams, AIServiceResponse, Bookmark } from '~/types'

/**
 * AI服务类
 */
class AIService {
  /**
   * 分析书签
   * @param params AI服务参数
   */
  async analyzeBookmark(params: AIServiceParams): Promise<AIServiceResponse> {
    try {
      const { provider, apiKey, bookmark } = params
      
      if (!provider || !apiKey || !bookmark) {
        return {
          success: false,
          error: '参数不完整'
        }
      }
      
      // 根据不同供应商调用相应的API
      switch (provider) {
        case 'openai':
          return await this.callOpenAI(apiKey, bookmark)
        case 'claude':
          return await this.callClaude(apiKey, bookmark)
        case 'openrouter':
          return await this.callOpenRouter(apiKey, bookmark)
        case 'sijiliu':
          return await this.callSiJiLiu(apiKey, bookmark)
        default:
          return {
            success: false,
            error: `不支持的AI提供商: ${provider}`
          }
      }
    } catch (error) {
      console.error('AI分析失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
  
  /**
   * 调用OpenAI API
   */
  private async callOpenAI(apiKey: string, bookmark: Bookmark): Promise<AIServiceResponse> {
    try {
      const prompt = this.buildAnalysisPrompt(bookmark)
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '你是一位专业的网页分析助手，可以帮助分析网页内容，提供分类、标签和摘要。请以JSON格式回复。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      )
      
      const result = response.data.choices[0]?.message?.content
      
      if (!result) {
        throw new Error('API返回结果为空')
      }
      
      // 解析JSON结果
      const aiResult = JSON.parse(result)
      
      return {
        success: true,
        data: {
          category: aiResult.category,
          tags: aiResult.tags,
          summary: aiResult.summary,
          confidence: aiResult.confidence
        }
      }
    } catch (error) {
      console.error('OpenAI调用失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
  
  /**
   * 调用Claude API
   */
  private async callClaude(apiKey: string, bookmark: Bookmark): Promise<AIServiceResponse> {
    try {
      const prompt = this.buildAnalysisPrompt(bookmark)
      
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          system: '你是一位专业的网页分析助手，可以帮助分析网页内容，提供分类、标签和摘要。请以JSON格式回复。'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      )
      
      const result = response.data.content[0]?.text
      
      if (!result) {
        throw new Error('API返回结果为空')
      }
      
      // 提取JSON部分
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法从响应中提取JSON')
      }
      
      // 解析JSON结果
      const aiResult = JSON.parse(jsonMatch[0])
      
      return {
        success: true,
        data: {
          category: aiResult.category,
          tags: aiResult.tags,
          summary: aiResult.summary,
          confidence: aiResult.confidence
        }
      }
    } catch (error) {
      console.error('Claude调用失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
  
  /**
   * 调用OpenRouter API
   */
  private async callOpenRouter(apiKey: string, bookmark: Bookmark): Promise<AIServiceResponse> {
    try {
      const prompt = this.buildAnalysisPrompt(bookmark)
      
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '你是一位专业的网页分析助手，可以帮助分析网页内容，提供分类、标签和摘要。请以JSON格式回复。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://bookmark-assistant.extension'
          }
        }
      )
      
      const result = response.data.choices[0]?.message?.content
      
      if (!result) {
        throw new Error('API返回结果为空')
      }
      
      // 解析JSON结果
      const aiResult = JSON.parse(result)
      
      return {
        success: true,
        data: {
          category: aiResult.category,
          tags: aiResult.tags,
          summary: aiResult.summary,
          confidence: aiResult.confidence
        }
      }
    } catch (error) {
      console.error('OpenRouter调用失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
  
  /**
   * 调用硅基流动API
   */
  private async callSiJiLiu(apiKey: string, bookmark: Bookmark): Promise<AIServiceResponse> {
    try {
      const prompt = this.buildAnalysisPrompt(bookmark)
      
      const response = await axios.post(
        'https://api.flow.qq.com/v1/chat/completions',
        {
          model: 'creative',  // 硅基流动的模型名称
          messages: [
            {
              role: 'system',
              content: '你是一位专业的网页分析助手，可以帮助分析网页内容，提供分类、标签和摘要。请以JSON格式回复。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      )
      
      const result = response.data.choices[0]?.message?.content
      
      if (!result) {
        throw new Error('API返回结果为空')
      }
      
      // 提取JSON部分
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法从响应中提取JSON')
      }
      
      // 解析JSON结果
      const aiResult = JSON.parse(jsonMatch[0])
      
      return {
        success: true,
        data: {
          category: aiResult.category,
          tags: aiResult.tags,
          summary: aiResult.summary,
          confidence: aiResult.confidence
        }
      }
    } catch (error) {
      console.error('硅基流动调用失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 构建分析提示词
   * @param bookmark 书签对象
   */
  private buildAnalysisPrompt(bookmark: Bookmark): string {
    return `请分析以下网页信息，并以JSON格式提供分类、标签和摘要:

网页标题: ${bookmark.title}
网页URL: ${bookmark.url}

请返回以下JSON格式:
{
  "category": "最合适的单个分类名称",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "summary": "网页内容的简短摘要，不超过200字",
  "confidence": 0.85 // 分类置信度，0-1之间的小数
}

要求:
1. 分类应该是一个简短的名称，如"技术"、"学习资源"、"新闻"等
2. 标签应该是相关关键词，至少提供3个，最多5个
3. 摘要应清晰简洁，概括网页主要内容
4. 仅返回JSON格式，不要添加其他文字

如果缺乏足够信息，请基于网址和标题尽量推测分类和标签，并在摘要中说明是基于有限信息的推测。`;
  }

  /**
   * 测试AI连接
   * @param provider 提供商
   * @param apiKey API密钥
   */
  async testConnection(provider: string, apiKey: string): Promise<{success: boolean, message: string}> {
    try {
      // 使用简单的测试书签
      const testBookmark: Bookmark = {
        id: 'test',
        title: 'Google',
        url: 'https://www.google.com',
        categoryId: 'uncategorized',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        visitCount: 0
      }
      
      const result = await this.analyzeBookmark({
        provider,
        apiKey,
        bookmark: testBookmark
      })
      
      if (result.success) {
        return {
          success: true,
          message: `连接成功，已完成测试分析`
        }
      } else {
        return {
          success: false,
          message: `连接失败: ${result.error}`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `测试连接出错: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }
}

// 导出AI服务单例
export const aiService = new AIService()
