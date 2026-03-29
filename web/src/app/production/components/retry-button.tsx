"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RetryButton({ jobId }: { jobId: number }) {
  const router = useRouter();
  async function retry() {
    await fetch(`/api/production/${jobId}/retry`, { method: "POST" });
    router.refresh();
  }
  return (
    <Button variant="outline" size="sm" onClick={retry}>
      Retry
    </Button>
  );
}
