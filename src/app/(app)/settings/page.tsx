import { requireSuperAdmin } from "@/lib/auth";
import { getConference, getVenueOverviews } from "@/lib/data/queries";
import { ConferenceForm, DemoDataControls } from "./settings-forms";
import { IntegrationStatus } from "@/components/settings/integration-status";

export default async function SettingsPage() {
  await requireSuperAdmin();
  const [conference, venues] = await Promise.all([getConference(), getVenueOverviews()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Conference configuration and demo data.</p>
      </div>

      <section className="rounded-2xl border border-slate-200/70 bg-white shadow-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Conference</h2>
        {conference ? (
          <ConferenceForm conference={conference} />
        ) : (
          <p className="text-sm text-slate-500">No conference yet. Seed the demo data to create one.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/70 bg-white shadow-card p-5">
        <h2 className="text-sm font-semibold text-slate-900">Demo data</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Creates 18 venues (9 Medical &amp; Healthcare, 5 Education, 4 Industry) with coordinators and meetings.
          All records are tagged as simulated; meeting links point to a placeholder domain, not Microsoft Teams.
        </p>
        <DemoDataControls hasData={venues.length > 0} />
      </section>

      <IntegrationStatus />
    </div>
  );
}
