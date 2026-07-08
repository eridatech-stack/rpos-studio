"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function ActivatePromptButton({ promptId }: { promptId: string }) {
  const [loading, setLoading] = useState(false);

  async function activatePrompt() {
    setLoading(true);

    const response = await fetch("/api/prompts/activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: promptId }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Failed to activate prompt.");
      setLoading(false);
      return;
    }

    window.location.reload();
  }

  return (
    <Button
      variant="secondary"
      onClick={activatePrompt}
      disabled={loading}
    >
      {loading ? "Activating..." : "Activate Version"}
    </Button>
  );
}