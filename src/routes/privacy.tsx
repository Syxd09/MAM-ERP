import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & Security — MAM Industries ERP" },
      {
        name: "description",
        content: "How MAM Industries ERP collects, stores, and protects your business data.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Home
        </Link>
        <h1 className="font-display text-4xl font-bold mt-6 mb-2">Privacy &amp; Security</h1>
        <p className="text-muted-foreground mb-10">Last updated: June 2026</p>

        <section className="space-y-8 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold mb-2">Data we store</h2>
            <p>
              We store only the business records you enter — customers, quotations, jobs, calculator
              inputs, and the email/name of users invited to your workspace. We do not sell or share
              your data.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Access control</h2>
            <p>
              Every table is protected by row-level security. Authenticated users only see records
              permitted by their role (admin, manager, sales). Role assignments are managed
              server-side; clients cannot self-elevate.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Encryption</h2>
            <p>
              All traffic is served over HTTPS. Credentials are hashed; sessions use short-lived
              JWTs with automatic refresh. Database backups are encrypted at rest.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Your controls</h2>
            <p>
              You can export any module to CSV, edit or delete your records at any time, and request
              full account deletion by contacting your workspace admin.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Contact</h2>
            <p>
              Security questions or incident reports:{" "}
              <a className="underline" href="mailto:security@mam-industries.example">
                security@mam-industries.example
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
