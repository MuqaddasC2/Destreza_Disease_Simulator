"use client"

import { motion } from "framer-motion"
import { Home, Network, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavBarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function NavBar({ activeTab, setActiveTab }: NavBarProps) {
  const tabs = [
    { id: "home", label: "Home", icon: <Home className="mr-2 h-4 w-4" /> },
    { id: "graph", label: "Network Graph", icon: <Network className="mr-2 h-4 w-4" /> },
    { id: "stats", label: "Statistics", icon: <BarChart3 className="mr-2 h-4 w-4" /> },
  ]

  return (
    <header className="w-full backdrop-blur-md bg-[#0C0E1D]/70 border-b border-[#616083]/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#FF81FF] to-[#51FAAA]">
              Destreza
            </h1>
          </motion.div>
        </div>

        <nav className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "relative px-3 py-1.5 text-sm transition-colors duration-200 ease-in-out",
                activeTab === tab.id ? "text-white" : "text-[#616083] hover:text-white",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="flex items-center">
                {tab.icon}
                {tab.label}
              </div>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FF81FF] to-[#51FAAA]"
                  initial={{ opacity: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
