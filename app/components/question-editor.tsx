"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import MultipleChoiceForm from "./question-types/multiple-choice/form";
import { Button } from "@/app/components/ui/button";
import { QuestionType, Tag } from "@/lib/types";
import { FormSection } from "./new-question-modal";
import { useQuestionEditor } from "../context/question-editor-context";
import { Separator } from "./ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { RemovableTag } from "./removable-tag";
import { tagColors } from "@/lib/tag-colors";
import { CreateTagPopover } from "./create-tag-popover";
import { getTags } from "@/lib/tag-service";
import { Card } from "./ui/card";

type QuestionEditorProps = {
  submitAction: (e: React.FormEvent<HTMLFormElement>) => void;
  submitButtonText?: string;
  tags?: Tag[];
};

export default function QuestionEditor({
  submitAction,
  submitButtonText,
}: QuestionEditorProps) {
  const { question, setType, setTags: setSelectedTags } = useQuestionEditor();
  const searchTagRef = useRef<HTMLInputElement>(null);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    fetchTags();
  }, []);

  const levels = ["easy", "medium", "hard"];

  const fetchTags = async () => {
    const tags = await getTags();
    setTags(tags);
  };

  const handleAddTag = (tag: Tag) => {
    if (question.tags.find((t) => t.id === tag.id)) return;
    setSelectedTags([...question.tags, tag]);
    searchTagRef.current?.focus();
  };

  const handleRemoveTag = (tag: Tag) => {
    setSelectedTags(question.tags.filter((t) => t.id !== tag.id));
  };

  console.log("question", question);

  return (
    <form
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      onSubmit={submitAction}
    >
      <Card className="lg:col-span-2 p-4">
        {/* Editor */}
        {question.type === "multiple_choice" && <MultipleChoiceForm />}
      </Card>
      <Card className="lg:col-span-1 h-fit p-4">
        <div className="flex flex-col gap-8">
          {/* Tipo e Dificuldade */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm mb-2">Tipo</p>
              <Select
                name="type"
                required
                defaultValue={question.type}
                onValueChange={(value: string) =>
                  setType(value as QuestionType)
                }
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder="Selecione um tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">
                    Múltipla escolha
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm mb-2">Dificuldade</p>
              <Select
                name="level"
                value={
                  question.level != null && question.level >= 0
                    ? levels[question.level]
                    : "null"
                }
                onValueChange={(value: string) => {
                  const level = levels.indexOf(value);
                  question.level = level;
                }}
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder="Selecione uma dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Não informar</SelectItem>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm mb-2">Tags</p>
              <CreateTagPopover onCreateTag={handleAddTag} />
            </div>
            <Command>
              <Popover>
                <PopoverTrigger>
                  <CommandInput placeholder="Buscar tags..." ref={searchTagRef} />
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height]"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {tags &&
                        tags.map(
                          (item) =>
                            !question.tags.some((tag) => tag.id === item.id) && (
                              <CommandItem
                                key={item.id}
                                onSelect={() => handleAddTag(item)}
                                className="flex items-center gap-2"
                              >
                                <div
                                  className="bg-blue-600 h-3 w-3 rounded-full"
                                  style={{
                                    backgroundColor:
                                      tagColors[item.color].background,
                                  }}
                                ></div>
                                <div
                                  style={{ color: tagColors[item.color].text }}
                                >
                                  {item.name}
                                </div>
                              </CommandItem>
                            )
                        )}
                    </CommandGroup>
                  </CommandList>
                </PopoverContent>
              </Popover>
            </Command>
            {question.tags?.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-100 rounded-full p-2">
                {question.tags.map((tag) => (
                  <RemovableTag
                    key={tag.id}
                    tag={tag}
                    onRemove={() => handleRemoveTag(tag)}
                  />
                ))}
              </div>
            )}
          </div>
          <Button
            className="bg-verdigris hover:bg-verdigris-400 w-full"
            type="submit"
          >
            {submitButtonText}
          </Button>
        </div>
      </Card>
    </form>
  );
}
