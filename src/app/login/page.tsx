import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { BrandLockup } from "@/components/layout/brand-logo";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const notice =
    error === "not_provisioned"
      ? "Your account is signed in but has no dashboard role yet. Contact the administrator."
      : undefined;

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <AmbientBackground />
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="glass-strong w-full max-w-sm animate-in fade-in zoom-in-95 rounded-[28px] p-7 duration-500 motion-reduce:animate-none">
        <BrandLockup width={210} className="mb-6 block" />
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Sign in to run IDICAIHEI-2026 conference operations.</p>
        <LoginForm notice={notice} />
      </div>
    </main>
  );
}
