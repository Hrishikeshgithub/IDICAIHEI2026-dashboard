import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const selectClass = "h-10 w-full rounded-2xl border border-slate-900/10 bg-white/60 px-3 backdrop-blur dark:border-white/10 text-sm text-slate-900";

export function TextField({ label, name, ...props }: { label: string; name: string } & React.ComponentProps<"input">) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="h-10 rounded-2xl border-slate-900/10 bg-white/60 px-3 backdrop-blur dark:border-white/10" {...props} />
    </div>
  );
}

export function SelectField({
  label, name, defaultValue, children, required,
}: { label: string; name: string; defaultValue?: string | null; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} defaultValue={defaultValue ?? ""} required={required} className={selectClass}>
        {children}
      </select>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  return message ? <p role="alert" className="text-sm text-red-600">{message}</p> : null;
}
