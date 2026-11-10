import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '../types'
import { toolLabel } from '../types'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'min-w-0 max-w-[85%] break-words rounded-xl px-4 py-2.5 text-sm md:max-w-[70%]',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
          message.isError && 'border-destructive/30 bg-destructive/10 text-destructive',
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && message.toolsUsed.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.toolsUsed.map((tool) => (
              <Badge
                key={tool}
                variant="outline"
                className="bg-background max-w-full whitespace-normal text-muted-foreground text-xs"
              >
                {toolLabel(tool)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
