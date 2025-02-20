import { DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { QuestionFinder } from "./question-finder";
import { QuestionSearchbar } from "./questions-searchbar";
import { Section, TestBuilderContext } from "./test-builder";
import { useContext, useState } from "react";
import { Tag } from "@/lib/types";
import { Button } from "@/app/components/ui/button";

type QuestionFinderDialogProps = {
    section: Section;
    setOpen: (open: boolean) => void;
}

export default function QuestionFinderDialog({ section, setOpen }: QuestionFinderDialogProps) {
    const { tags } = useContext(TestBuilderContext)
    const [searchTerm, setSearchTerm] = useState<string>("")
    const [selectedTags, setSelectedTags] = useState<Tag[]>([])

    return (
        <DialogContent className="flex flex-col min-w-[95%] h-[95%] bg-neutral-100">
            <DialogHeader>
                <DialogTitle>Escolha as questões</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto pb-32">
                <QuestionFinder section={section} selected={section.questions} searchTerm={searchTerm} selectedTags={selectedTags} />
            </div>

            <footer className="bg-neutral-200 fixed flex flex-col gap-3 bottom-0 left-0 w-full shadow-lg p-4 rounded-b-lg">
                <QuestionSearchbar
                    tags={tags}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    selectedTags={selectedTags}
                    setSelectedTags={setSelectedTags}
                />
                <div className="flex items-center gap-2 justify-between">
                    <p className="font-medium">Questões selecionadas: {section.questions.length}</p>
                    <Button onClick={() => setOpen(false)} className="w-52 bg-verdigris hover:bg-verdigris text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        Pronto
                    </Button>
                </div>
            </footer>
        </DialogContent>
    )
}