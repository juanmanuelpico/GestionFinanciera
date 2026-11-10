import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { fetchDebtActors } from '../debts-api'
import { debtActorTypeLabels, type DebtActor, type DebtActorType } from '../types'

interface ActorSearchSelectProps {
  id: string
  actorType: DebtActorType
  selected: DebtActor | null
  onSelect: (actor: DebtActor) => void
  placeholder: string
  ariaInvalid?: boolean
  disabled?: boolean
  onCreate?: () => void
}

function actorSubtitle(actor: DebtActor): string {
  if (actor.type === 'TARJETA') {
    const parts = [
      actor.brand,
      actor.lastFour ? `•••• ${actor.lastFour}` : null,
    ].filter(Boolean)
    return parts.join(' ')
  }

  return [actor.phone, actor.email].filter(Boolean).join(' · ')
}

export function ActorSearchSelect({
  id,
  actorType,
  selected,
  onSelect,
  placeholder,
  ariaInvalid,
  disabled,
  onCreate,
}: ActorSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const actorsQuery = useQuery({
    queryKey: ['debt-actors', 'search', actorType, debouncedSearch],
    queryFn: () =>
      fetchDebtActors({
        type: actorType,
        search: debouncedSearch || undefined,
        page: 1,
        limit: 20,
      }),
    enabled: open,
    staleTime: 10_000,
  })

  const actors = actorsQuery.data?.items ?? []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn(
            'h-auto min-h-11 w-full justify-between py-2 text-left font-normal whitespace-normal sm:min-h-10',
            !selected && 'text-muted-foreground',
          )}
        >
          <span className="min-w-0 break-words">
            {selected ? selected.displayName : placeholder}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nombre…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {actorsQuery.isPending && (
              <div className="text-muted-foreground flex items-center gap-2 px-3 py-6 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Buscando actores…
              </div>
            )}

            {actorsQuery.isError && (
              <div className="space-y-3 px-3 py-6" role="alert">
                <p className="text-destructive text-center text-sm">
                  No se pudo buscar actores.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => void actorsQuery.refetch()}
                >
                  Reintentar
                </Button>
              </div>
            )}

            {!actorsQuery.isPending &&
              !actorsQuery.isError &&
              actors.length === 0 && (
                <CommandEmpty>
                  {debouncedSearch
                    ? 'No encontramos actores con ese nombre.'
                    : onCreate
                      ? 'Todavía no hay actores de este tipo. Creá uno ahora.'
                      : 'Todavía no hay actores de este tipo. Crealos en la solapa Actores.'}
                </CommandEmpty>
              )}

            {actors.length > 0 && (
              <CommandGroup>
                {actors.map((actor) => (
                  <CommandItem
                    key={actor.id}
                    value={actor.id}
                    onSelect={() => {
                      onSelect(actor)
                      setOpen(false)
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-medium">
                        {actor.displayName}
                      </span>
                      {actorSubtitle(actor) && (
                        <span className="text-muted-foreground block break-words text-xs">
                          {actorSubtitle(actor)}
                        </span>
                      )}
                    </span>
                    <Check
                      className={cn(
                        selected?.id === actor.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>

          {onCreate && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full justify-start sm:h-10"
                onClick={() => {
                  setOpen(false)
                  onCreate()
                }}
              >
                <Plus />
                Agregar {debtActorTypeLabels[actorType].toLowerCase()}
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
