"use client";

import { Button } from "@/app/components/ui/button";
import { useCreateTest } from "@/app/context/create-test-context";
import { IoIosRocket } from "react-icons/io";
import { SlNote } from "react-icons/sl";

type FormActionsProps = {
  handlePublish: () => void;
  handleSchedulePublish: () => void;
  handleSave: (autoSave?: boolean) => Promise<void>;
};

export const FormActions = ({
  handlePublish,
  handleSchedulePublish,
  handleSave,
}: FormActionsProps) => {
  const { enablePublishDate, publishDate } = useCreateTest();

  return (
    <div className="flex flex-col gap-6">
      {enablePublishDate && publishDate ? (
        <Button
          onClick={handleSchedulePublish}
          className="flex-[3] bg-verdigris-400 hover:bg-verdigris-300"
        >
          <IoIosRocket /> Agendar publicação
        </Button>
      ) : (
        <Button
          onClick={handlePublish}
          className="flex-[3] bg-verdigris-400 hover:bg-verdigris-300"
        >
          <IoIosRocket /> Publicar prova
        </Button>
      )}
      <Button
        onClick={() => handleSave(false)}
        className="flex-[1] bg-gray-400 hover:bg-gray-500"
      >
        <SlNote /> Salvar rascunho
      </Button>
    </div>
  );
};
