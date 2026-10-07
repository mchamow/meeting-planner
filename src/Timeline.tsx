import { House, X } from 'lucide-react'
import { useEffect, useRef, type CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { City } from './cities'
import { BAND_LABELS, BAND_STYLES } from './bands'
import { relativeOffset, type Slot } from './planner'
import { STEP } from './state'
import { formatClock, formatDate, formatHour, formatOffset, formatTime, offsetMinutes } from './time'

interface Props {
  cities: City[]
  slots: Slot[]
  /** Selected minutes past home midnight. */
  minutes: number
  /** The selected instant. */
  selected: number
  /** Minutes past home midnight right now, if the day on show is today. */
  nowMinutes: number | null
  now: number
  use24h: boolean
  onMinutes: (minutes: number) => void
  onMakeHome: (id: string) => void
  onRemove: (id: string) => void
}

/** `left` for something at `fraction` of the way across the hour cells (they start after the header column). */
const across = (fraction: number): CSSProperties => ({
  left: `calc(var(--hdr) + (100% - var(--hdr)) * ${fraction})`,
})

export function Timeline({ cities, slots, minutes, selected, nowMinutes, now, use24h, onMinutes, onMakeHome, onRemove }: Props) {
  const home = cities[0]
  const scroller = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLDivElement>(null)
  const selectedHour = Math.floor(minutes / 60)
  const allWorking = slots.map((slot) => slot.cells.length > 0 && slot.working === slot.cells.length)

  // On narrow screens the day scrolls sideways: keep the selected time in view.
  useEffect(() => {
    const box = scroller.current
    const line = marker.current
    if (!box || !line || box.scrollWidth <= box.clientWidth) return
    const header = box.querySelector<HTMLElement>('[data-header]')?.offsetWidth ?? 0
    const x = line.offsetLeft
    if (x < box.scrollLeft + header + 16 || x > box.scrollLeft + box.clientWidth - 16) {
      box.scrollLeft = x - header - (box.clientWidth - header) / 2
    }
  }, [minutes])

  return (
    <div ref={scroller} className="overflow-x-auto overscroll-x-contain">
      <div className="relative min-w-[calc(var(--hdr)+24*2rem)] [--hdr:8.75rem] sm:[--hdr:15rem]">
        <div className="flex items-end" aria-hidden>
          <div data-header className="sticky left-0 z-10 w-(--hdr) shrink-0 bg-card pr-2 pb-1 text-xs text-muted-foreground">
            Everyone working
          </div>
          <div className="grid flex-1 grid-cols-24 gap-px pt-3 pb-1">
            {allWorking.map((ok, hour) => (
              <div key={hour} className={cn('h-1.5 rounded-full', ok ? 'bg-emerald-500' : 'bg-muted')} />
            ))}
          </div>
        </div>

        <ul aria-label="Cities" className="flex flex-col gap-1.5">
          {cities.map((city, row) => {
            const isHome = row === 0
            const offset = `UTC${formatOffset(offsetMinutes(city.tz, selected)).replace('±0', '')}`
            const shift = slots[selectedHour]?.cells[row]?.dayShift ?? 0
            return (
              <li key={city.id} aria-label={city.name} className="flex items-stretch">
                <div className="sticky left-0 z-10 flex w-(--hdr) shrink-0 items-center gap-1 bg-card py-0.5 pr-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="truncate font-medium">{city.name}</span>
                      <span className="hidden truncate text-xs text-muted-foreground sm:inline">{city.country}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-semibold tabular-nums" data-testid="selected-time">
                        {formatTime(city.tz, selected, use24h)}
                      </span>
                      {shift !== 0 && (
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          {shift > 0 ? '+1 day' : '−1 day'}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground tabular-nums">
                      {isHome ? offset : relativeOffset(city, home, selected)}
                      <span className="hidden sm:inline">
                        {' · '}now {formatTime(city.tz, now, use24h)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={isHome ? `${city.name} is home` : `Make ${city.name} home`}
                      aria-pressed={isHome}
                      title={isHome ? 'Home: the timeline follows this city' : 'Make home'}
                      onClick={() => onMakeHome(city.id)}
                      className={cn(isHome && 'text-primary')}
                    >
                      <House className={cn(isHome && 'fill-current')} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove ${city.name}`}
                      title="Remove"
                      disabled={cities.length <= 1}
                      onClick={() => onRemove(city.id)}
                    >
                      <X />
                    </Button>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-24 gap-px">
                  {slots.map((slot, hour) => {
                    const cell = slot.cells[row]
                    const h = Math.floor(cell.minutes / 60)
                    const m = cell.minutes % 60
                    const midnight = h === 0
                    const chosen = hour === selectedHour
                    return (
                      <button
                        key={hour}
                        type="button"
                        tabIndex={-1}
                        aria-label={`${formatClock(hour * 60, use24h)} ${home.name}: ${formatClock(cell.minutes, use24h)} in ${city.name}${cell.dayShift ? `, ${formatDate(cell.date)}` : ''}, ${BAND_LABELS[cell.band]}`}
                        onClick={() => onMinutes(hour * 60)}
                        className={cn(
                          'flex flex-col items-center justify-center text-xs leading-none tabular-nums transition-[filter] first:rounded-l-md last:rounded-r-md hover:brightness-110',
                          BAND_STYLES[cell.band],
                          midnight && hour > 0 && 'shadow-[inset_2px_0_0_var(--color-foreground)]',
                          chosen && 'relative z-[1] ring-2 ring-foreground ring-inset',
                        )}
                      >
                        {midnight && (
                          <span className="mb-0.5 text-[0.6rem] font-semibold uppercase">
                            {formatDate(cell.date).slice(0, 3)}
                          </span>
                        )}
                        <span className={cn(midnight && 'font-semibold')}>{formatHour(h, use24h)}</span>
                        {m !== 0 && <span className="text-[0.6rem] opacity-80">:{String(m).padStart(2, '0')}</span>}
                      </button>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center pt-3">
          <div className="sticky left-0 z-10 w-(--hdr) shrink-0 bg-card pr-2 text-xs text-muted-foreground">
            {home.name} time
          </div>
          <Slider
            className="flex-1"
            min={0}
            max={24 * 60 - STEP}
            step={STEP}
            thumbAlignment="center"
            value={[minutes]}
            onValueChange={(value) => onMinutes(Array.isArray(value) ? value[0] : value)}
            getAriaLabel={() => 'Meeting time'}
            getAriaValueText={(_, value) => `${formatClock(value, use24h)} in ${home.name}`}
          />
        </div>

        {/* Exact positions (the cells are whole hours): the selected moment and now, as ticks above the rows. */}
        <div
          ref={marker}
          aria-hidden
          className="pointer-events-none absolute top-0 z-[5] -ml-1 size-2 rotate-45 rounded-[1px] bg-foreground"
          style={across(minutes / (24 * 60))}
        />
        {nowMinutes !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 z-[4] -ml-px h-2.5 w-0.5 rounded-full bg-rose-500"
            style={across(nowMinutes / (24 * 60))}
          />
        )}
      </div>
    </div>
  )
}
