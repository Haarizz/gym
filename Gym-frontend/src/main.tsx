import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CurrencyProvider } from "./utils/currency";
import { BranchProvider } from "./utils/branch-context";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <CurrencyProvider>
      <BranchProvider>
        <App />
      </BranchProvider>
    </CurrencyProvider>
  </BrowserRouter>
);

