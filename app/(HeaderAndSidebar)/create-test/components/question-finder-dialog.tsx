import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { QuestionFinder } from "./question-finder";
import { QuestionSearchbar } from "./questions-searchbar";
import { Section, TestBuilderContext } from "./test-builder";
import { useContext, useState } from "react";
import { Tag } from "@/lib/types";
import { Button } from "@/app/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";

type QuestionFinderDialogProps = {
    section: Section;
    setOpen: (open: boolean) => void;
}

export default function QuestionFinderDialog({ section, setOpen }: QuestionFinderDialogProps) {
    const { tags } = useContext(TestBuilderContext)
    const [searchTerm, setSearchTerm] = useState<string>("")
    const [selectedTags, setSelectedTags] = useState<Tag[]>([])

    return (
        <DialogContent className="flex flex-col max-w-[1000px] h-[95%] bg-neutral-100">
            <DialogHeader className="z-0">
                <DialogTitle>
                    Escolha as questões
                </DialogTitle>
                <DialogDescription asChild>
                    <p>Escolha as questões que deseja adicionar a esta seção. Você pode filtrar por tags e pesquisar pelo conteúdo.</p>
                </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 p-2 pb-32">
                <QuestionFinder section={section} selected={section.questions} searchTerm={searchTerm} selectedTags={selectedTags} />
            </ScrollArea>

            <footer className="bg-neutral-200 fixed flex flex-col gap-3 bottom-0 left-0 w-full shadow-lg p-4 rounded-b-lg">
                <QuestionSearchbar
                    tags={tags}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    selectedTags={selectedTags}
                    setSelectedTags={setSelectedTags}
                />
                <div className="flex items-center gap-2 justify-between">
                    <Button onClick={() => setOpen(false)} className="w-52 bg-verdigris-400 hover:bg-verdigris-300 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        Pronto
                    </Button>
                    <span className="text-sm font-normal">Questões selecionadas: {section.questions.length}</span>
                </div>
            </footer>
        </DialogContent>
    )
}