import { Check, ChevronLeft, ChevronRight, Clock, Copy, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useReducer, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { CityPicker } from './CityPicker'
import { bestSlot, daySlots, overlaps, summary, type Band } from './planner'
import { citiesOf, initialState, MAX_CITIES, reducer, selectedInstant, STEP } from './state'
import { loadSettings, saveSettings } from './store'
import { BAND_STYLES } from './bands'
import { Timeline } from './Timeline'
import { dayDifference, formatClock, isDateString, localDate, minutesOfDay } from './time'
import { useNow } from './useNow'

const LEGEND: [Band, string][] = [
  ['work', 'Working hours'],
  ['awake', 'Awake (7–22)'],
  ['night', 'Night'],
]

const DAY_NAMES: Record<number, string> = { [-1]: 'Yesterday', 0: 'Today', 1: 'Tomorrow' }

export default function App() {
  const now = useNow()
  const [state, dispatch] = useReducer(reducer, null, () => initialState(loadSettings(), Date.now()))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [copied, setCopied] = useState<'copied' | 'failed' | null>(null)
  const { cityIds, work, use24h, date, minutes } = state

  useEffect(() => saveSettings({ cityIds, work, use24h }), [cityIds, work, use24h])

  const cities = useMemo(() => citiesOf({ cityIds, work, use24h }), [cityIds, work, use24h])
  const home = cities[0]
  const slots = useMemo(() => daySlots(date, cities, work), [date, cities, work])
  const runs = overlaps(slots)
  const best = bestSlot(slots)
  const selected = selectedInstant(state)
  const today = localDate(home.tz, now)
  const nowMinutes = today === date ? minutesOfDay(home.tz, now) : null
  const dayName = DAY_NAMES[dayDifference(today, date)]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary(selected, cities, use24h))
      setCopied('copied')
    } catch {
      setCopied('failed')
    }
  }

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(id)
  }, [copied])

  // Re-subscribed each render, so the handler always sees current state.
  // Shortcuts work anywhere except while typing.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return
      const target = event.target as HTMLElement
      if (target.closest('input:not([type="range"]), textarea, select, [contenteditable], [cmdk-root]')) return
      // A focused slider owns the arrow keys; the other shortcuts still work from it.
      if (target.matches('input[type="range"]') && event.key.startsWith('Arrow')) return
      const hour = event.shiftKey ? 60 : STEP
      const actions: Record<string, () => void> = {
        ArrowLeft: () => dispatch({ type: 'nudge', by: -hour }),
        ArrowRight: () => dispatch({ type: 'nudge', by: hour }),
        '[': () => dispatch({ type: 'shiftDate', days: -1 }),
        ']': () => dispatch({ type: 'shiftDate', days: 1 }),
        n: () => dispatch({ type: 'goTo', t: Date.now() }),
        b: () => dispatch({ type: 'setMinutes', minutes: best * 60 }),
        c: () => void copy(),
        a: () => cityIds.length < MAX_CITIES && setPickerOpen(true),
      }
      const action = actions[event.key.length === 1 ? event.key.toLowerCase() : event.key]
      if (!action) return
      event.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const fmt = (m: number) => formatClock(m, use24h)
  const status =
    cities.length < 2
      ? 'Add a city to compare time zones.'
      : runs.length
        ? `Everyone is working ${runs.map(([a, b]) => `${fmt(a * 60)}–${fmt(((b + 1) * 60) % (24 * 60))}`).join(', ')} ${home.name} time.`
        : `No hour fits everyone's working hours. Best bet: ${fmt(best * 60)}, ${slots[best].working} of ${cities.length} working.`

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">🌍 Meeting Planner</h1>
          <p className="text-sm text-muted-foreground">Line up time zones and find a time that works for everyone.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={use24h} onCheckedChange={(checked) => dispatch({ type: 'set24h', use24h: checked })} />
          24-hour clock
        </label>
      </header>

      <Card size="sm">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous day"
              title="Previous day ([)"
              onClick={() => dispatch({ type: 'shiftDate', days: -1 })}
            >
              <ChevronLeft />
            </Button>
            <Input
              type="date"
              aria-label="Date"
              className="w-36"
              value={date}
              onChange={(event) => isDateString(event.target.value) && dispatch({ type: 'setDate', date: event.target.value })}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Next day"
              title="Next day (])"
              onClick={() => dispatch({ type: 'shiftDate', days: 1 })}
            >
              <ChevronRight />
            </Button>
            <Button variant="outline" onClick={() => dispatch({ type: 'goTo', t: Date.now() })} title="Jump to now (N)">
              <Clock data-icon="inline-start" />
              Now
            </Button>
            {dayName && <Badge variant="secondary">{dayName}</Badge>}
          </div>

          <div className="flex min-w-60 flex-1 items-center gap-3 sm:max-w-sm">
            <span className="shrink-0 text-sm">
              Working hours{' '}
              <span className="font-medium tabular-nums" data-testid="work-hours">
                {fmt(work[0] * 60)}–{fmt((work[1] * 60) % (24 * 60))}
              </span>
            </span>
            <Slider
              min={0}
              max={24}
              step={1}
              minStepsBetweenValues={1}
              thumbAlignment="center"
              value={work}
              onValueChange={(value) => Array.isArray(value) && dispatch({ type: 'setWork', work: [value[0], value[1]] })}
              getAriaLabel={(index) => (index === 0 ? 'Working hours start' : 'Working hours end')}
              getAriaValueText={(_, value) => fmt((value * 60) % (24 * 60))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className={cn('text-sm', runs.length && 'font-medium text-emerald-700 dark:text-emerald-400')}>
              {status}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => dispatch({ type: 'setMinutes', minutes: best * 60 })} title="Jump to the best time (B)">
                <Sparkles data-icon="inline-start" />
                Best time
              </Button>
              <Button onClick={copy} title="Copy the selected time in every city (C)">
                {copied === 'copied' ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Copy times'}
              </Button>
            </div>
          </div>

          <Timeline
            cities={cities}
            slots={slots}
            minutes={minutes}
            selected={selected}
            nowMinutes={nowMinutes}
            now={now}
            use24h={use24h}
            onMinutes={(m) => dispatch({ type: 'setMinutes', minutes: m })}
            onMakeHome={(id) => dispatch({ type: 'makeHome', id })}
            onRemove={(id) => dispatch({ type: 'remove', id })}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <CityPicker
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              chosen={cityIds}
              now={now}
              disabled={cityIds.length >= MAX_CITIES}
              onPick={(id) => {
                dispatch({ type: 'add', id })
                setPickerOpen(false)
              }}
            />
            <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {LEGEND.map(([band, label]) => (
                <li key={band} className="flex items-center gap-1.5">
                  <span className={cn('size-3 rounded-sm', BAND_STYLES[band])} />
                  {label}
                </li>
              ))}
              {nowMinutes !== null && (
                <li className="flex items-center gap-1.5">
                  <span className="h-3 w-0.5 rounded-full bg-rose-500" />
                  Now
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      <footer className="hidden flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:flex">
        <span>
          <Kbd>←</Kbd> <Kbd>→</Kbd> 15 min (<Kbd>Shift</Kbd> 1 h)
        </span>
        <span>
          <Kbd>[</Kbd> <Kbd>]</Kbd> day
        </span>
        <span>
          <Kbd>N</Kbd> now
        </span>
        <span>
          <Kbd>B</Kbd> best time
        </span>
        <span>
          <Kbd>C</Kbd> copy
        </span>
        <span>
          <Kbd>A</Kbd> add city
        </span>
      </footer>
    </main>
  )
}

