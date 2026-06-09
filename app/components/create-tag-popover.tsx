import { useEffect, useRef, useState } from "react";
import { Tag } from "@/lib/types";
import { errorToast, successToast } from "@/lib/toasters";
import { createTag } from "@/lib/tag-service";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { MdAdd } from "react-icons/md";
import { Input } from "./ui/input";
import { tagColors } from "@/lib/tag-colors";

export const CreateTagPopover = ({
  onCreateTag,
}: {
  onCreateTag: (tag: Tag) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedColor, setSelectedColor] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedColor]);

  const handleSubmit = async () => {
    if (!inputRef.current?.value) {
      errorToast("Nome da tag é obrigatório");
      return;
    }

    const tag = {
      name: inputRef.current?.value,
      color: selectedColor,
    };

    const res = await createTag(tag);

    if (res.error) {
      errorToast(res.error);
      return;
    }

    if (res.success && res.tag) {
      inputRef.current.value = "";
      setSelectedColor(0);
      successToast("Tag criada com sucesso");
      onCreateTag(res.tag);
    }
  };

  return (
    <Popover onOpenChange={(open) => open && inputRef.current?.focus()}>
      <PopoverTrigger asChild>
        <Button className="bg-verdigris hover:bg-verdigris h-8" type="button">
          <MdAdd />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[300px] w-[400px]">
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-2">
            <div>
              <div
                className="w-6 h-6 rounded-full border-[1px]"
                style={{
                  backgroundColor: tagColors[selectedColor].background,
                  borderColor: tagColors[selectedColor].border,
                }}
              />
            </div>
            <Input
              autoFocus
              ref={inputRef}
              placeholder="Nome da tag"
              className="border-2 focus-visible:ring-0"
              style={{ borderColor: tagColors[selectedColor].border }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm">Cor</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {tagColors.map((color, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className={
                      "bg-blue-600 h-5 w-5 rounded-full cursor-pointer hover:shadow hover:border-[1px] transition-all" +
                      (tagColors[selectedColor] === color
                        ? " border-[1px] shadow"
                        : "")
                    }
                    style={{
                      backgroundColor: color.background,
                      borderColor: color.border,
                    }}
                    onClick={() => setSelectedColor(index)}
                  ></div>
                </div>
              ))}
            </div>
          </div>
          <Button
            className="w-full bg-verdigris hover:bg-verdigris-400"
            onClick={handleSubmit}
          >
            Criar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
