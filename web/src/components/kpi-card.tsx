import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  unit?: string;
}

export function KpiCard({ label, value, delta, unit }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold">
            {value}{unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
          </span>
          {delta !== undefined && (
            <Badge
              variant="outline"
              className={delta >= 0 ? "text-green-500 border-green-500" : "text-red-500 border-red-500"}
            >
              {delta >= 0 ? "+" : ""}{delta}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
