
import ClassroomList from "@/src/components/classroom-list";
import { SwitcherProvider } from "@/src/context/switcher-context";
import { useHomeController } from "@/src/controllers/home-controller";
import { QueryError, QueryLoading } from "@/src/components/query-state";
import { TeacherActions } from "./teacher-actions";

export default function Classroom() {
  const { ownedClasses, loading, error, refetch } = useHomeController();

  if (loading) {
    return <QueryLoading message="Carregando turmas..." />;
  }

  if (error) {
    return <QueryError message="Erro ao carregar turmas." onRetry={refetch} />;
  }

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
