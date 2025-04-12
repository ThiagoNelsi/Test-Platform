"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useState } from "react";
import { Bell, ChevronDown, LogOut, LucideCircleUserRound, Plus, Search, Settings, User } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { usePathname } from "next/navigation";

const headerTitles = {
  '/home': 'Turmas',
  '/create-test': 'Nova prova',
  '/questions': 'Questões',
  '/tests': 'Provas',
  '/questions/explorar': 'Explorar questões',
  '/materiais': 'Materiais',
  '/materiais/upload': 'Materiais',
} as const;

export default function Header() {
  const { data } = useSession();
  const { name, image } = data?.user;
  const [searchQuery, setSearchQuery] = useState("")
  const path = usePathname() as keyof typeof headerTitles;

  const handleSignOut = () => {
    signOut({ callbackUrl: "http://localhost:3000/login" });
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <div className="text-xl font-bold text-primary">{headerTitles[path] ?? "Test Platform"}</div>
      </div>

      {/* <div className="flex items-center w-full max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar turmas, provas ou questões..."
            className="w-full pl-9 bg-gray-50 dark:bg-gray-700"
          />
        </div>
      </div> */}

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="Professor" />
                <AvatarFallback>
                  <Image src={image} alt={`Foto de perfil de ${name}`} height={32} width={32} className="rounded-full" />
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline">
                {name}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
