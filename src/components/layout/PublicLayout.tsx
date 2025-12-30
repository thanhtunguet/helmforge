import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { Layers, BookOpen, Globe, ArrowRight } from 'lucide-react';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-lg">HelmForge</span>
          </Link>
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-semibold">HelmForge</span>
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
