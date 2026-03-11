"use client";

import { HistoryIcon, QueueIcon, SearchIcon, UserIcon } from "@/components/icons";

export type Tab = "queue" | "browse" | "history" | "profile";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const items = [
  { id: "queue" as const, label: "Queue", Icon: QueueIcon },
  { id: "browse" as const, label: "Browse", Icon: SearchIcon },
  { id: "history" as const, label: "History", Icon: HistoryIcon },
  { id: "profile" as const, label: "Profile", Icon: UserIcon },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottomNav">
      <div className="bottomNavInner">
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`navButton${activeTab === id ? " isActive" : ""}`}
            onClick={() => onTabChange(id)}
            type="button"
          >
            <Icon className="navIcon" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
