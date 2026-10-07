import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CITIES } from './cities'
import { formatOffset, offsetMinutes } from './time'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Ids already on the planner; they're left out of the list. */
  chosen: string[]
  /** For the UTC offsets shown next to each city. */
  now: number
  disabled: boolean
  onPick: (id: string) => void
}

export function CityPicker({ open, onOpenChange, chosen, now, disabled, onPick }: Props) {
  const choices = useMemo(() => {
    if (!open) return []
    return CITIES.filter((city) => !chosen.includes(city.id)).map((city) => ({
      ...city,
      utc: `UTC${formatOffset(offsetMinutes(city.tz, now)).replace('±0', '')}`,
    }))
    // Offsets only change at DST switches: refreshing them when the list opens is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chosen])

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={<Button variant="outline" disabled={disabled} />}>
        <Plus data-icon="inline-start" />
        Add city
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <Command label="Search cities">
          <CommandInput placeholder="Search a city, country or zone…" />
          <CommandList>
            <CommandEmpty>No city or zone found.</CommandEmpty>
            <CommandGroup>
              {choices.map((city) => (
                <CommandItem
                  key={city.id}
                  value={city.id}
                  keywords={[city.name, city.country, city.tz, city.utc]}
                  onSelect={() => onPick(city.id)}
                >
                  <span className="truncate">{city.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{city.country}</span>
                  <span data-slot="command-shortcut" className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                    {city.utc}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
