import { RemovableTag } from "@/app/components/removable-tag";
import { SearchTags } from "@/app/components/search-tags";
import { Input } from "@/app/components/ui/input";
import { Tag } from "@/lib/types";

type QuestionSearchbarProps = {
    tags: Tag[];
    selectedTags: Tag[];
    setSelectedTags: (tags: Tag[]) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

export const QuestionSearchbar = ({ tags, selectedTags, setSelectedTags, searchTerm, setSearchTerm }: QuestionSearchbarProps) => {
    const handleAddTag = (tag: Tag) => {
        if (selectedTags.some(t => t.id === tag.id)) return
        setSelectedTags([...selectedTags, tag])
    }

    const handleRemoveTag = (tag: Tag) => {
        setSelectedTags(selectedTags.filter(t => t.id !== tag.id))
    }

    return (
        <div>
            {selectedTags.length > 0 && (
                <div className="flex gap-2 mb-2">
                    {selectedTags.map((tag) => (
                        <RemovableTag key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag)} />
                    ))}
                </div>
            )}
            <div className="flex gap-2 items-center p-1 rounded-lg pr-2 bg-white">
                <Input
                    placeholder="Buscar questão..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-0 shadow-none focus-visible:ring-0"
                />
                <SearchTags items={tags} onSelect={(tag) => handleAddTag(tag)} />
            </div>
        </div>
    )
}