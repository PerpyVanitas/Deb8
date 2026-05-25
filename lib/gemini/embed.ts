import { embed } from 'ai'

export async function embedText(text: string): Promise<number[]> {
  const result = await embed({ model: 'text-embedding-3-large', value: text })
  return Array.from(result.embedding.values())
}
