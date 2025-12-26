# Static Site Generation (SSG) Configuration

This project is configured with static site generation for improved SEO and performance on public pages.

## Pre-rendered Routes

The following routes are pre-rendered at build time:
- `/` - Landing page
- `/docs` - Documentation page

## Build Commands

- `npm run build` - Standard production build
- `npm run build:ssg` - Production build with static site generation

## Configuration

### Route Configuration
The pre-rendered routes are configured in `package.json` under the `reactSnap` section:

```json
"reactSnap": {
  "source": "dist",
  "include": [
    "/",
    "/docs"
  ]
}
```

### Vite Configuration
The Vite build is configured to output ES2015 JavaScript for compatibility with react-snap's Puppeteer renderer:

```typescript
build: {
  target: 'es2015',
  rollupOptions: {
    output: {
      manualChunks: undefined,
    },
  },
}
```

## Router Configuration

The application uses React Router v6's route objects (via `createBrowserRouter`) instead of JSX route definitions. This approach:
- Provides better support for static site generation
- Enables route-based code splitting
- Improves type safety
- Supports data loading APIs

### Handling SSG Generated Paths

React-snap generates HTML files like `/docs/index.html` for the `/docs` route. To handle direct access to these paths, the router includes redirect routes:

```typescript
{
  path: '/docs/index.html',
  element: <Navigate to="/docs" replace />,
}
```

This ensures:
1. Users can access `/docs/index.html` directly (served as static HTML)
2. When React hydrates, they're redirected to the clean URL `/docs`
3. SEO crawlers see the pre-rendered content
4. URLs remain clean and consistent

## Output

When running `npm run build:ssg`, the build process:
1. Builds the application with Vite
2. Pre-renders specified routes with react-snap
3. Outputs static HTML files for each route in the `dist` folder

The pre-rendered HTML files include:
- Fully rendered page content
- SEO meta tags
- Minified HTML for optimal performance
