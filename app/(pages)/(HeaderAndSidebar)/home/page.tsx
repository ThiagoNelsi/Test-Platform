import Component from "./component";
import { getClassrooms } from "@/lib/classroomService";
import { SwitcherProvider } from "@/app/context/switcher-context";
import { tryCatch } from "@/lib/try-catch";

export default async function Classroom() {
  const { data: response, error } = await tryCatch(getClassrooms());

  if (!response || error) return null;

  const { ownedClasses } = response;

  return (
    <SwitcherProvider>
      <Component ownedClasses={ownedClasses} />
    </SwitcherProvider>
  );
}
