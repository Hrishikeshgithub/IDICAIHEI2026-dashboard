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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Conference configuration and demo data.</p>
      </div>

      <section className="glass rounded-3xl p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Conference</h2>
        {conference ? (
          <ConferenceForm conference={conference} />
        ) : (
          <p className="text-sm text-slate-500">No conference yet. Seed the demo data to create one.</p>
        )}
      </section>

      <section className="glass rounded-3xl p-5">
        <h2 className="text-sm font-semibold text-slate-900">Demo data</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Creates the demo programme: 24 sessions over two days across three tracks (AI in Healthcare, Education, Industry),
          with their halls, session chairs, rapporteurs (as coordinators) and paper IDs. Day 1 starts in progress; Day 2 is upcoming.
          All records are tagged as simulated; meeting links point to a placeholder domain, not Microsoft Teams.
        </p>
        <DemoDataControls hasData={venues.length > 0} />
      </section>

      <IntegrationStatus />
    </div>
  );
}
