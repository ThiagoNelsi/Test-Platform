"use client"

import ClassroomList from "@/app/components/ClassroomList";
import Switcher from "@/app/components/Switcher";
import { useSwitch } from "@/app/context/SwitcherContext";
import { ClassroomWithOwner } from "@/lib/classroomService";

type Props ={
    ownedClasses: ClassroomWithOwner[],
    classrooms: ClassroomWithOwner[]
}

export default function Component({ ownedClasses, classrooms }: Props) {
    const { switchState } = useSwitch();

    return (
        <div className="size-full py-6 px-40 overflow-auto">
            <Switcher />
            <ClassroomList classrooms={switchState ? ownedClasses : classrooms} />
        </div>
    );
}