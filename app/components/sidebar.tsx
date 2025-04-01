"use client"

import { useState, useEffect } from "react"
import { BarChart, BookOpen, FileText, Home, Layers, Menu, Moon, PenTool, Search, Settings, Sun, Users } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  // { icon: Home, label: "Dashboard", href: "/home" },
  { icon: Users, label: "Minhas Turmas", href: "/home" },
  { icon: Layers, label: "Banco de Questões", href: "/questions" },
  { icon: FileText, label: "Provas e Simulados", href: "/tests" },
  { icon: Search, label: "Explorar questões", href: "/questions/explorar" },
  // { icon: PenTool, label: "Correções", href: "/correcoes" },
  // { icon: BarChart, label: "Relatórios", href: "/relatorios" },
  // { icon: Settings, label: "Configurações", href: "/configuracoes" },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Update document style when sidebar state changes
  useEffect(() => {
    const mainContent = document.getElementById("main-content")
    if (mainContent) {
      if (collapsed) {
        mainContent.style.marginLeft = "5rem" // 20px (w-20)
      } else {
        mainContent.style.marginLeft = "16rem" // 64px (w-64)
      }
    }

    // Reset on mobile
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // md breakpoint
        if (mainContent) mainContent.style.marginLeft = "0"
      } else {
        if (mainContent) {
          mainContent.style.marginLeft = collapsed ? "5rem" : "16rem"
        }
      }
    }

    window.addEventListener("resize", handleResize)
    handleResize() // Initial check

    return () => window.removeEventListener("resize", handleResize)
  }, [collapsed])

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-gray-800 border-r dark:border-gray-700 transition-all duration-300 ease-in-out",
          collapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          {!collapsed ? (
            <>
              <div className="flex items-center">
                <BookOpen className="h-6 w-6 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-blue-600">Test Platform</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
                <Menu className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex justify-center"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href

              return (
                <li key={index}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      "hover:bg-gray-100 dark:hover:bg-gray-700",
                      isActive ? "bg-gray-100 dark:bg-gray-700 text-primary" : "text-gray-700 dark:text-gray-300",
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t dark:border-gray-700">
          <div className={cn("flex items-center", collapsed ? "justify-center flex-col gap-2" : "justify-between")}>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className={cn(collapsed && "w-full")}>
                {collapsed ? "?" : "Ajuda"}
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

