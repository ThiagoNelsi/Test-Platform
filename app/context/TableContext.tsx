"use client";

import { createContext, useContext, useState } from "react";
import { RowSelectionState, Table } from "@tanstack/react-table";

type TableContextType<TData> = {
    table: Table<TData> | null;
    setTable: (table: Table<TData>) => void;
    rowSelection: RowSelectionState;
    setRowSelection: (rows: RowSelectionState) => void;
};

const TableContext = createContext<TableContextType<any> | undefined>(undefined);

export function TableProvider<TData>({ children }: { children: React.ReactNode }) {
    const [table, setTable] = useState<Table<TData> | null>(null);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    return (
        <TableContext.Provider value={{ table, setTable, rowSelection, setRowSelection }}>
            {children}
        </TableContext.Provider>
    );
}

export function useTable<TData>() {
    const context = useContext<TableContextType<TData> | undefined>(TableContext);
    if (!context) {
        throw new Error("useTable deve ser usado dentro de um TableProvider");
    }
    return context;
}
