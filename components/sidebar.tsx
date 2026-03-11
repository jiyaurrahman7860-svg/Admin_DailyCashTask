'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Play,
  LayoutDashboard,
  Users,
  ClipboardList,
  Wallet,
  Link as LinkIcon,
  MessageCircle,
  ShieldAlert,
  FileText,
  Mail,
  Globe,
  CheckCircle,
  CreditCard,
  BarChart3,
  Megaphone,
  EyeOff,
  Ban,
  ListChecks,
  Settings,
  ToggleLeft,
  Trophy,
} from 'lucide-react'

const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Tasks', href: '/tasks', icon: ClipboardList },
  { name: 'Task Submissions', href: '/task-submissions', icon: CheckCircle },
  { name: 'Completed Entries', href: '/completed-task-entries', icon: ListChecks },
  { name: 'Offerwalls', href: '/offerwalls', icon: Globe },
  { name: 'Reward Ads', href: '/reward-ads', icon: Play },
  { name: 'Withdrawals', href: '/withdrawals', icon: Wallet },
  { name: 'Transactions', href: '/transactions', icon: CreditCard },
  { name: 'Site Stats', href: '/site-stats', icon: BarChart3 },
  { name: 'Weekly Contest', href: '/contest', icon: Trophy },
  { name: 'Announcements', href: '/announcements', icon: Megaphone },
  { name: 'Affiliate Links', href: '/affiliate', icon: LinkIcon },
  { name: 'Blog', href: '/blog', icon: FileText },
  { name: 'Contact Messages', href: '/contact-messages', icon: Mail },
  { name: 'Support Tickets', href: '/support', icon: MessageCircle },
  { name: 'Shadow Ban', href: '/shadow-ban', icon: EyeOff },
  { name: 'User Ban', href: '/user-ban', icon: Ban },
  { name: 'Fraud Monitor', href: '/fraud', icon: ShieldAlert },
]

const systemNavigation = [
  { name: 'User Panel Control', href: '/user-panel-control', icon: ToggleLeft },
  { name: 'Platform Controls', href: '/platform-controls', icon: Settings },
]

function NavLink({ item }: { item: typeof mainNavigation[0] }) {
  const pathname = usePathname()
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
  
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
        isActive
          ? 'bg-primary text-white'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      <item.icon className={cn('mr-3 h-5 w-5', isActive ? 'text-white' : 'text-gray-400')} />
      {item.name}
    </Link>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200 min-h-screen">
      <nav className="flex-1 p-4 space-y-1">
        {/* Main Navigation */}
        {mainNavigation.map((item) => (
          <NavLink key={item.name} item={item} />
        ))}
        
        {/* System Section */}
        <div className="pt-6 pb-2">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            System
          </p>
        </div>
        {systemNavigation.map((item) => (
          <NavLink key={item.name} item={item} />
        ))}
      </nav>
    </aside>
  )
}
