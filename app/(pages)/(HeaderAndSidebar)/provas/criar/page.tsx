"use client";

import { CreateTestProvider } from "@/app/context/create-test-context";
import CreateTestForm from "./create-test-form";

export default function CreateTest() {
  return (
    <CreateTestProvider>
      <CreateTestForm />
    </CreateTestProvider>
  );
}
