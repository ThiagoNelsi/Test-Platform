
import { Suspense } from "react";
import { CreateTestProvider } from "@/src/context/create-test-context";
import CreateTestForm from "./create-test-form";

export default function CreateTest() {
  return (
    <CreateTestProvider>
      <Suspense fallback={<div>Carregando...</div>}>
        <CreateTestForm />
      </Suspense>
    </CreateTestProvider>
  );
}
