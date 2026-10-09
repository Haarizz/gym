import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CurrencyProvider } from "./utils/currency";
import { BranchProvider } from "./utils/branch-context";
import { PrivacyPolicyPage, TermsOfServicePage, SupportPage } from "./pages/legal-pages";
import { PublicLeadFormPage } from "./pages/public-lead-form";
import { applyResponsiveScope } from "./utils/responsive-scope";
import "./styles/index.css";
import "./styles/snapshot-gaps.css";
import "./styles/responsive.css";

// Set before the first paint so a POS deep link never flashes the responsive layout.
applyResponsiveScope(window.location.pathname);

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
// Public gym lead forms (/f/{formKey}) are opened by strangers from social-media
// ads — same standalone treatment as the legal pages above.
const leadFormMatch = path.match(/^\/f\/([A-Za-z0-9]+)\/?$/);

if (leadFormMatch) {
  root.render(<PublicLeadFormPage formKey={leadFormMatch[1]} />);
} else if (path === '/privacy-policy') {
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

