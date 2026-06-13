"use client";

import ClassroomList from "@/app/components/classroom-list";
import { SwitcherProvider } from "@/app/context/switcher-context";
import { useHomeController } from "@/app/controllers/home-controller";
import { TeacherActions } from "./teacher-actions";

export default function Classroom() {
  const { ownedClasses } = useHomeController();

  return (
    <SwitcherProvider>
      <div className="max-w-[1500px] size-full mx-auto overflow-auto">
        <TeacherActions />
        <ClassroomList
          isTeacher={true}
          classrooms={ownedClasses}
        />
      </div>
    </SwitcherProvider>
  );
}
