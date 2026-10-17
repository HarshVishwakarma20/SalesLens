import { useCallback, useEffect, useRef, useState } from 'react'
import type { JobStep } from '@/lib/types'

type JobState = 'idle' | 'running' | 'complete'

export function useJob(stepLabels: string[], stepDurationMs = 280) {
  const [steps, setSteps] = useState<JobStep[]>(() => stepLabels.map((label) => ({ label, status: 'waiting' })))
  const [state, setState] = useState<JobState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const timers = useRef<number[]>([])

  const clear = () => {
    timers.current.forEach((t) => window.clearInterval(t))
    timers.current = []
  }

  useEffect(() => {
    clear()
    setSteps(stepLabels.map((label) => ({ label, status: 'waiting' })))
    setState('idle')
    setElapsed(0)
    return clear
  }, [stepLabels])

  const start = useCallback(() => {
    clear()
    setState('running')
    const startedAt = Date.now()
    let current = 0
    setSteps(stepLabels.map((label, i) => ({ label, status: i === 0 ? 'running' : 'waiting' })))

    timers.current.push(window.setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 100))
    timers.current.push(
      window.setInterval(() => {
        current += 1
        setSteps(
          stepLabels.map((label, i) => ({
            label,
            status: i < current ? 'done' : i === current ? 'running' : 'waiting',
          })),
        )
        if (current >= stepLabels.length) {
          clear()
          setElapsed((Date.now() - startedAt) / 1000)
          setState('complete')
        }
      }, stepDurationMs),
    )
  }, [stepLabels, stepDurationMs])

  const doneCount = steps.filter((s) => s.status === 'done').length
  const progress = Math.round((doneCount / stepLabels.length) * 100)

  return { steps, state, elapsed, progress, start }
}
