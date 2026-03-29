import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Film } from "lucide-react";

interface AssetCardProps {
  asset: {
    id: number;
    assetType: string;
    filePath: string;
    createdAt: string;
    pillarName?: string;
    platform?: string;
  };
}

export function AssetCard({ asset }: AssetCardProps) {
  return (
    <Link href={`/library/${asset.id}`}>
      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
        <div className="aspect-[9/16] bg-zinc-900 rounded-t-lg flex items-center justify-center">
          <Film className="h-8 w-8 text-zinc-600" />
        </div>
        <CardContent className="p-2 space-y-1">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">{asset.assetType}</Badge>
            {asset.pillarName && <Badge variant="secondary" className="text-xs">{asset.pillarName}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground font-mono">{asset.createdAt.slice(0, 10)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
