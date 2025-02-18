"use client"

import ClassroomList from "@/app/components/classroom-list";
import Switcher from "@/app/components/switcher";
import { useSwitch } from "@/app/context/switcher-context";
import { ClassroomWithOwner } from "@/lib/classroomService";
import { MdAdd } from "react-icons/md";
import { IoDocumentsOutline } from "react-icons/io5";
import { GrDocumentPdf } from "react-icons/gr";
import Link from "next/link";


type Props ={
    ownedClasses: ClassroomWithOwner[],
    classrooms: ClassroomWithOwner[]
}

const TeacherActions = () => {
    return (
        <div className="flex items-center gap-10 border-b-2 border-gray-100 mb-8 px-4 py-2 text-sm">
            <Link href="/create-test" className="flex gap-2 items-center hover:underline">
                <MdAdd /> Criar prova
            </Link>
            <Link href="#" className="flex gap-2 items-center hover:underline">
                <GrDocumentPdf /> Gerar prova em PDF
            </Link>
            <Link href="/questions" className="flex gap-2 items-center hover:underline">
                <IoDocumentsOutline /> Gerenciar questões
            </Link>
        </div>
    );
}

export default function Component({ ownedClasses, classrooms }: Props) {
    const { switchState: isTeacher } = useSwitch();

    return (
        <div className="size-full py-6 px-40 overflow-auto">
            <Switcher />
            {isTeacher && <TeacherActions />}
            <ClassroomList isTeacher={isTeacher} classrooms={isTeacher ? ownedClasses : classrooms} />
        </div>
    );
}