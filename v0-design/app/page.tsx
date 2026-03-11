'use client'

import { useState } from 'react'
import { AppProvider } from '@/lib/app-context'
import { BottomNav, Tab } from '@/components/bottom-nav'
import { QueueScreen } from '@/components/queue-screen'
import { BrowseScreen } from '@/components/browse-screen'
import { HistoryScreen } from '@/components/history-screen'
import { ProfileScreen } from '@/components/profile-screen'
import { ListMusic, Search, Clock, User } from 'lucide-react'

const tabTitles: Record<Tab, { title: string; icon: React.ElementType }> = {
  queue: { title: 'Queue', icon: ListMusic },
  browse: { title: 'Browse', icon: Search },
  history: { title: 'History', icon: Clock },
  profile: { title: 'Profile', icon: User },
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('queue')

  const { title, icon: Icon } = tabTitles[activeTab]

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-3 h-14 px-4 max-w-lg mx-auto">
          <Icon className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        {activeTab === 'queue' && <QueueScreen />}
        {activeTab === 'browse' && <BrowseScreen />}
        {activeTab === 'history' && <HistoryScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
