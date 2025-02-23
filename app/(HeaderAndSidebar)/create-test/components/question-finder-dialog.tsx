import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { QuestionFinder } from "./question-finder";
import { useState } from "react";
import { Tag } from "@/lib/types";
import { Button } from "@/app/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { RemovableTag } from "@/app/components/removable-tag";
import { SearchTags } from "@/app/components/search-tags";
import { MdAdd } from "react-icons/md";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Section, useCreateTest } from "@/app/context/create-test-context";
import { AutosizeTextarea } from "@/app/components/ui/auto-resize-textarea";
import { Separator } from "@/app/components/ui/separator";

type QuestionFinderDialogProps = {
    section: Section;
    setOpen: (open: boolean) => void;
}

export default function QuestionFinderDialog({ section, setOpen }: QuestionFinderDialogProps) {
    const { tags } = useCreateTest()
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
        <DialogContent className="flex gap-0 flex-col xl:max-w-[1500px] max-w-[1000px] h-[95%] bg-verdigris-900 p-0 border-0">
            <DialogHeader className="z-0 bg-verdigris-400 rounded-t-lg px-4 py-2 color-white">
                <VisuallyHidden.Root>
                    <DialogTitle>
                        Escolha as questões
                    </DialogTitle>
                </VisuallyHidden.Root>
                <DialogDescription asChild >
                    <div className="flex flex-col gap-4 text-neutral-600">
                        <div className="flex gap-2 items-center">
                            <span className="font-medium text-white">Filtrar tags:</span>
                            {selectedTags.length > 0 && 
                                <div className="flex gap-2 bg-white rounded-full p-1">
                                    {selectedTags.map((tag) => (
                                        <RemovableTag key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag)} />
                                    ))}
                                </div>
                            }
                            {tags && (
                                <SearchTags items={tags} onSelect={(tag) => handleAddTag(tag)}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="ml-2 text-neutral-800 shadow-none bg-white border-[1px] border-white rounded-full w-20 h-7 hover:shadow-md"
                                    >
                                        <MdAdd />
                                    </Button>
                                </SearchTags>
                            )}
                        </div>
                    </div>
                </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 px-4 py-0">
                <div className="h-5"></div>
                <QuestionFinder section={section} selected={section.questions} searchTerm={searchTerm} selectedTags={selectedTags} />
            </ScrollArea>

            <footer className="flex flex-col gap-3 w-full shadow-lg p-4 rounded-b-lg bg-white">
                <div className="flex gap-2 items-center p-1 rounded-md pr-2 bg-white shadow-lg border-2 border-neutral-400">
                    <AutosizeTextarea
                        placeholder="Buscar questão..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        maxHeight={150}
                        className="border-0 shadow-none focus-visible:ring-0"
                    />
                </div>
                <div className="flex items-center gap-2 justify-between">
                    <Button onClick={() => setOpen(false)} className="w-52 bg-neutral-800 hover:bg-neutral-900 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        Pronto
                    </Button>
                    <span className="text-sm font-normal">Questões selecionadas: {section.questions.length}</span>
                </div>
            </footer>
        </DialogContent>
    )
}