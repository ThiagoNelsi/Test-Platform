import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { tagColors } from "@/lib/tag-colors";
import { Tag } from "@/lib/types";

type TagSelectorProps = {
    tags: Tag[];
    onSelect: (tag: Tag) => void;
}

export const TagSelector = ({ tags, onSelect }: TagSelectorProps) => {
    return (
        <Command>
            <Popover>
                <PopoverTrigger>
                    <CommandInput
                        placeholder="Buscar tags..."
                    />
                </PopoverTrigger>
                <PopoverContent
                    className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height]"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <CommandList>
                        <CommandEmpty>Nenhuma tag encontrada</CommandEmpty>
                        <CommandGroup>
                            {tags && tags.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    onSelect={() => onSelect(item)}
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
    )
}