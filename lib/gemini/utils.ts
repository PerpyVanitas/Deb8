import { google } from '@ai-sdk/google'
import { generateText, streamText } from 'ai'

export function isGeminiQuotaError(error: any) {
  const message = typeof error?.message === 'string' ? error.message : ''
  return [
    'generate_content_free_tier_input_token_count',
    'generate_content_free_tier_requests',
    'quota exceeded',
    'quota',
    'limit: 0'
  ].some((fragment) => message.toLowerCase().includes(fragment))
}

function normalizeModelName(model: any) {
  if (!model) return ''
  if (typeof model === 'string') return model.toLowerCase()
  if (typeof model === 'object') {
    const raw = model.id || model.name || model.toString()
    return String(raw).toLowerCase()
  }
  return String(model).toLowerCase()
}

function getFallbackModels(modelName: string) {
  if (modelName.includes('gemini-2.0-flash') && !modelName.includes('flash-lite')) {
    return [google('gemini-2.0-flash-lite'), google('gemini-2.0-pro')]
  }

  if (modelName.includes('flash-lite')) {
    return [google('gemini-2.0-pro'), google('gemini-2.0')]
  }

  if (modelName.includes('gemini-2.0-pro')) {
    return [google('gemini-2.0')]
  }

  return []
}

async function runWithFallback(
  options: any,
  action: (opts: any) => Promise<any>,
  actionName: string
) {
  const modelName = normalizeModelName(options.model)

  try {
    return await action(options)
  } catch (error: any) {
    if (!isGeminiQuotaError(error)) {
      throw error
    }

    const fallbackModels = getFallbackModels(modelName)
    if (fallbackModels.length === 0) {
      console.warn(`${actionName} quota error detected for model=${modelName}, but no fallback models are configured.`)
      throw error
    }

    console.warn(`${actionName} quota error detected for model=${modelName}. Trying fallback models: ${fallbackModels.map((m) => normalizeModelName(m)).join(', ')}`, error)

    let lastError = error
    for (const fallbackModel of fallbackModels) {
      const fallbackName = normalizeModelName(fallbackModel)
      try {
        return await action({
          ...options,
          model: fallbackModel
        })
      } catch (fallbackError: any) {
        lastError = fallbackError
        if (!isGeminiQuotaError(fallbackError)) {
          console.error(`${actionName} fallback failed on model=${fallbackName} with non-quota error.`, fallbackError)
          throw fallbackError
        }
        console.warn(`${actionName} fallback model=${fallbackName} also hit quota or limit error.`, fallbackError)
      }
    }

    console.error(`${actionName} all fallback models failed for original model=${modelName}.`, lastError)
    throw lastError
  }
}

export async function generateTextWithFallback(options: any) {
  return runWithFallback(options, generateText, 'generateText')
}

export async function streamTextWithFallback(options: any) {
  return runWithFallback(options, streamText, 'streamText')
}
