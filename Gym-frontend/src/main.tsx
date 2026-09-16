import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CurrencyProvider } from "./utils/currency";
import { BranchProvider } from "./utils/branch-context";
import { PrivacyPolicyPage, TermsOfServicePage, SupportPage } from "./pages/legal-pages";
import "./styles/index.css";

// Legal/support pages linked from the login footer, opened in a new tab — must
// render standalone with zero app/auth context (App() assumes CurrencyProvider/
// BranchProvider are mounted and immediately starts auth-state effects; these
// three never need any of that). Checked here, before those providers or App
// itself mount, rather than inside App() itself: App() already calls
// useNavigate/useLocation unconditionally on every render, so an early return
// partway through its body — after some of its other hooks but before others —
// would violate the Rules of Hooks instead of just skipping the app shell.
const root = createRoot(document.getElementById("root")!);
const path = window.location.pathname;

if (path === '/privacy-policy') {
  root.render(<PrivacyPolicyPage />);
} else if (path === '/terms-of-service') {
  root.render(<TermsOfServicePage />);
} else if (path === '/support') {
  root.render(<SupportPage />);
} else {
  root.render(
    <BrowserRouter>
      <CurrencyProvider>
        <BranchProvider>
          <App />
        </BranchProvider>
      </CurrencyProvider>
    </BrowserRouter>
  );
}

