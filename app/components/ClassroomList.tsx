import { ClassroomWithOwner } from "@/lib/classroomService"
import Link from "next/link"

const ClassroomCard = ({ classroom }: { classroom: ClassroomWithOwner }) => {
    return (
        <li className="bg-ash_gray h-40 flex flex-col gap-2 hover:shadow-lg rounded transition cursor-pointer">
            <Link href={`/classroom/${classroom.id}`} className="size-full p-4">
                <h2 className="font-medium mb-0.5">{classroom.name}</h2>
                <p className="text-sm">{classroom.owner.name}</p>
            </Link>
        </li>
    )
}

export default function ClassroomList({ classrooms }: { classrooms: ClassroomWithOwner[] }) {
    return (
        <ul className="grid grid-cols-3 gap-8 mb-8">
            {classrooms.map((classroom) => (
                <ClassroomCard key={classroom.id} classroom={classroom} />
            ))}
        </ul>
    )
}