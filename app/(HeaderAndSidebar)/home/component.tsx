"use client"

import ClassroomList from "@/app/components/classroom-list";
import Switcher from "@/app/components/switcher";
import { useSwitch } from "@/app/context/switcher-context";
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
            <ClassroomList isTeacher={switchState} classrooms={switchState ? ownedClasses : classrooms} />
        </div>
    );
}