import { Badge } from "../ui/badge";

export function ConfidenceBadge({ score }: { score: number }) {
  const variant = score > 80 ? "default" : score > 50 ? "secondary" : "destructive";
  
  return (
    <Badge variant={variant} className="text-xs px-2 py-0.5">
      {score}% Match
    </Badge>
  );
}
