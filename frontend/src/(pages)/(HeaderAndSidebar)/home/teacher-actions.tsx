
import { MdAdd } from "react-icons/md";
import { IoDocumentsOutline } from "react-icons/io5";
import { AppLink as Link } from "@/src/components/router-helpers";
import { FaTasks } from "react-icons/fa";

export const TeacherActions = () => {
  return (
    <div className="flex items-center gap-10 border-b-2 border-gray-100 mb-8 px-4 py-2 text-sm">
      <Link
        to="/provas/criar"
        className="flex gap-2 items-center hover:underline"
      >
        <MdAdd /> Criar prova
      </Link>
      <Link to="/provas" className="flex gap-2 items-center hover:underline">
        <IoDocumentsOutline /> Ver provas
      </Link>
      <Link
        to="/questoes"
        className="flex gap-2 items-center hover:underline"
      >
        <FaTasks /> Gerenciar questões
      </Link>
    </div>
  );
};
