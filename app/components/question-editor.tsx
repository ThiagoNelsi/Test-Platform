"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import MultipleChoiceForm from "./question-types/multiple-choice/form";
import { Button } from "@/app/components/ui/button";
import { Question, QuestionType, Tag } from "@/lib/types";
import { FormSection } from "./new-question-modal";
import { useQuestionEditor } from "../context/question-editor-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Separator } from "./ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { RemovableTag } from "./removable-tag";
import { tagColors } from "@/lib/tag-colors";
import { CreateTagPopover } from "./create-tag-popover";
import { getTags } from "@/lib/tag-service";
import QuestionRenderer from "./question-renderer";

type QuestionEditorProps = {
    submitAction: (e: React.FormEvent<HTMLFormElement>) => void
    submitButtonText?: string
    tags?: Tag[]
}

export default function QuestionEditor({ submitAction, submitButtonText }: QuestionEditorProps) {
    const { data, type, setType, level, tags: selectedTags, setTags: setSelectedTags } = useQuestionEditor()
    const searchTagRef = useRef<HTMLInputElement>(null)
    const [tags, setTags] = useState<Tag[]>([])

    useEffect(() => {
        fetchTags()
    }, [])

    const levels = ["easy", "medium", "hard"]

    const fetchTags = async () => {
        const tags = await getTags()
        setTags(tags)
    }

    const handleAddTag = (tag: Tag) => {
        if (selectedTags.find((t) => t.id === tag.id)) return
        setSelectedTags([...selectedTags, tag])
        searchTagRef.current?.focus()
    }

    const handleRemoveTag = (tag: Tag) => {
        setSelectedTags(selectedTags.filter((t) => t.id !== tag.id))
    }

    return (
        <form className="flex flex-col gap-2" onSubmit={submitAction}>
            <Tabs defaultValue="editor">
                <TabsList className="flex mb-5">
                    <TabsTrigger className="w-full" value="editor">Editor</TabsTrigger>
                    <TabsTrigger className="w-full" value="result">Resultado</TabsTrigger>
                </TabsList>
                <TabsContent value="editor" className="flex flex-col gap-8">
                    <FormSection>
                        <div className="flex gap-8">
                            <div>
                                <p className="text-sm mb-2">Tipo</p>
                                <Select name="type" required defaultValue={type} onValueChange={(value: string) => setType(value as QuestionType)}>
                                    <SelectTrigger className="w-fit">
                                        <SelectValue placeholder="Selecione um tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Separator orientation="vertical" className="h-20" />
                            <div>
                                <p className="text-sm mb-2">Dificuldade</p>
                                <Select name="level" defaultValue={level >= 0 ? levels[level] : undefined}>
                                    <SelectTrigger className="w-fit">
                                        <SelectValue placeholder="Selecione uma dificuldade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Fácil</SelectItem>
                                        <SelectItem value="medium">Médio</SelectItem>
                                        <SelectItem value="hard">Difícil</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </FormSection>
                    <FormSection>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm mb-2">Tags</p>
                            <CreateTagPopover onCreateTag={handleAddTag} />
                        </div>
                        {selectedTags?.length > 0 && (
                            <div className="flex items-center gap-2 bg-gray-100 rounded-full p-2">
                                    {selectedTags.map((tag) => (
                                        <RemovableTag key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag)} />
                                    ))}
                            </div>
                        )}
                        <Command>
                            <Popover>
                                <PopoverTrigger>
                                    <CommandInput
                                        placeholder="Buscar tags..."
                                        ref={searchTagRef}
                                    />
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height]"
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                >
                                    <CommandList>
                                        <CommandEmpty>No results found.</CommandEmpty>
                                        <CommandGroup>
                                            {tags && tags.map((item) => !selectedTags.some(tag => tag.id === item.id) && (
                                                <CommandItem
                                                    key={item.id}
                                                    onSelect={() => handleAddTag(item)}
                                                    className="flex items-center gap-2"
                                                >
                                                    <div className="bg-blue-600 h-3 w-3 rounded-full" style={{ backgroundColor: tagColors[item.color].background }}></div>
                                                    <div style={{ color: tagColors[item.color].text }}>{item.name}</div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </PopoverContent>
                            </Popover>
                        </Command>
                    </FormSection>
                    {
                        type === "multiple_choice" && <MultipleChoiceForm />
                    }
                </TabsContent>
                <TabsContent value="result">
                    <QuestionRenderer question={{ type, data } as Question} />
                </TabsContent>
            </Tabs>
            <Button className="bg-verdigris hover:bg-verdigris-400 mt-10" type="submit">{submitButtonText}</Button>
        </form>
    )
}