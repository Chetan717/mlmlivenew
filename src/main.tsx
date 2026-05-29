import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter, Routes, Route } from "react-router";
import { GeneralContext } from "./Context/GeneralContext.jsx";
import { Toast } from "@heroui/react";
import ScrollToTop from "./Pages/ScrollToTop.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GeneralContext>
      <Toast.Provider />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </GeneralContext>
  </StrictMode>,
);
