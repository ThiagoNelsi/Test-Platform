"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { RowSelectionState, Table } from "@tanstack/react-table";
import { Tag } from "@/lib/types";

export type Filter = {
  text: string;
  tags: Tag[];
};

type TableContextType<TData> = {
  table: Table<TData> | null;
  setTable: (table: any) => void;
  rowSelection: RowSelectionState;
  setRowSelection: (rows: RowSelectionState) => void;
  filter: Filter | null;
  setFilter: (filter: Filter | null) => void;
  addTagFilter: (tag: Tag) => void;
  removeTagFilter: (tag: Tag) => void;
};

const TableContext = createContext<TableContextType<any> | undefined>(
  undefined,
);

export function TableProvider<TData>({
  children,
}: {
  children: React.ReactNode;
}) {
  const [table, setTable] = useState<Table<TData> | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filter, setFilter] = useState<Filter | null>(null);

  const addTagFilter = (tag: Tag) => {
    if (!filter?.tags?.includes(tag)) {
      setFilter({
        text: filter?.text ?? "",
        tags: [...(filter?.tags ?? []), tag],
      });
    }
  };

  const removeTagFilter = (tag: Tag) => {
    setFilter({
      text: filter?.text ?? "",
      tags: filter?.tags.filter((t) => t.id !== tag.id) ?? [],
    });
  };

  return (
    <TableContext.Provider
      value={{
        table,
        setTable,
        rowSelection,
        setRowSelection,
        filter,
        setFilter,
        addTagFilter,
        removeTagFilter,
      }}
    >
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
