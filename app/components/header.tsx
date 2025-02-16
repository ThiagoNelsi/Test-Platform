"use client"

import { MdMenu } from 'react-icons/md'
import { useSidebar } from '../context/sidebar-context'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { useState } from 'react'
import { LucideCircleUserRound } from 'lucide-react'

export default function Header() {
    const { data } = useSession()
    const { name, email, image } = data?.user
    const [dropdownIsOpen, setDropdownIsOpen] = useState(false)

    const sidebarContext = useSidebar()
    const toggleSidebar = sidebarContext ? sidebarContext.toggleSidebar : () => {}

    const handleSignOut = () => {
        signOut({ callbackUrl: 'http://localhost:3000/login' })
    }

    return (
        <header className="fixed w-full flex items-center bg-verdigris text-white px-4 h-16">
            <div className='flex items-center flex-1 gap-10'>
               <button 
                className='p-2 hover:bg-verdigris-600 rounded transition'
                onClick={toggleSidebar}
                >
                    <MdMenu className="text-2xl"/>
                </button>
                <Link href={`/home`} className="text-2xl font-semibold">Test Platform</Link>
            </div>
            <div className='flex justify-end items-center flex-1 gap-10'>
                <DropdownMenu onOpenChange={(isOpen) => setDropdownIsOpen(isOpen)}>
                    <DropdownMenuTrigger className='outline-none mr-4'>
                        {dropdownIsOpen ? 
                            <LucideCircleUserRound className='w-8 h-8' /> :
                            <Image className="w-8 rounded-[50%]" src={image} width={100} height={100} alt='Profile image' />
                        }
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Meu perfil</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <Image className="w-8 rounded-[50%]" src={image} width={100} height={100} alt='Profile image' />
                                <div>
                                    <p>{name}</p>
                                    <p className='text-xs'>{email}</p>
                                </div>
                            </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className='cursor-pointer' onClick={handleSignOut}>
                            <button className='font-medium text-red-500'>Sair</button>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

        </header>
    )
}