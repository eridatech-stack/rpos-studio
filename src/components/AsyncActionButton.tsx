"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger";

type AsyncActionButtonProps = {
  endpoint: string;
  body?: Record<string, unknown>;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";

  idleLabel: React.ReactNode;
  loadingLabel?: React.ReactNode;

  successTitle: string;
  successDescription?: string;
  errorTitle: string;
  defaultErrorMessage?: string;

  successToastDuration?: number;
  errorToastDuration?: number;

  confirmMessage?: string;

  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;

  refreshAfterSuccess?: boolean;
  redirectTo?: string;

  onSuccess?: (result: unknown) => void;
};

export function AsyncActionButton({
  endpoint,
  body,
  method = "POST",

  idleLabel,
  loadingLabel = "Processing...",

  successTitle,
  successDescription,
  errorTitle,
  defaultErrorMessage = "The operation could not be completed.",

  successToastDuration = 10000,
  errorToastDuration = 12000,

  confirmMessage,

  variant = "primary",
  className = "",
  disabled = false,

  refreshAfterSuccess = true,
  redirectTo,

  onSuccess,
}: AsyncActionButtonProps) {
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const toast = useToast();

  async function executeAction() {
    if (confirmMessage) {
      const confirmed = window.confirm(confirmMessage);

      if (!confirmed) {
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        toast.error(
          errorTitle,
          result?.error || defaultErrorMessage,
          errorToastDuration
        );

        return;
      }

      toast.success(
        successTitle,
        successDescription,
        successToastDuration
      );

      onSuccess?.(result);

      if (redirectTo) {
        router.push(redirectTo);
        return;
      }

      if (refreshAfterSuccess) {
        router.refresh();
      }
    } catch (error: unknown) {
      toast.error(
        errorTitle,
        error instanceof Error
          ? error.message
          : defaultErrorMessage,
        errorToastDuration
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={executeAction}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? loadingLabel : idleLabel}
    </Button>
  );
}