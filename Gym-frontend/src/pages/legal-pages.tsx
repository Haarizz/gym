// Standalone, no-auth pages linked from the login footer (Privacy Policy, Terms
// of Service, Support) — opened in a new tab via window.open, so each renders on
// its own with no app chrome. Reached via the same window.location.pathname
// check App.tsx already uses for /emergency/:id, not React Router: these must
// render before the authentication gate, and login.tsx isn't inside the
// authenticated <Routes> tree at all.
import React from 'react';
import { Dumbbell, Mail, Phone, MessageCircle } from 'lucide-react';

const UPDATED_DATE = 'September 15, 2026';

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <div className="bg-primary rounded-xl p-3">
            <Dumbbell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">GymBios</h1>
            <p className="text-xs text-gray-500">Business Operating System</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{title}</h2>
          <p className="text-sm text-gray-500 mb-6">Last updated: {UPDATED_DATE}</p>
          <div className="text-gray-700 space-y-4">
            {children}
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">© 2026 GymBios. All rights reserved.</p>
      </div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        GymBios ("we", "us", "our") provides gym and fitness business management
        software to gym owners and their staff. This policy explains what
        information we collect through the platform and how it's used.
      </p>

      <h3 className="text-base font-semibold text-gray-900 pt-2">Information we collect</h3>
      <ul className="list-disc pl-4 space-y-1">
        <li>Account details you provide when signing up or being added as staff (name, email, phone).</li>
        <li>Gym operational data entered into the platform (members, bookings, payments, attendance).</li>
        <li>Basic usage data (login times, pages visited) used to keep the service reliable and secure.</li>
      </ul>

      <h3 className="text-base font-semibold text-gray-900 pt-2">How we use it</h3>
      <p>
        Data is used to operate the platform for the gym that entered it, provide
        support when requested, and improve the product. Each gym's data is kept
        in its own isolated database — it is never shared across gyms or used to
        train external models without explicit consent.
      </p>

      <h3 className="text-base font-semibold text-gray-900 pt-2">Data retention & deletion</h3>
      <p>
        Gym data is retained for as long as the account is active. A gym owner or
        platform admin can request permanent deletion of a gym's data at any
        time by contacting support.
      </p>

      <h3 className="text-base font-semibold text-gray-900 pt-2">Contact</h3>
      <p>Questions about this policy can be sent to <a href="mailto:privacy@gymbios.com" className="text-primary hover:underline">privacy@gymbios.com</a>.</p>
    </LegalShell>
  );
}

export function TermsOfServicePage() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        These terms govern access to and use of the GymBios platform by gym
        owners, their staff, and members. By creating an account or using
        GymBios, you agree to these terms.
      </p>

      <h3 className="text-base font-semibold text-gray-900 pt-2">Use of the service</h3>
      <p>
        GymBios is provided to help gyms manage members, bookings, staff,
        billing, and related operations. Accounts are for the use of the gym
        that created them; credentials should not be shared outside your
        organization.
      </p>

      <h3 className="text-base font-semibold text-gray-900 pt-2">Subscription & billing</h3>
      <p>
        Access is provided on the plan selected at signup. Fees are billed in
        advance on the agreed cycle. Cancelling stops future billing; it does
        not retroactively refund the current period unless required by law.
      </p>

      <h3 className="text-base font-semibold text-gray-900 pt-2">Your data</h3>
      <p>
        You retain ownership of the operational data you enter into your gym's
        account. We act as the processor of that data for the purpose of
        providing the service — see the Privacy Policy for details.
      </p>

      <h3 className="text-base font-semibold text-gray-900 pt-2">Availability</h3>
      <p>
        We aim for high availability but do not guarantee uninterrupted access.
        Planned maintenance is communicated in advance where possible.
      </p>

      <h3 className="text-base font-semibold text-gray-900 pt-2">Contact</h3>
      <p>Questions about these terms can be sent to <a href="mailto:legal@gymbios.com" className="text-primary hover:underline">legal@gymbios.com</a>.</p>
    </LegalShell>
  );
}

export function SupportPage() {
  return (
    <LegalShell title="Support">
      <p>
        Need help with your GymBios account? Here's how to reach us.
      </p>

      <div className="grid gap-4 pt-2">
        <a
          href="mailto:support@gymbios.com"
          className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <div className="bg-primary/10 p-2 rounded-lg">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Email support</p>
            <p className="text-sm text-gray-500">support@gymbios.com — replies within 1 business day</p>
          </div>
        </a>

        <a
          href="tel:+911234567890"
          className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <div className="bg-primary/10 p-2 rounded-lg">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Phone support</p>
            <p className="text-sm text-gray-500">+91 123 456 7890 — Mon–Sat, 9am–7pm IST</p>
          </div>
        </a>

        <a
          href="https://wa.me/911234567890"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <div className="bg-primary/10 p-2 rounded-lg">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-gray-900">WhatsApp</p>
            <p className="text-sm text-gray-500">Chat with our support team</p>
          </div>
        </a>
      </div>

      <h3 className="text-base font-semibold text-gray-900 pt-4">Common questions</h3>
      <div className="space-y-3">
        <div>
          <p className="font-medium text-gray-900">I forgot my password</p>
          <p className="text-sm text-gray-600">Ask your gym's admin to reset your login from Staff Management, or contact support if you are the admin.</p>
        </div>
        <div>
          <p className="font-medium text-gray-900">I want a demo for my gym</p>
          <p className="text-sm text-gray-600">Use "Request a demo" on the login page to get started.</p>
        </div>
      </div>
    </LegalShell>
  );
}
