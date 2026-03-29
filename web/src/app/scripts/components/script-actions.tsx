"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export function ScriptActions({ scriptId, status }: { scriptId: number; status: string }) {
  const router = useRouter();

  async function action(actionName: string) {
    await fetch(`/api/scripts/${scriptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName }),
    });
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === "generated" && (
          <>
            <DropdownMenuItem onClick={() => action("approve")}>Approve</DropdownMenuItem>
            <DropdownMenuItem onClick={() => action("reject")}>Reject</DropdownMenuItem>
          </>
        )}
        {status === "approved_for_production" && (
          <DropdownMenuItem onClick={() => action("send_to_production")}>
            Send to Production
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
