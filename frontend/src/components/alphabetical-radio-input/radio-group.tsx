import React, { ReactElement, ReactNode, useId } from "react";
import { RadioGroupContext } from "./radio-context";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  viewOnly?: boolean;
  children: ReactNode;
  className?: string;
};

export const AlphabeticalRadioGroup = ({ value, onValueChange, viewOnly, children, className = "text-sm" }: Props) => {
  const name = useId(); // para garantir que todos os radios compartilhem o mesmo name

  return (
    <RadioGroupContext.Provider value={{ value, setValue: onValueChange, name, viewOnly }}>
      <div className={`flex flex-col gap-2 ${className}`}>
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as ReactElement<any>, { index });
          }
          return child;
        })}
      </div>
    </RadioGroupContext.Provider>
  );
};
