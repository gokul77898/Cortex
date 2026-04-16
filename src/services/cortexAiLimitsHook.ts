import { useEffect, useState } from 'react'
import {
  type CORTEXAILimits,
  currentLimits,
  statusListeners,
} from './cortexAiLimits.js'

export function useCORTEXAiLimits(): CORTEXAILimits {
  const [limits, setLimits] = useState<CORTEXAILimits>({ ...currentLimits })

  useEffect(() => {
    const listener = (newLimits: CORTEXAILimits) => {
      setLimits({ ...newLimits })
    }
    statusListeners.add(listener)

    return () => {
      statusListeners.delete(listener)
    }
  }, [])

  return limits
}
