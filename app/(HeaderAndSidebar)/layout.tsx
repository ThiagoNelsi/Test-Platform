import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { getUnfinishedTests } from "@/lib/testService";
import NewClassroomModal from "../components/NewClassroomModal";

interface Props {
    children: React.ReactNode;
}

export default async function Layout({ children }: Props) {
    const todos = await getUnfinishedTests();

    if (!todos) return null;

    return (
        <>
            <Header />
            <Sidebar todos={todos} />
            <NewClassroomModal />
            <main className="fixed w-full top-16 h-[calc(100vh-4rem)] overflow-auto">
                {children}
            </main>
        </>
    );
}