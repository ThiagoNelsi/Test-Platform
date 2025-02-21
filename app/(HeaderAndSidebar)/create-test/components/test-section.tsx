import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible"
import { Separator } from "@/app/components/ui/separator"
import { useState } from "react"
import { IoClose } from "react-icons/io5"
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md"
import { motion } from 'framer-motion';

export const TestSection = ({ children, number, removeSection }: { children: React.ReactNode, number: number, removeSection: () => void }) => {
    const [open, setOpen] = useState(true)
    return (
        <Collapsible className="bg-gray-100 p-6 rounded-lg" open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="w-full flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2 text-xl">
                    {open ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
                    <h1 className="font-semibold">Seção {number}</h1>
                </div>
                <span
                    onClick={removeSection}
                    className="flex items-center text-sm gap-2 hover:underline cursor-pointer"
                >
                    <IoClose /> Remover esta seção
                </span>
            </CollapsibleTrigger>
            <motion.div
                className="flex flex-col gap-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: open ? 1 : 0, height: open ? 'auto' : 0 }}
                transition={{ duration: 0.3 }}
            >
                {children}
            </motion.div>
        </Collapsible>
    )
}