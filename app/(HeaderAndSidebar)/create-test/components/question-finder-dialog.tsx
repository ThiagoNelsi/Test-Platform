import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { QuestionFinder } from "./question-finder";
import { QuestionSearchbar } from "./questions-searchbar";
import { Section, TestBuilderContext } from "./test-builder";
import { useContext, useState } from "react";
import { Tag } from "@/lib/types";
import { Button } from "@/app/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { RemovableTag } from "@/app/components/removable-tag";
import { SearchTags } from "@/app/components/search-tags";
import { MdAdd } from "react-icons/md";

type QuestionFinderDialogProps = {
    section: Section;
    setOpen: (open: boolean) => void;
}

export default function QuestionFinderDialog({ section, setOpen }: QuestionFinderDialogProps) {
    const { tags } = useContext(TestBuilderContext)
    const [searchTerm, setSearchTerm] = useState<string>("")
    const [selectedTags, setSelectedTags] = useState<Tag[]>([])

    const handleRemoveTag = (tag: Tag) => {
        setSelectedTags(selectedTags.filter(t => t.id !== tag.id))
    }

    const handleAddTag = (tag: Tag) => {
        if (selectedTags.some(t => t.id === tag.id)) return
        setSelectedTags([...selectedTags, tag])
    }

    return (
        <DialogContent className="flex flex-col xl:max-w-[1500px] max-w-[1000px] h-[95%] bg-neutral-100">
            <DialogHeader className="z-0">
                <DialogTitle>
                    Escolha as questões
                </DialogTitle>
                <DialogDescription asChild >
                    <div className="flex flex-col gap-4 text-neutral-600">
                        <p>Escolha as questões que deseja adicionar a esta seção. Você pode filtrar por tags e pesquisar pelo conteúdo.</p>

                        <div className="flex gap-2 items-center">
                            <span className="font-medium">Filtrar tags:</span>
                            {selectedTags.length > 0 && 
                                selectedTags.map((tag) => (
                                    <RemovableTag key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag)} />
                                ))
                            }
                            <SearchTags items={tags} onSelect={(tag) => handleAddTag(tag)}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-primary shadow-none bg-transparent border-[1px] border-neutral-400 rounded-full w-20 h-7 hover:bg-blue-100 hover:border-blue-500"
                                >
                                    <MdAdd />
                                </Button>
                            </SearchTags>
                        </div>
                    </div>
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
                    <Button onClick={() => setOpen(false)} className="w-52 bg-blue-400 hover:bg-blue-300 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        Pronto
                    </Button>
                    <span className="text-sm font-normal">Questões selecionadas: {section.questions.length}</span>
                </div>
            </footer>
        </DialogContent>
    )
}