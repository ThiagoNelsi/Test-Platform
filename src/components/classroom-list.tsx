import type { ClassroomWithOwner } from "@/lib/classroomService";
import { AppLink as Link } from "@/src/components/router-helpers";
import { FaRegCopy } from "react-icons/fa";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useNewClassroomModal } from "../context/new-classroom-modal-context";
import { successToast } from "@/lib/toasters";

const ClassroomCard = ({
  classroom,
  isTeacher,
}: {
  classroom: ClassroomWithOwner;
  isTeacher: boolean;
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(classroom.code);
    successToast("Código copiado!");
  };

  return (
    <li className="bg-ash_gray-900 border-[1px] border-ash_gray-500 min-w-[300px] md:min-w-[400px] h-40 flex flex-col gap-2 hover:shadow-lg rounded transition cursor-pointer">
      <Link to={`/classroom/${classroom.id}`} className="size-full p-4">
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

  const { setOpen } = useNewClassroomModal();

  return (
    <div className="mx-auto">
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="mb-5"
      >
        <Plus /> Criar turma
      </Button>
      <ul className="flex flex-wrap gap-8 mb-8">
        {classrooms.length > 0 ? (
          classrooms.map((classroom) => (
            <ClassroomCard
              isTeacher={isTeacher}
              key={classroom.id}
              classroom={classroom}
            />
          ))
        ) : (
          <li className="w-full rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhuma turma encontrada. Crie uma turma para começar.
          </li>
        )}
      </ul>
    </div>
  );
}
