import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Classroom } from "@prisma/client";

type SearchClassroomsProps = {
  items: Classroom[];
  onSelect: (classroom: Classroom) => void;
  children?: React.ReactNode;
};

export default function SearchClassrooms({
  items,
  onSelect,
  children,
}: SearchClassroomsProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm] = useState("");

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Command>
        <PopoverTrigger asChild>
          <CommandInput placeholder="Buscar turmas..." />
        </PopoverTrigger>
        <PopoverContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height]"
        >
          <CommandList>
            <CommandEmpty>Nenhum resultado</CommandEmpty>
            <CommandGroup>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => onSelect(item)}
                  className="flex items-center gap-2"
                >
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </PopoverContent>
      </Command>
    </Popover>
  );
}
