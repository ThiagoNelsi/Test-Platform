import { AutosizeTextarea } from "@/app/components/ui/auto-resize-textarea";
import { Input } from "@/app/components/ui/input";
import { Tag } from "@/lib/types";

type QuestionSearchbarProps = {
    tags: Tag[];
    selectedTags: Tag[];
    setSelectedTags: (tags: Tag[]) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

export const QuestionSearchbar = ({ searchTerm, setSearchTerm }: QuestionSearchbarProps) => {
    return (
        <div className="flex gap-2 items-center p-1 rounded-lg pr-2 bg-white">
            <AutosizeTextarea
                placeholder="Buscar questão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                maxHeight={150}
                className="border-0 shadow-none focus-visible:ring-0"
            />
        </div>
    )
}