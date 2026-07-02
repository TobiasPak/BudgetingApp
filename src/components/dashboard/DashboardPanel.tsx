import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type PanelTone = 'info' | 'success' | 'warning' | 'destructive'

const toneClasses: Record<PanelTone, { icon: string; iconBg: string; text: string }> = {
  info: { icon: 'text-info', iconBg: 'bg-info/10', text: 'text-info' },
  success: { icon: 'text-success', iconBg: 'bg-success/10', text: 'text-success' },
  warning: { icon: 'text-warning', iconBg: 'bg-warning/10', text: 'text-warning' },
  destructive: {
    icon: 'text-destructive',
    iconBg: 'bg-destructive/10',
    text: 'text-destructive',
  },
}

const progressIndicatorClasses: Record<PanelTone, string> = {
  info: '[&_[data-slot=progress-indicator]]:bg-info',
  success: '[&_[data-slot=progress-indicator]]:bg-success',
  warning: '[&_[data-slot=progress-indicator]]:bg-warning',
  destructive: '[&_[data-slot=progress-indicator]]:bg-destructive',
}

interface TrendInfo {
  percent: number
  direction: 'up' | 'down'
  tone: PanelTone
}

interface DashboardPanelProps {
  icon: LucideIcon
  tone: PanelTone
  label: string
  value: ReactNode
  sub: string
  trend?: TrendInfo
  progressValue: number
  insight: string
  href?: string
}

export function DashboardPanel({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  trend,
  progressValue,
  insight,
  href,
}: DashboardPanelProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown

  const content = (
    <Card
      className={cn(
        'h-full min-h-[200px]',
        href && 'transition-colors hover:border-foreground/20'
      )}
    >
      <CardContent className="flex h-full flex-col">
        <div className="mb-2 flex items-center gap-2">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-lg',
              toneClasses[tone].iconBg
            )}
          >
            <Icon className={cn('size-4', toneClasses[tone].icon)} />
          </div>
          <span className="flex-1 text-sm text-muted-foreground">{label}</span>
          {href && <ChevronRight className="size-4 text-muted-foreground" />}
        </div>

        <p className="text-xl font-semibold">{value}</p>
        <p className="mb-2 text-xs text-muted-foreground">{sub}</p>

        {trend && (
          <div className="mb-2 flex items-center gap-1 text-xs">
            <TrendIcon className={cn('size-3.5', toneClasses[trend.tone].text)} />
            <span className={toneClasses[trend.tone].text}>{trend.percent}%</span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}

        <Progress
          value={progressValue}
          className={progressIndicatorClasses[tone]}
        />

        <p className="mt-auto border-t pt-2.5 text-xs text-muted-foreground">
          {insight}
        </p>
      </CardContent>
    </Card>
  )

  return href ? (
    <Link to={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  )
}
