import { useCreateTest } from "@/app/context/create-test-context";
import { useCreateTestController } from "@/app/controllers/create-test-controller";
import { FormActions } from "./components/form-actions";
import { PublicationSection } from "./components/publication-section";
import { QuestionsSection } from "./components/questions-section";
import { TestDetailsSection } from "./components/test-details-section";

export default function CreateTestForm() {
  const createTestContext = useCreateTest();
  const {
    test,
    handleAddClassroom,
    handlePublish,
    handleSchedulePublish,
    handleSave,
  } = useCreateTestController(createTestContext);

  if (!test) return <div>Carregando...</div>;

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
