# HelmForge

**HelmForge** (formerly Helm Designer) is a visual tool for creating, configuring, and exporting production-ready Helm charts for Kubernetes microservices architectures. Design complex Helm chart structures without writing YAML manually.

![HelmForge](https://img.shields.io/badge/HelmForge-v0.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-18.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Features

### Core Capabilities

- **Visual Helm Chart Designer** - Create Helm charts through an intuitive web interface
- **Microservices Management** - Define and configure multiple services with routes, environment variables, and health checks
- **ConfigMaps & Secrets** - Manage configuration data and sensitive information with full CRUD operations
- **Ingress Configuration** - Set up routing rules with TLS support, nginx gateway integration, and custom paths
- **Chart Versioning** - Create and manage multiple versions of your Helm charts
- **Export & Download** - Generate complete Helm chart packages (`.tgz`) ready for deployment, including Rancher metadata (`questions.yml`, `app-readme.md`)
- **Private Helm Registry** - Built-in registry to serve your chart templates via Supabase Edge Functions
- **Markdown Editor** - Write rich documentation with syntax-highlighted code blocks

### Advanced Features

- **Nginx Gateway Integration** - Automatic nginx configuration generation based on service routes
- **Redis Support** - Optional Redis deployment for caching and session management
- **TLS/SSL Support** - Configure TLS secrets for secure ingress endpoints
- **TLS Validity Tracking** - Surface Not Before and Expired At dates for TLS certificates
- **StatefulSet Support** - Deploy services as StatefulSets for stateful workloads
- **Health Check Configuration** - Configure liveness and readiness probes
- **Environment Variables** - Manage service environment variables from ConfigMaps and Secrets
- **Service Account Management** - Create and manage service accounts with API keys for registry access
- **Dark Mode** - Built-in theme switcher for comfortable viewing

## 🛠️ Tech Stack

### Frontend

- **React 18.3** - UI framework
- **TypeScript 5.8** - Type safety
- **Vite 5.4** - Build tool and dev server
- **React Router 6.30** - Client-side routing
- **TanStack Query 5.83** - Server state management
- **Zustand 5.0** - Client state management
- **shadcn/ui** - UI component library (Radix UI primitives)
- **Tailwind CSS 3.4** - Styling
- **React Hook Form 7.61** - Form management
- **Zod 3.25** - Schema validation

### Backend

- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication (Email/Password, OAuth)
  - Edge Functions (Helm registry)
  - Row Level Security (RLS)

### Build & Deploy

- **GitHub Actions** - CI/CD pipeline
- **GitHub Pages** - Static hosting

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **npm** or **bun** package manager
- **Supabase account** (for backend services)

## 🏁 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd helmforge
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_BASE_PATH=/  # Optional: for GitHub Pages subdirectory deployment
```

### 4. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migrations in `supabase/migrations/` to set up the database schema
3. Configure authentication providers (Email/Password, Google OAuth) in Supabase dashboard
4. Deploy the Helm registry Edge Function from `supabase/functions/helm-registry/`

### 5. Start Development Server

```bash
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:8080`

## 📁 Project Structure

```
helmforge/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD
├── public/                      # Static assets
├── src/
│   ├── components/
│   │   ├── auth/                # Authentication components
│   │   ├── layout/              # Layout components (Sidebar, MainLayout)
│   │   ├── template/            # Template management components
│   │   ├── theme/               # Theme switcher
│   │   └── ui/                  # shadcn/ui components
│   ├── hooks/                   # Custom React hooks
│   ├── integrations/
│   │   └── supabase/            # Supabase client and types
│   ├── lib/
│   │   ├── helm-generator.ts    # Helm chart generation logic
│   │   ├── store.ts             # Zustand state management
│   │   └── utils.ts             # Utility functions
│   ├── pages/                   # Page components
│   │   ├── Auth.tsx             # Authentication page
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── Documentation.tsx    # Documentation page
│   │   ├── Landing.tsx         # Landing page
│   │   ├── NewTemplate.tsx     # Create new template
│   │   ├── TemplateDetail.tsx  # Template details and editing
│   │   ├── NewVersion.tsx      # Create new chart version
│   │   ├── VersionDetail.tsx   # Version details and export
│   │   └── ServiceAccounts.tsx # Service account management
│   ├── types/
│   │   └── helm.ts              # TypeScript type definitions
│   ├── App.tsx                  # Main app component with routing
│   └── main.tsx                 # Application entry point
├── supabase/
│   ├── functions/
│   │   └── helm-registry/       # Helm registry Edge Function
│   ├── migrations/              # Database migrations
│   └── config.toml              # Supabase configuration
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## 🔑 Key Concepts

### Templates

A **Template** is the base structure of your Helm chart. It defines:
- Template name and description
- Shared port configuration
- Container registry settings
- Services, ConfigMaps, Secrets, and Ingresses
- Optional features (Nginx gateway, Redis)

### Versions

A **Version** represents a specific release of a template. Each version includes:
- Version name (semantic versioning)
- App version
- Image tags for each service
- Environment variable values
- ConfigMap values
- Ingress host configurations
- Registry password
- Feature flags (Nginx, Redis)

### Services

Services represent your microservices. Each service can have:
- Name and description
- Routes (paths for nginx gateway)
- Liveness and readiness probe paths
- Environment variables (from ConfigMaps/Secrets)
- StatefulSet option
- Custom ports per service (ClusterIP)

### ConfigMaps & Secrets

- **ConfigMaps**: Store non-sensitive configuration data
- **TLS Secrets**: Store TLS certificates for ingress
- **Opaque Secrets**: Store sensitive data (passwords, API keys)

### Ingress

Configure external access to your services with:
- Host names
- TLS/SSL support
- Create TLS secrets directly from the ingress TLS configuration
- Routing rules
- Nginx gateway integration

## 🚢 Deployment

### GitHub Pages

The project includes a GitHub Actions workflow that automatically builds and deploys to GitHub Pages on push to `main` or `master` branch.

**Prerequisites:**
1. Enable GitHub Pages in your repository settings
2. Add the following secrets to your GitHub repository:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

The workflow will:
1. Build the application
2. Copy `index.html` to `404.html` for SPA routing
3. Deploy to GitHub Pages

### Manual Build

```bash
npm run build
```

The built files will be in the `dist/` directory, ready to be deployed to any static hosting service.

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:dev    # Build in development mode
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Code Style

The project uses:
- **ESLint** for linting
- **TypeScript** for type checking
- **Prettier** (via ESLint) for code formatting

## 📚 Usage Guide

### Creating Your First Helm Chart

1. **Sign Up/Login** - Create an account or sign in
2. **Create Template** - Click "New Template" and fill in the basic information
3. **Add Services** - Define your microservices with routes and health checks
4. **Configure ConfigMaps** - Add configuration data
5. **Set Up Secrets** - Add TLS certificates or opaque secrets
6. **Configure Ingress** - Set up external access rules
7. **Create Version** - Create a version with specific image tags and values
8. **Export Chart** - Download the `.tgz` package or use the private registry

### Using the Private Helm Registry

1. **Create Service Account** - Go to Service Accounts page
2. **Grant Template Access** - Assign templates to the service account
3. **Get API Key** - Copy the service account API key
4. **Add Repository** - Use the registry URL with authentication
5. **Install Charts** - Use standard Helm commands

See the [Documentation](./src/pages/Documentation.tsx) page for detailed examples.

## 🔒 Security

- All authentication is handled by Supabase Auth
- API keys for the Helm registry are stored securely
- Row Level Security (RLS) policies protect user data
- TLS secrets are encrypted in the database
- Service accounts follow the principle of least privilege

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Helm](https://helm.sh/) - The Kubernetes package manager
- [Supabase](https://supabase.com/) - Backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Radix UI](https://www.radix-ui.com/) - Unstyled UI primitives

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Made with ❤️ for the Kubernetes community**
