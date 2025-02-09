import type { Classroom } from "@prisma/client";
import Component from "./Component";
import { getClassrooms } from "@/lib/classroomService";
import { SwitcherProvider } from "@/app/context/SwitcherContext";

type Params = Promise<{
    userId: string;
}>

export default async function Classroom({ params }: { params: Params }) {
    const userId = Number((await params).userId)

    const response = await getClassrooms(userId)

    if (!response) return null

    const { ownedClasses, classrooms } = response

    return (
        <SwitcherProvider>
            <Component classrooms={classrooms} ownedClasses={ownedClasses} />
        </SwitcherProvider>
    )
}