"use client"

import { Dialog, DialogTrigger } from "@/app/components/ui/dialog";
import { MdAdd } from "react-icons/md";
import NewQuestionModal from "../../components/NewQuestionModal";
import { Button } from "@/app/components/ui/button";
import { Trash } from "lucide-react";
import { useTable } from "@/app/context/TableContext";
import Confirm, { ConfirmTrigger } from "@/app/components/ui/confirm";
import { deleteQuestion } from "@/lib/questionService";

export default function TableActions() {
    const { table, rowSelection, setRowSelection } = useTable();

    const selectedCount = Object.keys(rowSelection).length;

    const getSelectedQuestionIds = () => {
        const tableRows = table?.getRowModel().rows
        const rows = tableRows?.filter((row) => rowSelection[row.id])
        return rows?.map((row) => (row.original as { id: number }).id)
    }

    const handleDelete = async (questionIds: number[]) => {
        if (questionIds.length === 0) return;

        const res = await deleteQuestion(questionIds);
        if (res) {
            setRowSelection({});
        }
    }

    return (
        <menu className="flex justify-between mb-4">
            <Dialog>
                <DialogTrigger asChild>
                    <Button className="bg-ash_gray-300 text-white hover:bg-ash_gray-200">
                        <MdAdd /> Criar questão
                    </Button>
                </DialogTrigger>
                <NewQuestionModal />
            </Dialog>
            <div>
                {selectedCount > 0 &&
                    <Confirm
                        title={`Tem certeza que deseja apagar ${selectedCount} questões?`}
                        description="Esta ação é irreversível."
                        confirmText="Apagar"
                        onConfirm={() => handleDelete(getSelectedQuestionIds() || [])}
                        confirmBtnStyle="bg-red-500 text-white hover:bg-red-600"
                    >
                        <ConfirmTrigger>
                            <Button variant="ghost" className="text-red-600 hover:text-red-600">
                                <Trash /> Apagar questões
                            </Button>
                        </ConfirmTrigger>
                    </Confirm>
                }
            </div>
        </menu>
    )
}