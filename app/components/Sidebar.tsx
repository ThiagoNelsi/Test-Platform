"use client";

import { useSidebar } from "../context/SidebarContext";
import { MdAdd } from "react-icons/md";
import { HiOutlineInboxStack } from "react-icons/hi2";
import { motion } from "framer-motion";
import SidebarButton from "./SidebarButton";
import SidebarTodoItem from "./SidebarTodoItem";
import { Todo } from "@/lib/testService";

type SidebarProps = {
    todos: Todo[]
}

export default function Sidebar({ todos }: SidebarProps) {
  const sidebarContext = useSidebar();
  const isOpen = sidebarContext ? sidebarContext.isOpen : false;

  return (
    <motion.aside
      initial={{ x: -320 }}
      animate={{ x: isOpen ? 0 : -320 }}
      transition={{ duration: 0.3 }}
      className={`fixed top-16 h-[calc(100vh-4rem)] overflow-auto w-80 max-w-72 px-6 py-4 inset-0 bg-neutral-100 shadow-lg z-50`}
    >
        <div className="flex flex-col gap-4">
            <SidebarButton icon={<MdAdd className="text-2xl" />} text="Nova turma" />
            <SidebarButton icon={<HiOutlineInboxStack className="text-2xl" />} text="Bancos de questões" />

            <h3 className="mt-5 font-bold">A fazer</h3>
            <ul className="flex flex-col gap-5">
                {todos?.map((todo) => (
                    <SidebarTodoItem key={todo.id} todo={todo} />
                ))}
            </ul>
        </div>
    </motion.aside>
  );
}