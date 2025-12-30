export interface Route {
  path: string;
}

export interface EnvVarSchema {
  name: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
}

export interface ConfigMapEnvSource {
  configMapName: string;
}

export interface SecretEnvSource {
  secretName: string;
}

export interface Service {
  id: string;
  templateId: string;
  name: string;
  routes: Route[];
  envVars: EnvVarSchema[];
  healthCheckEnabled: boolean;
  livenessPath: string;
  readinessPath: string;
  configMapEnvSources: ConfigMapEnvSource[];
  secretEnvSources: SecretEnvSource[];
  useStatefulSet: boolean;
}

export interface ConfigMapKey {
  name: string;
  description?: string;
  defaultValue?: string;
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
  // Note: password is NOT stored - it should be provided during chart deployment
  email?: string;
}

export interface TLSSecret {
  id: string;
  templateId: string;
  name: string;
  type: 'tls';
  cert?: string;
  key?: string;
}

export interface OpaqueSecretKey {
  name: string;
  description?: string;
  defaultValue?: string;
}

export interface OpaqueSecret {
  id: string;
  templateId: string;
  name: string;
  type: 'opaque';
  keys: OpaqueSecretKey[];
}

export interface IngressRule {
  path: string;
  serviceName: string;
}

export interface IngressPath {
  path: string;
  serviceName: string;
}

export interface IngressHost {
  hostname: string;
  paths: IngressPath[];
}

export interface IngressTLS {
  secretName: string;
  hosts: string[]; // List of hostnames that use this TLS secret
}

export interface Ingress {
  id: string;
  templateId: string;
  name: string;
  mode: 'nginx-gateway' | 'direct-services';
  hosts: IngressHost[];
  tls: IngressTLS[];
}

export type TemplateVisibility = 'private' | 'public';

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
  visibility: TemplateVisibility;
  readme?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartVersionValues {
  imageTags: Record<string, string>;
  envValues: Record<string, Record<string, string>>;
  configMapValues: Record<string, Record<string, string>>;
  tlsSecretValues: Record<string, { crt: string; key: string }>;
  opaqueSecretValues: Record<string, Record<string, string>>;
  enableNginxGateway?: boolean;
  enableRedis?: boolean;
  registryPassword?: string;
}

export interface ChartVersion {
  id: string;
  templateId: string;
  versionName: string;
  appVersion?: string;
  releaseNotes?: string;
  values: ChartVersionValues;
  createdAt: string;
}

export interface TemplateWithRelations extends Template {
  services: Service[];
  configMaps: ConfigMap[];
  tlsSecrets: TLSSecret[];
  opaqueSecrets: OpaqueSecret[];
  ingresses: Ingress[];
  versions: ChartVersion[];
}
