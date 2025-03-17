import type { Classroom } from "@/prisma/generated/postgres";
import Component from "./component";
import { getClassrooms } from "@/lib/classroomService";
import { SwitcherProvider } from "@/app/context/switcher-context";

export default async function Classroom() {
  const response = await getClassrooms();

  if (!response) return null;

  const { ownedClasses } = response;

  return (
    <SwitcherProvider>
      <Component ownedClasses={ownedClasses} />
    </SwitcherProvider>
  );
}
