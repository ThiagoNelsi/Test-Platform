import { useCreateTest } from "@/src/context/create-test-context";
import { useCreateTestController } from "@/src/controllers/create-test-controller";
import { FormActions } from "./components/form-actions";
import { PublicationSection } from "./components/publication-section";
import { QuestionsSection } from "./components/questions-section";
import { TestDetailsSection } from "./components/test-details-section";
import { QueryError, QueryLoading } from "@/src/components/query-state";

export default function CreateTestForm() {
  const createTestContext = useCreateTest();
  const {
    test,
    handleAddClassroom,
    handlePublish,
    handleSchedulePublish,
    handleSave,
    loading,
    error,
    refetch,
  } = useCreateTestController(createTestContext);

  if (error) {
    return <QueryError message="Não foi possível carregar a prova." onRetry={refetch} />;
  }

  if (loading || !test) {
    return <QueryLoading message="Carregando editor da prova..." />;
  }

  return (
    <div className="flex flex-col gap-8 max-w-[800px] mx-auto py-6 px-5">
      <TestDetailsSection handleAddClassroom={handleAddClassroom} />
      <QuestionsSection />
      <PublicationSection />
      <FormActions
        handlePublish={handlePublish}
        handleSchedulePublish={handleSchedulePublish}
        handleSave={handleSave}
      />
    </div>
  );
}
