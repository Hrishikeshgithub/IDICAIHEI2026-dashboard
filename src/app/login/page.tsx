import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const notice =
    error === "not_provisioned"
      ? "Your account is signed in but has no dashboard role yet. Contact the administrator."
      : undefined;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/70 bg-white shadow-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Conference Operations Dashboard</h1>
        <p className="mb-5 mt-1 text-sm text-slate-500">Sign in to manage and monitor sessions.</p>
        <LoginForm notice={notice} />
      </div>
    </main>
  );
}
