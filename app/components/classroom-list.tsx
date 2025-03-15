import { ClassroomWithOwner } from "@/lib/classroomService";
import Link from "next/link";
import { FaRegCopy } from "react-icons/fa";
import { toast } from "sonner";

const ClassroomCard = ({
  classroom,
  isTeacher,
}: {
  classroom: ClassroomWithOwner;
  isTeacher: boolean;
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(classroom.code);
    toast.success("Código copiado!", {
      duration: 1200,
      position: "top-center",
      style: {
        background: "#fff",
        color: "#333",
        border: 0,
      },
    });
  };

  return (
    <li className="bg-ash_gray-900 border-[1px] border-ash_gray-500 min-w-[300px] md:min-w-[400px] h-40 flex flex-col gap-2 hover:shadow-lg rounded transition cursor-pointer">
      <Link href={`/classroom/${classroom.id}`} className="size-full p-4">
        <h2 className="font-medium mb-0.5 text-sm">{classroom.name}</h2>
        <p className="text-sm">{classroom.owner.name}</p>
      </Link>
      {isTeacher && (
        <footer className="p-4 bg-ash_gray-700 rounded-b text-neutral-700">
          <button className="flex gap-2 items-center" onClick={handleCopy}>
            <FaRegCopy />
            <p className="text-xs">Código: {classroom.code}</p>
          </button>
        </footer>
      )}
    </li>
  );
};

export default function ClassroomList({
  classrooms,
  isTeacher,
}: {
  classrooms: ClassroomWithOwner[];
  isTeacher: boolean;
}) {
  return (
    <div className="mx-auto">
      <ul className="flex flex-wrap gap-8 mb-8">
        {classrooms.map((classroom) => (
          <ClassroomCard
            isTeacher={isTeacher}
            key={classroom.id}
            classroom={classroom}
          />
        ))}
      </ul>
    </div>
  );
}
