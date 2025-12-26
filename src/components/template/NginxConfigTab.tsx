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
    const upstreams: string[] = [];
    const locations: string[] = [];

    // Generate upstream blocks for each service
    template.services.forEach((service) => {
      upstreams.push(`    upstream ${service.name} {
        server ${service.name}:${template.sharedPort};
    }`);
    });

    // Generate location blocks from service routes
    template.services.forEach((service) => {
      service.routes.forEach((route) => {
        locations.push(`        location ${route.path} {
            proxy_pass http://${service.name};
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }`);
      });
    });

    // Also add routes from ingresses if they have additional rules
    template.ingresses.forEach((ingress) => {
      if (ingress.mode === 'nginx-gateway') {
        ingress.rules.forEach((rule) => {
          // Check if this route already exists from service routes
          const exists = template.services.some((s) =>
            s.routes.some((r) => r.path === rule.path)
          );
          if (!exists) {
            locations.push(`        location ${rule.path} {
            proxy_pass http://${rule.serviceName};
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }`);
          }
        });
      }
    });

    if (upstreams.length === 0) {
      return `# No services configured yet
# Add services with routes to generate nginx configuration`;
    }

    return `# Auto-generated nginx configuration for ${template.name}
# This configuration is generated based on your template structure

worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript 
               application/rss+xml application/atom+xml image/svg+xml;

    # Upstream definitions
${upstreams.join('\n\n')}

    server {
        listen ${template.sharedPort};
        server_name _;

        # Health check endpoint
        location /nginx-health {
            access_log off;
            return 200 'healthy';
            add_header Content-Type text/plain;
        }

        # Service routes
${locations.length > 0 ? locations.join('\n\n') : '        # No routes configured yet'}

        # Default fallback
        location / {
            return 404 '{"error": "Not Found", "message": "No route matched"}';
            add_header Content-Type application/json;
        }
    }
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
            Generated nginx.conf based on your template structure
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
