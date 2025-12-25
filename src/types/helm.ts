export interface Route {
  path: string;
}

export interface EnvVarSchema {
  name: string;
  description?: string;
  required?: boolean;
}

export interface Service {
  id: string;
  templateId: string;
  name: string;
  routes: Route[];
  envVars: EnvVarSchema[];
  livenessPath: string;
  readinessPath: string;
}

export interface ConfigMapKey {
  name: string;
  description?: string;
}

export interface ConfigMap {
  id: string;
  templateId: string;
  name: string;
  keys: ConfigMapKey[];
}

export interface RegistrySecret {
  name: string;
  type: 'registry';
  server: string;
  username: string;
  password: string;
  email?: string;
}

export interface TLSSecret {
  id: string;
  templateId: string;
  name: string;
  type: 'tls';
}

export interface IngressRule {
  path: string;
  serviceName: string;
}

export interface Ingress {
  id: string;
  templateId: string;
  name: string;
  mode: 'nginx-gateway' | 'direct-services';
  rules: IngressRule[];
  defaultHost?: string;
  tlsEnabled: boolean;
  tlsSecretName?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  sharedPort: number;
  registryUrl: string;
  registryProject: string;
  registrySecret: RegistrySecret;
  enableNginxGateway: boolean;
  enableRedis: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChartVersionValues {
  imageTags: Record<string, string>;
  envValues: Record<string, Record<string, string>>;
  configMapValues: Record<string, Record<string, string>>;
  tlsSecretValues: Record<string, { crt: string; key: string }>;
  ingressHosts: Record<string, string[]>;
  enableNginxGateway?: boolean;
  enableRedis?: boolean;
}

export interface ChartVersion {
  id: string;
  templateId: string;
  versionName: string;
  appVersion?: string;
  values: ChartVersionValues;
  createdAt: string;
}

export interface TemplateWithRelations extends Template {
  services: Service[];
  configMaps: ConfigMap[];
  tlsSecrets: TLSSecret[];
  ingresses: Ingress[];
  versions: ChartVersion[];
}
