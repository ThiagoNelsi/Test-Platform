import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { QuestionFinder } from "./question-finder";
import { useState } from "react";
import { Tag } from "@/lib/types";
import { Button } from "@/app/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { RemovableTag } from "@/app/components/removable-tag";
import { SearchTags } from "@/app/components/search-tags";
import { MdAdd } from "react-icons/md";
import { Section, useCreateTest } from "@/app/context/create-test-context";
import { AutosizeTextarea } from "@/app/components/ui/auto-resize-textarea";
import { Card, CardContent } from "@/app/components/ui/card";

type QuestionFinderDialogProps = {
  section: Section;
  setOpen: (open: boolean) => void;
};

export default function QuestionFinderDialog({
  section,
  setOpen,
}: QuestionFinderDialogProps) {
  const { tags } = useCreateTest();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const handleRemoveTag = (tag: Tag) => {
    setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
  };

  const handleAddTag = (tag: Tag) => {
    if (selectedTags.some((t) => t.id === tag.id)) return;
    setSelectedTags([...selectedTags, tag]);
  };

  return (
    <DialogContent className="flex gap-0 flex-col max-w-[95%] h-[95%] p-0 border-0">
      <DialogHeader className="z-0 bg-verdigris-700 rounded-t-lg px-4 py-2 color-white">
        <DialogTitle className="font-normal text-sm py-1">Escolha as questões</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-6 h-full gap-4 p-4 overflow-hidden">
        <Card className="col-span-6 md:col-span-3 lg:col-span-2 h-full flex flex-col">
          <CardContent className="flex flex-col gap-3 w-full p-4 rounded-b-lg bg-white">
            <p className="text-sm font-normal">
              Questões selecionadas: {section.questions.length}
            </p>
            <div className="flex gap-2 items-center p-1 rounded-md pr-2 bg-white shadow-lg border-2 border-neutral-400">
              <AutosizeTextarea
                placeholder="Buscar questão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                maxHeight={150}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm">Filtrar tags:</span>
              {tags && (
                <SearchTags items={tags} onSelect={(tag) => handleAddTag(tag)}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 text-neutral-800 shadow-none border-[1px] rounded-full w-20 h-7 hover:shadow-md"
                  >
                    <MdAdd />
                  </Button>
                </SearchTags>
              )}
            </div>
            <div>
              {selectedTags.length > 0 && (
                <div className="flex gap-2 bg-white rounded-full p-1 flex-wrap">
                  {selectedTags.map((tag) => (
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
              onClick={() => setOpen(false)}
              className="w-full bg-neutral-800 hover:bg-neutral-900 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              Pronto
            </Button>
          </CardContent>
        </Card>
        <Card className="col-span-6 md:col-span-3 lg:col-span-4 h-full flex flex-col overflow-auto">
          <CardContent className="p-0">
            <ScrollArea className="flex-1 px-4 py-0">
              <div className="h-5"></div>
              <QuestionFinder
                section={section}
                selected={section.questions}
                searchTerm={searchTerm}
                selectedTags={selectedTags}
              />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DialogContent>
  );
}
