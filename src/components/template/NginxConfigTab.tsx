import { useMemo } from 'react';
import { TemplateWithRelations } from '@/types/helm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { MonacoEditor } from '@/components/ui/monaco-editor';

interface NginxConfigTabProps {
  template: TemplateWithRelations;
}

export function NginxConfigTab({ template }: NginxConfigTabProps) {
  const nginxConfig = useMemo(() => {
    const locations: string[] = [];

    // Generate location blocks from service routes
    template.services.forEach((service) => {
      service.routes.forEach((route) => {
        locations.push(`    location ${route.path} {
        proxy_pass http://${service.name}:${template.sharedPort};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }`);
      });
    });

    if (locations.length === 0) {
      return `# No services with routes configured yet
# Add services with routes to generate nginx server configuration

server {
    listen ${template.sharedPort};
    server_name _;

    # Add location blocks here when services with routes are configured
}`;
    }

    return `# Auto-generated nginx server configuration for ${template.name}
# This file (default.conf) will be mounted to /etc/nginx/conf.d/
# The nginx image's default nginx.conf includes files from /etc/nginx/conf.d/*.conf

map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen ${template.sharedPort};
    server_name _;

${locations.join('\n\n')}
}`;
  }, [template]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(nginxConfig);
    toast.success('Nginx configuration copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Nginx Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Server block configuration that will be mounted to /etc/nginx/conf.d/default.conf
          </p>
        </div>
        <Button variant="outline" onClick={copyToClipboard}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Config
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">default.conf</CardTitle>
          </div>
          <CardDescription>
            This configuration routes traffic to your services based on defined paths
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden border">
            <MonacoEditor
              value={nginxConfig}
              language="nginx"
              height="600px"
              readOnly={true}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Route Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {template.services.flatMap((service) =>
              service.routes.map((route, idx) => (
                <div
                  key={`${service.id}-${idx}`}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                >
                  <span className="font-mono">{route.path}</span>
                  <span className="text-muted-foreground">→ {service.name}:{template.sharedPort}</span>
                </div>
              ))
            )}
            {template.services.every((s) => s.routes.length === 0) && (
              <p className="text-sm text-muted-foreground">No routes defined in services</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
