// src/ml/useSlugModel.ts
import { useRef, useState, useCallback } from 'react'
import { pipeline, env } from '@xenova/transformers'

// Configure environment for browser usage
env.allowLocalModels = false
env.useBrowserCache = true

export function useSlugModel() {
  const modelRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)

  const ensureModel = useCallback(async () => {
    if (!modelRef.current) {
      setLoading(true)
      modelRef.current = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
      setLoading(false)
    }
    return modelRef.current
  }, [])

  const cosine = (a: number[], b: number[]) => {
    let dot = 0
    let magA = 0
    let magB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      magA += a[i] * a[i]
      magB += b[i] * b[i]
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1)
  }

  const suggestSlug = useCallback(
    async (urlStr: string) => {
      if (!urlStr) return ''

      const url = new URL(urlStr)
      const hostname = url.hostname

      const tokens = hostname
        .split(/[.\-]/g)
        .map(t => t.trim())
        .filter(
          t =>
            t.length > 2 &&
            !['www', 'app', 'dev', 'com', 'net', 'org', 'io', 'co'].includes(t.toLowerCase())
        )

      if (!tokens.length) return hostname.split('.')[0]?.toLowerCase() || ''

      let context = hostname.replace(
        /\.(vercel\.app|netlify\.app|github\.io|com|net|org|io|co)$/i,
        ''
      )

      const extractor = await ensureModel()
      const ctx = await extractor(context, { pooling: 'mean', normalize: true })
      const ctxVec = Array.from(ctx.data as Float32Array)

      let best = tokens[0]
      let bestScore = -Infinity

      for (const token of tokens) {
        const emb = await extractor(token, { pooling: 'mean', normalize: true })
        const vec = Array.from(emb.data as Float32Array)
        const score = cosine(ctxVec, vec)
        if (score > bestScore) {
          bestScore = score
          best = token
        }
      }

      return best.toLowerCase()
    },
    [ensureModel]
  )

  return { suggestSlug, loading }
}
