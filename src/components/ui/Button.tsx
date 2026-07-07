import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "success" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800",
  success: "bg-green-600 hover:bg-green-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}