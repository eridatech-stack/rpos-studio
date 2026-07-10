"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ToastContext,
  ToastMessage,
  ToastType,
} from "@/hooks/useToast";

const styles: Record<ToastType, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-orange-200 bg-orange-50 text-orange-800",
};

const icons: Record<ToastType, string> = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
  warning: "⚠️",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id = crypto.randomUUID();

      setToasts((current) => [
        ...current,
        { id, type, title, description },
      ]);

      setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 4000);
    },
    []
  );

  const value = useMemo(
    () => ({
      success: (title: string, description?: string) =>
        addToast("success", title, description),
      error: (title: string, description?: string) =>
        addToast("error", title, description),
      info: (title: string, description?: string) =>
        addToast("info", title, description),
      warning: (title: string, description?: string) =>
        addToast("warning", title, description),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed right-6 top-6 z-50 w-96 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border p-4 shadow-lg ${styles[toast.type]}`}
          >
            <div className="flex gap-3">
              <div className="text-xl">{icons[toast.type]}</div>

              <div>
                <div className="font-bold">{toast.title}</div>

                {toast.description && (
                  <div className="mt-1 text-sm opacity-80">
                    {toast.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}