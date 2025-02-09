"use client"

import { MdMenu } from 'react-icons/md'
import { useSidebar } from '../context/SidebarContext'
import Link from 'next/link'

type HeaderProps = {
    userId: number
}

export default function Header({ userId }: HeaderProps) {
    const sidebarContext = useSidebar()
    const toggleSidebar = sidebarContext ? sidebarContext.toggleSidebar : () => {}

    return (
        <header className="fixed w-full flex items-center bg-verdigris text-white px-4 h-16">
            <div className='flex items-center max-w-200 gap-10'>
               <button 
                className='p-2 hover:bg-verdigris-600 rounded transition'
                onClick={toggleSidebar}
                >
                    <MdMenu className="text-2xl"/>
                </button>
                <Link href={`/home/${userId}`} className="text-2xl font-semibold">Test Platform</Link>
            </div>
        </header>
    )
}