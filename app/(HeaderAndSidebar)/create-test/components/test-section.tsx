import { Separator } from "@/app/components/ui/separator"
import { IoClose } from "react-icons/io5"

export const TestSection = ({ children, number, removeSection }: { children: React.ReactNode, number: number, removeSection: () => void }) => {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 justify-between">
                <h1 className="font-semibold">Seção {number}</h1>
                <span
                    onClick={removeSection}
                    className="flex items-center text-sm gap-2 hover:underline cursor-pointer"
                >
                    <IoClose /> Remover esta seção
                </span>
            </div>
            {children}
            <Separator className="bg-gray-500" />
        </div>
    )
}