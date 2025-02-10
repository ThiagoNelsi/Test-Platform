"use client"

import { Dialog, DialogTrigger } from "@/app/components/ui/dialog";
import { MdAdd } from "react-icons/md";
import NewQuestionModal from "../../components/NewQuestionModal";
import { Button } from "@/app/components/ui/button";
import { Trash } from "lucide-react";
import { useTable } from "@/app/context/TableContext";
import { useEffect } from "react";

export default function TableActions() {
    const { rowSelection } = useTable();

    useEffect(() => {
        console.log(rowSelection)
    }, [rowSelection])

    const selectedCount = Object.keys(rowSelection).length;

    return (
        <menu className="flex justify-between mb-4">
            <div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <MdAdd /> Criar questão
                        </Button>
                    </DialogTrigger>
                    <NewQuestionModal />
                </Dialog>
            </div>
            <div>
                {selectedCount > 0 &&
                <Button variant="ghost" className="text-red-500">
                    <Trash /> Excluir selecionados
                </Button>
                }
            </div>
        </menu>
    )
}