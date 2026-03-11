'use client'

import { Button } from '@/components/ui/button'
import { ListMusic, Search, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tab = 'queue' | 'browse' | 'history' | 'profile'

interface BottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'queue', label: 'Queue', icon: ListMusic },
  { id: 'browse', label: 'Browse', icon: Search },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'profile', label: 'Profile', icon: User },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <Button
              key={id}
              variant="ghost"
              className={cn(
                'flex-1 flex flex-col items-center gap-1 h-14 rounded-none hover:bg-transparent',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onTabChange(id)}
            >
              <Icon className={cn('size-5', isActive && 'text-primary')} />
              <span className="text-[10px] font-medium">{label}</span>
            </Button>
          )
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
