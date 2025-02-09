import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { getUnfinishedTests } from "@/lib/testService";

interface Props {
    children: React.ReactNode;
}

export default async function Layout({ children }: Props) {
    const userId = 1;

    const todos = await getUnfinishedTests(userId);

    return (
        <>
            <Header userId={1} />
            <Sidebar todos={todos} />
            <main className="fixed w-full top-16 h-[calc(100vh-4rem)]">
                {children}
            </main>
        </>
    );
}