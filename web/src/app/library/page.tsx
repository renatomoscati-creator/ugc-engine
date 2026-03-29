import { getDb } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { AssetCard } from "@/components/asset-card";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const allAssets = db
    .select()
    .from(assets)
    .orderBy(desc(assets.createdAt))
    .limit(100)
    .all();

  const filtered = params.status
    ? allAssets.filter((a) => a.assetType === params.status)
    : allAssets;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} assets</p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No assets yet — start a production job from the Scripts page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={{
                id: asset.id,
                assetType: asset.assetType,
                filePath: asset.filePath,
                createdAt: asset.createdAt,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
