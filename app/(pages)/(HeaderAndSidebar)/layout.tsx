import { getUserId } from "@/lib/auth";
import Header from "@/app/components/header";
import { Sidebar } from "@/app/components/sidebar";
import { getUnfinishedTests } from "@/lib/test-service";
import NewClassroomModal from "../../components/new-classroom-modal";
import { redirect } from "next/navigation";

interface Props {
  children: React.ReactNode;
}

export default async function Layout({ children }: Props) {
  const userId = await getUserId();

  if (!userId) {
    redirect("/login");
  }

  // const todos = await getUnfinishedTests();

  // if (!todos) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      <Sidebar />
      <div id="main-content" className="flex flex-col flex-1 transition-all duration-300 ease-in-out">
        <main className="flex-1">
          <Header />
          <div className="container mx-auto px-10 py-4">
            {children}
          </div>
        </main>
      </div>
      <NewClassroomModal />
    </div>
  );
}
