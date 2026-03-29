import { getDb } from "@/lib/db";
import { assets, scripts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const db = getDb();

  const asset = db.select().from(assets).where(eq(assets.id, parseInt(assetId))).get();
  if (!asset) notFound();

  const script = asset.scriptId
    ? db.select({ hook: scripts.hook }).from(scripts).where(eq(scripts.id, asset.scriptId)).get()
    : null;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Link href="/library" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Asset #{asset.id}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {asset.assetType === "video" && (
            <div>
              {/* TODO: implement /api/assets/[assetId]/stream for video streaming */}
              <video
                controls
                className="w-full rounded-lg bg-zinc-900"
                style={{ maxHeight: "400px" }}
              >
                <source src={`/api/assets/${asset.id}/stream`} />
              </video>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <Badge variant="outline">{asset.assetType}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-mono text-xs">{asset.createdAt}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">File path</p>
              <p className="font-mono text-xs break-all">{asset.filePath}</p>
            </div>
            {script?.hook && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Script hook</p>
                <p className="text-sm">{script.hook}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
