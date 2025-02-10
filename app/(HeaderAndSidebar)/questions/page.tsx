"use client"

import { Button } from "@/app/components/ui/button";
import { Dialog, DialogTrigger } from "@/app/components/ui/dialog";
import { MdAdd } from "react-icons/md";
import NewQuestionModal from "../../components/NewQuestionModal";
import { QuestionDataProvider } from "@/app/context/QuestionDataContext";

export default function Page() {
    return (
        <QuestionDataProvider>
            <Dialog>
                <DialogTrigger asChild>
                    <Button>
                        <MdAdd /> Criar questão
                    </Button>
                </DialogTrigger>
                <NewQuestionModal />
            </Dialog>
        </QuestionDataProvider>
    );
}