import { lazy, Suspense } from "react";
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { useAuth } from "@/app/hooks/useAuth";
import {
  AuthenticatedLayout,
  NotFoundPage,
  RootLayout,
  RouteLoading,
} from "./layouts";

const LoginPage = lazy(() => import("@/app/(pages)/login/page"));
const HomePage = lazy(() =>
  import("@/app/(pages)/(HeaderAndSidebar)/home/page"),
);
const MaterialsPage = lazy(() =>
  import("@/app/(pages)/(HeaderAndSidebar)/materiais/page"),
);
const UploadMaterialsPage = lazy(() =>
  import("@/app/(pages)/(HeaderAndSidebar)/materiais/upload/page"),
);
const QuestionsPage = lazy(() =>
  import("@/app/(pages)/(HeaderAndSidebar)/questoes/page"),
);
const ExploreQuestionsPage = lazy(() =>
  import("@/app/(pages)/(HeaderAndSidebar)/questoes/explorar/page"),
);
const CreateQuestionPage = lazy(() =>
  import("@/app/(pages)/(HeaderAndSidebar)/questoes/criar/page"),
);
const TestsPage = lazy(() =>
  import("@/app/(pages)/(HeaderAndSidebar)/provas/page"),
);
const CreateTestPage = lazy(() =>
  import("@/app/(pages)/(HeaderAndSidebar)/provas/criar/page"),
);
const TestPage = lazy(() => import("@/app/(pages)/prova/[testId]/page"));

function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <RouteLoading />;

  return <Navigate to={user ? "/home" : "/login"} replace />;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<RootRedirect />} />
          <Route path="login" element={<LoginPage />} />

          <Route element={<AuthenticatedLayout />}>
            <Route path="home" element={<HomePage />} />
            <Route path="materiais" element={<MaterialsPage />} />
            <Route
              path="materiais/upload"
              element={<UploadMaterialsPage />}
            />
            <Route path="questoes" element={<QuestionsPage />} />
            <Route
              path="questoes/explorar"
              element={<ExploreQuestionsPage />}
            />
            <Route path="questoes/criar" element={<CreateQuestionPage />} />
            <Route path="provas" element={<TestsPage />} />
            <Route path="provas/criar" element={<CreateTestPage />} />
          </Route>

          <Route path="prova/:testId" element={<TestPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
