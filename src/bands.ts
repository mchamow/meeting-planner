import type { Band } from './planner'

export const BAND_STYLES: Record<Band, string> = {
  work: 'bg-emerald-500 text-white dark:bg-emerald-600/90 dark:text-emerald-50',
  awake: 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200',
  night: 'bg-slate-700 text-slate-300 dark:bg-slate-800 dark:text-slate-400',
}

export const BAND_LABELS: Record<Band, string> = { work: 'working hours', awake: 'awake', night: 'night' }
