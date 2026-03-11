'use client'

import Link from 'next/link'
import { Shield, Bell } from 'lucide-react'
import { DarkModeToggle } from '@/contexts/AdminDarkModeContext'

export function Navbar() {
  return (
    <nav className="bg-primary text-white border-b border-blue-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Shield className="w-8 h-8 mr-3" />
            <span className="text-xl font-bold">Admin Panel</span>
          </div>
          <div className="flex items-center space-x-4">
            {/* Dark Mode Toggle */}
            <DarkModeToggle size="md" className="text-white hover:bg-blue-700" />
            
            <button className="p-2 hover:bg-blue-700 rounded-lg">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
