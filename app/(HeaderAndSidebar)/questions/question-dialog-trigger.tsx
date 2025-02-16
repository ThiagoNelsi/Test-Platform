import { Dialog, DialogTrigger } from "@/app/components/ui/dialog";
import NewQuestionModal from "../../components/new-question-modal";
import { useQuestionEditor } from "@/app/context/question-editor-context";
import { useEffect, useState } from "react";

type QuestionDialogTriggerProps = {
    children: React.ReactNode
    type: "create" | "edit",
    initialData?: any
}

export default function QuestionDialogTrigger({ children, type, initialData: initial }: QuestionDialogTriggerProps) {
    const [open, setOpen] = useState(false)
    const { setData, setType, setLevel, setId, setTags } = useQuestionEditor()

    const setInitialData = (initialData: any) => {
        setId(initialData.id)
        setData(initialData.data)
        setType(initialData.type)
        setLevel(initialData.level)
        setTags(initialData.tags)
    }

    const clearInitialData = () => {
        setData(undefined)
        setType("multiple_choice")
        setLevel(-1)
        setTags([])
    }

    return (
        <Dialog
            onOpenChange={(open) => {
                if (open) {
                    if (type === "create") clearInitialData()
                    else if (type === "edit" && initial) setInitialData(initial)
                }
                setOpen(open)
            }}
            open={open}
        >
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <NewQuestionModal type={type} closeDialog={() => setOpen(false)} />
        </Dialog>
    )
}