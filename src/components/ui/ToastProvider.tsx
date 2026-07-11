"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ToastContext,
  ToastMessage,
  ToastType,
} from "@/hooks/useToast";

type InternalToast = ToastMessage & {
  duration: number;
  remaining: number;
  startedAt: number;
};

const DEFAULT_DURATION = 8000;

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

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<InternalToast[]>([]);

  const timers = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  const removeToast = useCallback((id: string) => {
    const timer = timers.current[id];

    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }

    setToasts((current) =>
      current.filter((toast) => toast.id !== id)
    );
  }, []);

  const startTimer = useCallback(
    (id: string, duration: number) => {
      const existingTimer = timers.current[id];

      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      timers.current[id] = setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  const addToast = useCallback(
    (
      type: ToastType,
      title: string,
      description?: string,
      duration = DEFAULT_DURATION
    ) => {
      const id = crypto.randomUUID();
      const safeDuration = Math.max(1000, duration);

      const toast: InternalToast = {
        id,
        type,
        title,
        description,
        duration: safeDuration,
        remaining: safeDuration,
        startedAt: Date.now(),
      };

      setToasts((current) => [...current, toast]);
      startTimer(id, safeDuration);
    },
    [startTimer]
  );

  const pauseToast = useCallback((id: string) => {
    const timer = timers.current[id];

    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }

    setToasts((current) =>
      current.map((toast) => {
        if (toast.id !== id) {
          return toast;
        }

        const elapsed = Date.now() - toast.startedAt;
        const remaining = Math.max(
          1000,
          toast.remaining - elapsed
        );

        return {
          ...toast,
          remaining,
        };
      })
    );
  }, []);

  const resumeToast = useCallback(
    (id: string) => {
      let remaining = DEFAULT_DURATION;

      setToasts((current) =>
        current.map((toast) => {
          if (toast.id !== id) {
            return toast;
          }

          remaining = toast.remaining;

          return {
            ...toast,
            startedAt: Date.now(),
          };
        })
      );

      startTimer(id, remaining);
    },
    [startTimer]
  );

  const value = useMemo(
    () => ({
      success: (
        title: string,
        description?: string,
        duration?: number
      ) =>
        addToast(
          "success",
          title,
          description,
          duration
        ),

      error: (
        title: string,
        description?: string,
        duration?: number
      ) =>
        addToast(
          "error",
          title,
          description,
          duration
        ),

      info: (
        title: string,
        description?: string,
        duration?: number
      ) =>
        addToast(
          "info",
          title,
          description,
          duration
        ),

      warning: (
        title: string,
        description?: string,
        duration?: number
      ) =>
        addToast(
          "warning",
          title,
          description,
          duration
        ),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed right-6 top-6 z-50 w-[calc(100%-3rem)] max-w-96 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onMouseEnter={() => pauseToast(toast.id)}
            onMouseLeave={() => resumeToast(toast.id)}
            className={`rounded-2xl border p-4 shadow-lg transition-all duration-200 ${styles[toast.type]}`}
          >
            <div className="flex items-start gap-3">
              <div className="text-xl">
                {icons[toast.type]}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-bold">
                  {toast.title}
                </div>

                {toast.description && (
                  <div className="mt-1 text-sm leading-5 opacity-80">
                    {toast.description}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Close notification"
                className="rounded-lg px-2 py-1 text-lg leading-none opacity-60 transition hover:bg-black/5 hover:opacity-100"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}