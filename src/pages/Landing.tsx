import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import {
  Layers,
  Server,
  Shield,
  Network,
  Download,
  FileCode,
  ArrowRight,
  Check,
  BookOpen,
  Globe,
} from 'lucide-react';

const features = [
  {
    icon: Server,
    title: 'Microservices Management',
    description: 'Define and configure multiple services with routes, environment variables, and health checks.',
  },
  {
    icon: Layers,
    title: 'ConfigMaps & Secrets',
    description: 'Manage configuration data and sensitive information with full CRUD operations.',
  },
  {
    icon: Network,
    title: 'Ingress Configuration',
    description: 'Set up routing rules with TLS support, nginx gateway integration, and custom paths.',
  },
  {
    icon: Download,
    title: 'Chart Version Export',
    description: 'Generate complete Helm chart packages ready for deployment to any Kubernetes cluster.',
  },
  {
    icon: FileCode,
    title: 'Nginx Config Preview',
    description: 'View dynamically generated nginx configurations based on your service routes.',
  },
  {
    icon: Shield,
    title: 'StatefulSet Support',
    description: 'Deploy services as StatefulSets for stateful workloads with persistent storage.',
  },
];

const benefits = [
  'Visual interface for complex Helm chart structures',
  'Automatic template generation with best practices',
  'Support for TLS secrets and opaque secrets',
  'ConfigMap mounting as environment variables',
  'Health check configuration (liveness/readiness)',
  'Redis and Nginx gateway integrations',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <span className="text-xl">⎈</span>
            </div>
            <span className="font-semibold text-lg">Helm Designer</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/community">
              <Button variant="ghost" size="sm">
                <Globe className="h-4 w-4 mr-2" />
                Community
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="ghost" size="sm">
                <BookOpen className="h-4 w-4 mr-2" />
                Documentation
              </Button>
            </Link>
            <ThemeSwitcher />
            <Link to="/auth">
              <Button size="sm">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6">
            Visual Helm Chart Designer
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            Design & Manage Helm Charts{' '}
            <span className="text-primary/70">Without Writing YAML</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A visual tool to create, configure, and export production-ready Helm charts
            for your Kubernetes microservices architecture.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="px-8">
                Start Building
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/docs">
              <Button size="lg" variant="outline" className="px-8">
                <BookOpen className="h-4 w-4 mr-2" />
                Read the Docs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete toolkit for designing and managing Helm charts with an intuitive visual interface.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-card hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Why Use Helm Designer?
              </h2>
              <p className="text-muted-foreground mb-8">
                Stop wrestling with complex YAML files. Our visual interface lets you focus on
                architecture while we handle the template generation.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-muted/50 rounded-2xl p-8 border border-border">
              <div className="font-mono text-sm space-y-2 text-muted-foreground">
                <div className="text-foreground"># Generated values.yaml</div>
                <div>services:</div>
                <div className="pl-4">api-gateway:</div>
                <div className="pl-8">image: registry/project/api-gateway:v1.0.0</div>
                <div className="pl-8">routes:</div>
                <div className="pl-12">- path: /api/v1</div>
                <div className="pl-8">healthCheck:</div>
                <div className="pl-12">enabled: true</div>
                <div className="pl-12">livenessPath: /health</div>
                <div className="pl-8">envFrom:</div>
                <div className="pl-12">- configMapRef: app-config</div>
                <div className="pl-12">- secretRef: app-secrets</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Create your first Helm chart template in minutes with our intuitive visual designer.
          </p>
          <Link to="/auth">
            <Button size="lg" className="px-8">
              Create Your First Template
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⎈</span>
            <span className="font-semibold">Helm Designer</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/community" className="hover:text-foreground transition-colors">
              Community
            </Link>
            <Link to="/docs" className="hover:text-foreground transition-colors">
              Documentation
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