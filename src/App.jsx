import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router";
import Layout from "./Layout";
import ProtectedRoute from "./Auth/ProtectedR";
import PublicRoute from "./Auth/PublicRoute";
import ProtectMlmProfile from "./pages/SelectCompany/ProtectMlmProfile";
import ProtectSelectComp from "./pages/SelectCompany/ProtectSelectComp";
import Home from "./pages/Home";
import AllTemplates from "./pages/Homepage/Component/AllTemplates";
import Onboarding from "./Onboarding";
import SplashScreen from "./SplashScreen";

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
const SalesExecutiveForm = lazy(
  () => import("./pages/mainform/components/SalesExecutiveForm"),
);
const MainEditor = lazy(() => import("./pages/Editor/MainEditor"));
const Myprofile = lazy(() => import("./pages/Profile/Myprofile"));
const Reporting = lazy(() => import("./pages/Reporting/Reporting"));

// Preload functions — called eagerly in the background so navigation is instant
const _preloadEditor = () => import("./pages/Editor/MainEditor");
const _preloadForm   = () => import("./pages/mainform/components/SalesExecutiveForm");

const progressStyle = `
  @keyframes routeBarFill {
    0%   { transform: scaleX(0);   opacity: 1; }
    70%  { transform: scaleX(0.8); opacity: 1; }
    100% { transform: scaleX(0.95); opacity: 1; }
  }
  @keyframes routeBarDone {
    0%   { transform: scaleX(1); opacity: 1; }
    100% { transform: scaleX(1); opacity: 0; }
  }
  .route-bar-fill {
    position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 9999;
    background: linear-gradient(90deg, #0088DA 0%, #4f6fcf 50%, #0088DA 100%);
    background-size: 200% 100%;
    transform-origin: left center;
    transform: scaleX(0);
    box-shadow: 0 0 8px rgba(26,58,138,0.4);
  }
  .route-bar-fill.active {
    animation: routeBarFill 6s cubic-bezier(0.1, 0.05, 0.3, 1) forwards;
  }
  .route-bar-fill.done {
    transform: scaleX(1);
    animation: routeBarDone 0.3s ease forwards;
  }
`;

function RouteProgressBar() {
  const location = useLocation();
  const [phase, setPhase] = useState(null);
  const timerRef = useRef(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    clearTimeout(timerRef.current);
    setPhase("active");
    timerRef.current = setTimeout(() => {
      setPhase("done");
      timerRef.current = setTimeout(() => setPhase(null), 320);
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [location.pathname]);

  if (!phase) return null;
  return (
    <>
      <style>{progressStyle}</style>
      <div className={`route-bar-fill ${phase}`} />
    </>
  );
}

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

// ── Keep-Alive pages ────────────────────────────────────────────────────────
// Home ("/") and AllTemplates ("/alltemp") are NEVER unmounted after first visit.
// They are hidden with CSS display:none — all img DOM nodes stay in memory.
// Coming back is instant: zero network, zero decode, zero skeleton flash.
//
// IMPORTANT: We do NOT use <ProtectedRoute>/<ProtectMlmProfile> here.
// Those render <Navigate> when auth fails, which triggers React Router
// to call navigate() → location changes → App re-renders → <Navigate> again
// → infinite reload loop of hundreds of full-page reloads.
// Instead we inline the same synchronous localStorage checks with a plain
// early-return — no React Router side effects at all.
function isUserAuthorized() {
  if (!localStorage.getItem("usermlm")) return false;
  const hasMlm      = !!localStorage.getItem("mlmProfile");
  const hasCompany  = !!localStorage.getItem("selectedCompany");
  return hasMlm || hasCompany;
}

function PersistentPages({ pathname }) {
  const isHome    = pathname === "/";
  const isAllTemp = pathname === "/alltemp";

  // Lazy-mount: only put a page in the DOM when the user first visits it
  // and they are authorized. After that it is never unmounted — just hidden.
  // Initialise synchronously so authorised users see Home/AllTemplates on the
  // very first render — no blank-flash while waiting for a useEffect tick.
  const [homeReady,    setHomeReady]    = useState(() => isHome    && isUserAuthorized());
  const [allTempReady, setAllTempReady] = useState(() => isAllTemp && isUserAuthorized());

  useEffect(() => {
    if (!isUserAuthorized()) return;
    if (isHome    && !homeReady)    setHomeReady(true);
    if (isAllTemp && !allTempReady) setAllTempReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHome, isAllTemp]);

  // Preload Editor + Form chunks in the background once home is visible,
  // so tapping a tile navigates instantly instead of waiting for download.
  useEffect(() => {
    if (!homeReady) return;
    const t = setTimeout(() => {
      _preloadEditor();
      _preloadForm();
    }, 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeReady]);

  if (!homeReady && !allTempReady) return null;

  const isKeepAlive = isHome || isAllTemp;

  return (
    // Outer wrapper covers full screen.
    // display:none when on any other route so it never overlaps regular pages.
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        display: isKeepAlive ? "block" : "none",
        zIndex: isKeepAlive ? 1 : -1,
      }}
    >
      {homeReady && (
        <div style={{ height: "100%", display: isHome ? "block" : "none" }}>
          <Layout>
            <Home />
          </Layout>
        </div>
      )}

      {allTempReady && (
        <div style={{ height: "100%", display: isAllTemp ? "block" : "none" }}>
          <Layout>
            <AllTemplates />
          </Layout>
        </div>
      )}
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [splashDone, setSplashDone] = useState(false);

  const showOnboarding =
    !localStorage.getItem("onboardingDone") &&
    !localStorage.getItem("usermlm");

  useEffect(() => {
    const handleBackPressed = () => navigate(-1);
    window.addEventListener("webviewBackPressed", handleBackPressed);
    return () =>
      window.removeEventListener("webviewBackPressed", handleBackPressed);
  }, [navigate]);

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;

  if (showOnboarding) return <Onboarding />;

  return (
    <>
      <RouteProgressBar />

      {/* ── Standard routes — mount/unmount normally ── */}
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
          <Route
            path="/reporting"
            element={
              <ProtectedRoute>
                <ProtectMlmProfile>
                  <Layout>
                    <Reporting />
                  </Layout>
                </ProtectMlmProfile>
              </ProtectedRoute>
            }
          />

          {/* "/" and "/alltemp" — auth guard only; actual content rendered by PersistentPages.
              The null child means authorised users see nothing from Routes here — PersistentPages
              renders the real Layout+page via the keep-alive layer above. */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProtectMlmProfile>{null}</ProtectMlmProfile>
              </ProtectedRoute>
            }
          />
          <Route
            path="/alltemp"
            element={
              <ProtectedRoute>
                <ProtectMlmProfile>{null}</ProtectMlmProfile>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>

      {/* ── Keep-alive pages: Home + AllTemplates always stay in DOM ── */}
      <PersistentPages pathname={pathname} />
    </>
  );
}

export default App;
