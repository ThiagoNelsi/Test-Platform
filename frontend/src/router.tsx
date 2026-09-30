import { lazy, Suspense } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { useAuth } from "@/src/hooks/useAuth";
import {
  AuthenticatedLayout,
  NotFoundPage,
  RootLayout,
  RouteLoading,
} from "./layouts";

const LoginPage = lazy(() => import("@/src/(pages)/login/page"));
const HomePage = lazy(() =>
  import("@/src/(pages)/(HeaderAndSidebar)/home/page"),
);
const ResourcesPage = lazy(() =>
  import("@/src/(pages)/(HeaderAndSidebar)/resources/page"),
);
const UploadResourcesPage = lazy(() =>
  import("@/src/(pages)/(HeaderAndSidebar)/resources/upload/page"),
);
const QuestionsPage = lazy(() =>
  import("@/src/(pages)/(HeaderAndSidebar)/questions/page"),
);
const ExploreQuestionsPage = lazy(() =>
  import("@/src/(pages)/(HeaderAndSidebar)/questions/explore/page"),
);
const CreateQuestionPage = lazy(() =>
  import("@/src/(pages)/(HeaderAndSidebar)/questions/create/page"),
);
const TestsPage = lazy(() =>
  import("@/src/(pages)/(HeaderAndSidebar)/tests/page"),
);
const CreateTestPage = lazy(() =>
  import("@/src/(pages)/(HeaderAndSidebar)/tests/create/page"),
);
const TestPage = lazy(() => import("@/src/(pages)/test/[testId]/page"));

function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <RouteLoading />;

  return <Navigate to={user ? "/home" : "/login"} replace />;
}

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoading />;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<RootRedirect />} />
          <Route element={<PublicOnlyRoute />}>
            <Route path="login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AuthenticatedLayout />}>
              <Route path="home" element={<HomePage />} />
              <Route path="materiais" element={<ResourcesPage />} />
              <Route
                path="materiais/upload"
                element={<UploadResourcesPage />}
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
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
