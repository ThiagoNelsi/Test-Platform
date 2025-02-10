import type { Classroom } from "@prisma/client";
import Component from "./Component";
import { getClassrooms } from "@/lib/classroomService";
import { SwitcherProvider } from "@/app/context/SwitcherContext";

export default async function Classroom() {
    const response = await getClassrooms()

    if (!response) return null

    const { ownedClasses, classrooms } = response

    return (
        <SwitcherProvider>
            <Component classrooms={classrooms} ownedClasses={ownedClasses} />
        </SwitcherProvider>
    )
}