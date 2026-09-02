
import Header from "@/src/components/header";
import { Sidebar } from "@/src/components/sidebar";
import NewClassroomModal from "../../components/new-classroom-modal";

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
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
