import { Dispatch, SetStateAction } from "react";
import { FaArrowDown, FaArrowUp, FaTrash } from "react-icons/fa";

type MovableItemProps<T> = {
  children: React.ReactNode;
  index: number;
  list: T[];
  setList: Dispatch<SetStateAction<T[]>>;
};

export default function MovableItem<T>({
  children,
  index,
  list,
  setList,
}: MovableItemProps<T>) {
  const handleMoveSection = (
    event: React.MouseEvent<SVGElement, MouseEvent>,
    index: number,
    direction: "up" | "down",
  ) => {
    event.preventDefault();
    const newList = [...list];
    const movedItem = newList.splice(index, 1)[0];
    newList.splice(
      direction === "up" ? index - 1 : index + 1,
      0,
      movedItem,
    );
    setList(newList);
  };

  const removeItem = (index: number) => {
    if (list.length === 1) {
      return;
    }

    const newList = [...list];
    newList.splice(index, 1);
    setList(newList);
  };

  return (
    <div className="flex items-center gap-2">
      {children}
      <div className="text-sm text-neutral-700 flex items-center gap-4">
        <div>
          <FaArrowUp
            className="mb-2 hover:text-neutral-900 cursor-pointer"
            onClick={(e) => handleMoveSection(e, index, "up")}
          />
          <FaArrowDown
            className="hover:text-neutral-900 cursor-pointer"
            onClick={(e) => handleMoveSection(e, index, "down")}
          />
        </div>
        <FaTrash
          className="text-red-400 hover:text-red-500 cursor-pointer"
          onClick={() => removeItem(index)}
        />
      </div>
    </div>
  );
}
