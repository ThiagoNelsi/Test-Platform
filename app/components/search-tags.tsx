import { Button } from "@/app/components/ui/button";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/app/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { tagColors } from "@/lib/tag-colors";
import { Tag } from "@/lib/types";

type SearchTagsProps = {
  items: Tag[];
  onSelect: (tag: Tag) => void;
  children?: React.ReactNode;
};

export const SearchTags = ({ items, onSelect, children }: SearchTagsProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm] = useState("");

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ? (
          children
        ) : (
          <Button variant="outline" size="sm" className="shadow-none border-0">
            Filtrar tags
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="p-0" side="right" align="start">
        <Command>
          <CommandInput placeholder="Buscar tags..." />
          <CommandList>
            <CommandEmpty>Nenhum resultado</CommandEmpty>
            <CommandGroup>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => onSelect(item)}
                  className="flex items-center gap-2"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: tagColors[item.color].background,
                    }}
                  ></div>
                  <div style={{ color: tagColors[item.color].text }}>
                    {item.name}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
