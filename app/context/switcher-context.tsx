"use client";

import { createContext, useContext, useState } from "react";

const SwitchContext = createContext<
  | {
      switchState: boolean;
      setSwitchState: React.Dispatch<React.SetStateAction<boolean>>;
    }
  | undefined
>(undefined);

const SwitcherProvider = ({ children }: { children: React.ReactNode }) => {
  const [switchState, setSwitchState] = useState<boolean>(true);

  return (
    <SwitchContext.Provider value={{ switchState, setSwitchState }}>
      {children}
    </SwitchContext.Provider>
  );
};

const useSwitch = () => {
  const context = useContext(SwitchContext);
  if (!context) {
    throw new Error("useSwitch must be used within a SwitcherProvider");
  }
  return context;
};

export { SwitcherProvider, useSwitch };
