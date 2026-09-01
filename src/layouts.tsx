import { Link, Outlet } from "react-router-dom";
import { NewClassroomModalProvider } from "@/app/context/new-classroom-modal-context";
import { SidebarProvider } from "@/app/context/sidebar-context";
import SessionProvider from "@/app/components/session-provider";
import { Toaster } from "@/app/components/ui/sonner";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import Header from "@/app/components/header";
import { Sidebar } from "@/app/components/sidebar";
import NewClassroomModal from "@/app/components/new-classroom-modal";

export function RootLayout() {
  return (
    <div className="min-h-screen antialiased">
      <Outlet />
      <Toaster position="top-center" className="whitespace-pre-wrap" />
    </div>
  );
}

export function AuthenticatedLayout() {
  return (
    <div className="flex h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div
        id="main-content"
        className="flex flex-1 flex-col transition-all duration-300 ease-in-out"
      >
        <main className="flex-1">
          <Header />
          <div className="container mx-auto px-10 py-4">
            <Outlet />
          </div>
        </main>
      </div>
      <NewClassroomModal />
    </div>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <NewClassroomModalProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </NewClassroomModalProvider>
      </SidebarProvider>
    </SessionProvider>
  );
}

export function RouteLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <p role="status" className="text-sm text-muted-foreground">
        Carregando...
      </p>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-lg rounded-lg border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Erro 404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          O endereço que você tentou acessar não existe.
        </p>
        <Link
          to="/home"
          className="mt-6 inline-flex text-sm font-medium text-primary underline underline-offset-4"
        >
          Voltar para o início
        </Link>
      </section>
    </main>
  );
}
