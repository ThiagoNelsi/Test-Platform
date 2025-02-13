import { Dialog, DialogTrigger } from "@/app/components/ui/dialog";
import NewQuestionModal from "../../components/NewQuestionModal";
import { useQuestionEditor } from "@/app/context/QuestionEditorContext";
import { useEffect } from "react";

type QuestionDialogTriggerProps = {
    children: React.ReactNode
    type: "create" | "edit",
    initialData?: any
}

export default function QuestionDialogTrigger({ children, type, initialData: initial }: QuestionDialogTriggerProps) {
    const { initialData, setInitialData, setData, setType, setLevel, setId } = useQuestionEditor()

    useEffect(() => {
        if (initialData) {
            setId(initialData.id)
            setData(initialData.data)
            setType(initialData.type)
            setLevel(initialData.level)
        }
    }, [initialData])

    return (
        <Dialog onOpenChange={(open) => {
            if (open) {
                if (type === "create") {
                    setData(null)
                }
                else if (type === "edit" && initial) setInitialData(initial)
            }
        }}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <NewQuestionModal type={type} />
        </Dialog>
    )
}