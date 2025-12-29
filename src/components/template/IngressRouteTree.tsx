import { Badge } from '@/components/ui/badge';

interface Route {
  path: string;
  serviceName: string;
}

interface IngressRouteTreeProps {
  routes: Route[];
}

export function IngressRouteTree({ routes }: IngressRouteTreeProps) {
  // Sort paths alphabetically descending
  const sortedRoutes = [...routes].sort((a, b) => 
    b.path.localeCompare(a.path)
  );

  return (
    <div className="ml-2 space-y-1">
      {sortedRoutes.map((route, idx) => (
        <div 
          key={idx} 
          className="flex items-center gap-2 text-sm py-1"
        >
          <div className="flex items-center gap-1 text-muted-foreground">
            <div className="w-4 h-px bg-border"></div>
            <div className="w-2 h-2 rounded-full bg-border"></div>
          </div>
          <span className="font-mono text-xs">{route.path}</span>
          <span className="text-muted-foreground">→</span>
          <Badge variant="secondary" className="text-xs">
            {route.serviceName}
          </Badge>
        </div>
      ))}
    </div>
  );
}
