import { createContext, useContext } from "react";

type RadioGroupContextType = {
  value: string;
  setValue: (value: string) => void;
  viewOnly?: boolean;
  name: string;
};

export const RadioGroupContext = createContext<RadioGroupContextType | null>(null);

export function useRadioGroupContext() {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) throw new Error("RadioGroupItem must be used inside a RadioGroup");
  return ctx;
}
