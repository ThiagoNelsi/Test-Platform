"use client";

import { useSidebar } from "../context/sidebar-context";
import { MdAdd } from "react-icons/md";
import { HiOutlineInboxStack } from "react-icons/hi2";
import { motion } from "framer-motion";
import SidebarButton from "./sidebar-button";
import SidebarTodoItem from "./sidebar-todo-item";
import { Todo } from "@/lib/test-service";
import { useNewClassroomModal } from "../context/new-classroom-modal-context";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

type SidebarProps = {
    todos: Todo[]
}

export default function Sidebar({ todos }: SidebarProps) {
  const sidebarContext = useSidebar();
  const pathname = usePathname();
  const { setOpen } = useNewClassroomModal();

  const isOpen = sidebarContext ? sidebarContext.isOpen : false;

  useEffect(() => {
    sidebarContext?.setIsOpen(false);
  }, [pathname])

  return (
      <motion.aside
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ duration: 0.3 }}
        className={`fixed top-16 h-[calc(100vh-4rem)] overflow-auto w-80 max-w-72 px-6 py-4 inset-0 bg-neutral-100 shadow-lg z-50`}
      >
          <div className="flex flex-col gap-4">
              <SidebarButton
                icon={<MdAdd className="text-2xl" />}
                text="Nova turma"
                onClick={() => setOpen(true)}
              />
              <SidebarButton
                href="/questions"
                icon={<HiOutlineInboxStack className="text-2xl" />}
                text="Banco de questões"
              />

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