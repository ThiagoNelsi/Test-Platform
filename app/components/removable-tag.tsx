import { IoMdClose } from "react-icons/io";
import { Tag } from "@/lib/types";
import { tagColors } from "@/lib/tag-colors";

type RemovableTagProps = {
  tag: Tag;
  onRemove: () => void;
};

export const RemovableTag = ({ tag, onRemove }: RemovableTagProps) => {
  return (
    <span
      key={tag.id}
      className={`flex items-center gap-2 text-xs px-2 h-7 rounded-full text-black`}
      style={{
        backgroundColor: tagColors[tag.color].background,
        color: tagColors[tag.color].text,
      }}
    >
      {tag.name}
      <IoMdClose className="cursor-pointer" onClick={onRemove} />
    </span>
  );
};
