import { ReactNode } from "react";
import { useRadioGroupContext } from "./radio-context";
import { alphabet } from "@/lib/alphabet";

type Props = {
  value: string;
  index?: number;
  children?: ReactNode;
  innerHTML?: string;
};

export const AlphabeticalRadioItem = ({ value, index, children, innerHTML }: Props) => {
  const { value: selected, setValue, name, viewOnly } = useRadioGroupContext();

  const checked = selected === value;

  return (
    <label className="flex items-center gap-2 cursor-pointer text-xs">
      <div className="">
        <div
          className={`flex items-center justify-center text-xs font-medium w-6 h-6 border rounded-full ${
            checked ? "border-green-900 bg-green-200" : "border-gray-400"
          }`}
        >
          {alphabet[index ?? 0]}
        </div>
      </div>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => !viewOnly && setValue(value)}
        className="hidden"
        disabled={viewOnly}
      />
      {innerHTML ? (
        <span dangerouslySetInnerHTML={{ __html: innerHTML.trim() }} />
      ) : (
        <span>{children}</span>
      )}
    </label>
  );
};
