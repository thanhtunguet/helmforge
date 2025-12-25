import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Server,
  FileJson,
  Shield,
  Network,
  Download,
  Settings,
  FileCode,
  Layers,
} from 'lucide-react';

const sections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    content: `
## Quick Start Guide

1. **Create a Template** - Start by creating a new template from the dashboard. A template defines the structure of your Helm chart including registry settings, shared port, and optional features like Nginx Gateway or Redis.

2. **Add Services** - Define your microservices with their routes, environment variables, health checks, and resource configurations.

3. **Configure Resources** - Add ConfigMaps for configuration data and Secrets (TLS or Opaque) for sensitive information.

4. **Set Up Ingress** - Define ingress rules to expose your services with TLS support.

5. **Create a Version** - Generate a chart version with specific image tags and configuration values ready for deployment.
    `,
  },
  {
    id: 'templates',
    title: 'Templates',
    icon: Layers,
    content: `
## Understanding Templates

Templates are the foundation of your Helm charts. Each template defines:

- **Name & Description**: Identify your template
- **Shared Port**: The common port all services expose (e.g., 8080)
- **Registry Settings**: Container registry URL and project path
- **Registry Secret**: Credentials for pulling images
- **Feature Flags**: Enable/disable Nginx Gateway and Redis

### Creating a Template

1. Click "New Template" from the dashboard
2. Fill in the basic information
3. Configure your registry settings
4. Enable optional features as needed
5. Save and start adding resources
    `,
  },
  {
    id: 'services',
    title: 'Services',
    icon: Server,
    content: `
## Microservices Configuration

Services represent your application's microservices. Each service includes:

### Basic Settings
- **Name**: DNS-safe name (used for image name and Kubernetes resources)
- **Routes**: URL paths the service handles (e.g., /api/v1, /health)
- **Deploy as StatefulSet**: Option to deploy as StatefulSet instead of Deployment

### Environment Variables
Define environment variables that will be available in the container. Values are set when creating chart versions.

### Health Checks
- **Liveness Path**: Endpoint for liveness probes (e.g., /health)
- **Readiness Path**: Endpoint for readiness probes (e.g., /ready)

### Environment Sources
- **ConfigMaps**: Mount all keys from selected ConfigMaps as environment variables
- **Secrets**: Mount all keys from selected Opaque Secrets as environment variables

### Image Naming
Images follow the pattern: \`{registryUrl}/{registryProject}/{serviceName}:{tag}\`
    `,
  },
  {
    id: 'configmaps',
    title: 'ConfigMaps',
    icon: FileJson,
    content: `
## ConfigMap Management

ConfigMaps store non-sensitive configuration data as key-value pairs.

### Use Cases
- Application configuration files (config.yaml, settings.json)
- Environment-specific settings
- Feature flags

### Creating ConfigMaps

1. Go to the ConfigMaps tab in your template
2. Click "Add ConfigMap"
3. Enter a name and add keys
4. Values are assigned when creating chart versions

### Mounting to Services
ConfigMaps can be mounted to services in two ways:
- **As Environment Variables**: All keys become environment variables
- **As Volume Mounts**: Keys become files in a mounted directory (configured in chart generation)
    `,
  },
  {
    id: 'secrets',
    title: 'Secrets',
    icon: Shield,
    content: `
## Secret Management

Helm Designer supports three types of secrets:

### Registry Secret
Automatically created with your template. Contains credentials for pulling container images from your registry.

### TLS Secrets
For HTTPS/TLS termination at ingress level:
- **Name**: Secret identifier
- **Certificate (tls.crt)**: PEM-encoded certificate
- **Private Key (tls.key)**: PEM-encoded private key

### Opaque Secrets
For sensitive application data:
- **Name**: Secret identifier
- **Keys**: Define key names (e.g., DATABASE_PASSWORD, API_KEY)
- **Values**: Assigned when creating chart versions

### Mounting to Services
Opaque Secrets can be mounted to services to inject sensitive data as environment variables.
    `,
  },
  {
    id: 'ingresses',
    title: 'Ingresses',
    icon: Network,
    content: `
## Ingress Configuration

Ingresses define how external traffic reaches your services.

### Routing Modes
- **Via Nginx Gateway**: Routes through the Nginx Gateway service (requires enableNginxGateway)
- **Direct to Services**: Routes directly to individual services

### TLS Configuration
Enable HTTPS by:
1. Creating a TLS Secret with certificate and key
2. Enabling TLS on the ingress
3. Selecting the TLS secret

### Routing Rules
Define which paths route to which services:
- **Use All Routes**: Automatically include all routes from all services
- **Manual Rules**: Select specific service routes or enter custom paths

### Hosts
Default host is specified at template level. Actual hosts are assigned when creating chart versions.
    `,
  },
  {
    id: 'versions',
    title: 'Chart Versions',
    icon: Download,
    content: `
## Creating Chart Versions

Chart versions are deployable releases of your template with specific values.

### Version Configuration
- **Version Name**: Semantic version (e.g., 1.0.0)
- **App Version**: Application version tag

### Values to Set
When creating a version, you'll specify:
- **Image Tags**: Specific version tags for each service
- **Environment Values**: Actual values for service environment variables
- **ConfigMap Values**: Values for each ConfigMap key
- **Secret Values**: Values for TLS certificates and Opaque secret keys
- **Ingress Hosts**: Actual hostnames for each ingress

### Exporting Charts
Once created, you can download the complete Helm chart as a ZIP file containing:
- Chart.yaml
- values.yaml
- templates/ directory with all Kubernetes manifests
    `,
  },
  {
    id: 'nginx-config',
    title: 'Nginx Gateway',
    icon: FileCode,
    content: `
## Nginx Gateway Configuration

When enabled, the Nginx Gateway provides a unified entry point for all services.

### Features
- **Dynamic Configuration**: nginx.conf is generated based on service routes
- **Load Balancing**: Distributes traffic across service replicas
- **Path-Based Routing**: Routes requests to appropriate backends

### Generated Configuration
The Nginx Config tab shows the dynamically generated configuration including:
- Upstream definitions for each service
- Location blocks for each route
- Proxy settings and timeouts

### Best Practices
- Use consistent route prefixes per service
- Enable health checks for all services
- Configure appropriate timeouts for your workloads
    `,
  },
];

export default function Documentation() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <span className="text-xl">⎈</span>
            </div>
            <span className="font-semibold text-lg">Helm Designer</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/auth">
              <Button size="sm">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24">
              <h3 className="font-semibold mb-4">Documentation</h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <section.icon className="h-4 w-4" />
                    {section.title}
                  </a>
                ))}
              </nav>
              <div className="mt-8 pt-8 border-t border-border">
                <Link to="/auth">
                  <Button className="w-full" size="sm">
                    Start Building
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <div className="mb-8">
              <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
              <h1 className="text-4xl font-bold mb-4">Documentation</h1>
              <p className="text-xl text-muted-foreground">
                Learn how to design and manage Helm charts with Helm Designer.
              </p>
            </div>

            <div className="space-y-12">
              {sections.map((section) => (
                <Card key={section.id} id={section.id} className="scroll-mt-24">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <section.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">{section.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {section.content.split('\n').map((line, i) => {
                        if (line.startsWith('## ')) {
                          return (
                            <h2 key={i} className="text-xl font-semibold mt-6 mb-4 first:mt-0">
                              {line.replace('## ', '')}
                            </h2>
                          );
                        }
                        if (line.startsWith('### ')) {
                          return (
                            <h3 key={i} className="text-lg font-semibold mt-4 mb-2">
                              {line.replace('### ', '')}
                            </h3>
                          );
                        }
                        if (line.startsWith('- **')) {
                          const match = line.match(/- \*\*(.+?)\*\*: (.+)/);
                          if (match) {
                            return (
                              <div key={i} className="flex gap-2 my-1">
                                <span className="font-semibold">{match[1]}:</span>
                                <span className="text-muted-foreground">{match[2]}</span>
                              </div>
                            );
                          }
                        }
                        if (line.match(/^\d+\./)) {
                          return (
                            <div key={i} className="my-1 text-muted-foreground">
                              {line}
                            </div>
                          );
                        }
                        if (line.startsWith('- ')) {
                          return (
                            <div key={i} className="my-1 pl-4 text-muted-foreground">
                              • {line.replace('- ', '')}
                            </div>
                          );
                        }
                        if (line.trim() === '') return null;
                        return (
                          <p key={i} className="my-2 text-muted-foreground">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⎈</span>
            <span className="font-semibold">Helm Designer</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}