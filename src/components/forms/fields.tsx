import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const selectClass = "h-9 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-sm text-slate-900";

export function TextField({ label, name, ...props }: { label: string; name: string } & React.ComponentProps<"input">) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
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
