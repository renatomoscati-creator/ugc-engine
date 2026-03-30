"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActiveAction = "approve" | "reject" | "delete" | "override" | null;

export function IdeaActions({
  ideaId,
  currentStatus,
  fitScore,
}: {
  ideaId: number;
  currentStatus: string;
  fitScore?: number | null;
}) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveAction>(null);

  async function handleApprove() {
    if (active) return;
    setActive("approve");
    try {
      await fetch("/api/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ideaId, status: "approved" }),
      });
      router.refresh();
    } finally {
      setActive(null);
    }
  }

  async function handleReject() {
    if (active) return;
    setActive("reject");
    try {
      await fetch("/api/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ideaId, status: "rejected" }),
      });
      router.refresh();
    } finally {
      setActive(null);
    }
  }

  async function handleOverride() {
    if (active) return;
    setActive("override");
    try {
      await fetch("/api/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ideaId, status: "generated" }),
      });
      router.refresh();
    } finally {
      setActive(null);
    }
  }

  async function handleDelete() {
    if (active) return;
    if (!window.confirm("Delete this idea? This cannot be undone.")) return;
    setActive("delete");
    try {
      await fetch(`/api/ideas?id=${ideaId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setActive(null);
    }
  }

  const isAutoRejected = currentStatus === "rejected" && fitScore !== null && fitScore !== undefined && fitScore < 70;

  return (
    <div className="flex items-center gap-1">
      {isAutoRejected && (
        <Button
          variant="ghost"
          size="sm"
          title="Override auto-rejection — move back to review"
          disabled={active !== null}
          onClick={handleOverride}
          className="h-7 px-2 text-xs text-orange-600 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-40"
        >
          {active === "override" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <><Undo2 className="h-3.5 w-3.5 mr-1" />Override</>
          )}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        title="Approve"
        disabled={currentStatus === "approved" || active !== null}
        onClick={handleApprove}
        className="h-7 w-7 p-0 text-green-600 hover:bg-green-50 hover:text-green-700 disabled:opacity-40"
      >
        {active === "approve" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        title="Reject"
        disabled={currentStatus === "rejected" || active !== null}
        onClick={handleReject}
        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
      >
        {active === "reject" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        title="Delete"
        disabled={active !== null}
        onClick={handleDelete}
        className="h-7 w-7 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
      >
        {active === "delete" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
