"use client"

import { createContext, useContext, useState } from "react";

const NewClassroomModalContext = createContext<{ open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>> } | undefined>(undefined);

const NewClassroomModalProvider = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = useState<boolean>(false);

    return (
        <NewClassroomModalContext.Provider value={{ open, setOpen }}>
            {children}
        </NewClassroomModalContext.Provider>
    );
};

const useNewClassroomModal = () => {
    const context = useContext(NewClassroomModalContext);
    if (!context) {
        throw new Error("useNewClassroomModal must be used within a NewClassroomModalProvider");
    }
    return context;
};

export { NewClassroomModalProvider, useNewClassroomModal };