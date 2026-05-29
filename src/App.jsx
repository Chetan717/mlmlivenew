import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router";
import Layout from "./Layout";
import ProtectedRoute from "./Auth/ProtectedR";
import PublicRoute from "./Auth/PublicRoute";
import ProtectMlmProfile from "./pages/SelectCompany/ProtectMlmProfile";
import ProtectSelectComp from "./pages/SelectCompany/ProtectSelectComp";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() =>
  import("./Auth/Login").then((m) => ({ default: m.Login })),
);
const Signup = lazy(() =>
  import("./Auth/Signup").then((m) => ({ default: m.Signup })),
);
const Forgetpin = lazy(() =>
  import("./Auth/ForgetPin").then((m) => ({ default: m.Forgetpin })),
);
const Logout = lazy(() =>
  import("./Auth/Logout").then((m) => ({ default: m.Logout })),
);
const MainSubscription = lazy(
  () => import("./pages/Subscription/MainSubscription"),
);
const MlmProfile = lazy(() => import("./pages/Mymlmprofile/MlmProfile"));
const SelectComp = lazy(() => import("./pages/SelectCompany/SelectComp"));
const AllTemplates = lazy(
  () => import("./pages/Homepage/Component/AllTemplates"),
);
const SalesExecutiveForm = lazy(
  () => import("./pages/mainform/components/SalesExecutiveForm"),
);
const MainEditor = lazy(() => import("./pages/Editor/MainEditor"));
const Myprofile = lazy(() => import("./pages/Profile/Myprofile"));

function PageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-border border-t-accent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleBackPressed = () => navigate(-1);
    window.addEventListener("webviewBackPressed", handleBackPressed);
    return () =>
      window.removeEventListener("webviewBackPressed", handleBackPressed);
  }, [navigate]);

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route path="/forgetpin" element={<Forgetpin />} />
        <Route path="/logout" element={<Logout />} />

        <Route
          path="/selectcomp"
          element={
            <ProtectedRoute>
              <ProtectSelectComp>
                <Layout>
                  <SelectComp />
                </Layout>
              </ProtectSelectComp>
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ProtectMlmProfile>
                <Layout>
                  <Home />
                </Layout>
              </ProtectMlmProfile>
            </ProtectedRoute>
          }
        />

        <Route
          path="/alltemp"
          element={
            <ProtectedRoute>
              <ProtectMlmProfile>
                <Layout>
                  <AllTemplates />
                </Layout>
              </ProtectMlmProfile>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mlmprofile"
          element={
            <ProtectedRoute>
              <ProtectMlmProfile>
                <Layout>
                  <MlmProfile />
                </Layout>
              </ProtectMlmProfile>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mlmform"
          element={
            <ProtectedRoute>
              <ProtectMlmProfile>
                <Layout>
                  <SalesExecutiveForm />
                </Layout>
              </ProtectMlmProfile>
            </ProtectedRoute>
          }
        />

        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <ProtectMlmProfile>
                <Layout>
                  <MainEditor />
                </Layout>
              </ProtectMlmProfile>
            </ProtectedRoute>
          }
        />

        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <ProtectMlmProfile>
                <Layout>
                  <MainSubscription />
                </Layout>
              </ProtectMlmProfile>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProtectMlmProfile>
                <Layout>
                  <Myprofile />
                </Layout>
              </ProtectMlmProfile>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
