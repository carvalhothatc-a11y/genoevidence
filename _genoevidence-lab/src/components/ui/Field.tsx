import type { ComponentProps, ReactNode } from "react";

const inputCls =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/80 focus-visible:border-accent";

export function Field({ label, hint, error, children, htmlFor }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted" id={`${htmlFor}-hint`}>{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-danger" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}
export function TextArea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${inputCls} min-h-24 ${props.className ?? ""}`} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}
