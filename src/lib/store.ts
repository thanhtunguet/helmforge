import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Template,
  Service,
  ConfigMap,
  TLSSecret,
  Ingress,
  ChartVersion,
  TemplateWithRelations,
} from '@/types/helm';

interface HelmStore {
  templates: Template[];
  services: Service[];
  configMaps: ConfigMap[];
  tlsSecrets: TLSSecret[];
  ingresses: Ingress[];
  chartVersions: ChartVersion[];
  
  // Template actions
  addTemplate: (template: Template) => void;
  updateTemplate: (id: string, template: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  getTemplateWithRelations: (id: string) => TemplateWithRelations | undefined;
  
  // Service actions
  addService: (service: Service) => void;
  updateService: (id: string, service: Partial<Service>) => void;
  deleteService: (id: string) => void;
  
  // ConfigMap actions
  addConfigMap: (configMap: ConfigMap) => void;
  updateConfigMap: (id: string, configMap: Partial<ConfigMap>) => void;
  deleteConfigMap: (id: string) => void;
  
  // TLS Secret actions
  addTLSSecret: (secret: TLSSecret) => void;
  updateTLSSecret: (id: string, secret: Partial<TLSSecret>) => void;
  deleteTLSSecret: (id: string) => void;
  
  // Ingress actions
  addIngress: (ingress: Ingress) => void;
  updateIngress: (id: string, ingress: Partial<Ingress>) => void;
  deleteIngress: (id: string) => void;
  
  // Chart Version actions
  addChartVersion: (version: ChartVersion) => void;
  deleteChartVersion: (id: string) => void;
}

export const useHelmStore = create<HelmStore>()(
  persist(
    (set, get) => ({
      templates: [],
      services: [],
      configMaps: [],
      tlsSecrets: [],
      ingresses: [],
      chartVersions: [],
      
      addTemplate: (template) =>
        set((state) => ({ templates: [...state.templates, template] })),
      
      updateTemplate: (id, updates) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        })),
      
      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          services: state.services.filter((s) => s.templateId !== id),
          configMaps: state.configMaps.filter((c) => c.templateId !== id),
          tlsSecrets: state.tlsSecrets.filter((s) => s.templateId !== id),
          ingresses: state.ingresses.filter((i) => i.templateId !== id),
          chartVersions: state.chartVersions.filter((v) => v.templateId !== id),
        })),
      
      getTemplateWithRelations: (id) => {
        const state = get();
        const template = state.templates.find((t) => t.id === id);
        if (!template) return undefined;
        
        return {
          ...template,
          services: state.services.filter((s) => s.templateId === id),
          configMaps: state.configMaps.filter((c) => c.templateId === id),
          tlsSecrets: state.tlsSecrets.filter((s) => s.templateId === id),
          ingresses: state.ingresses.filter((i) => i.templateId === id),
          versions: state.chartVersions.filter((v) => v.templateId === id),
        };
      },
      
      addService: (service) =>
        set((state) => ({ services: [...state.services, service] })),
      
      updateService: (id, updates) =>
        set((state) => ({
          services: state.services.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),
      
      deleteService: (id) =>
        set((state) => ({
          services: state.services.filter((s) => s.id !== id),
        })),
      
      addConfigMap: (configMap) =>
        set((state) => ({ configMaps: [...state.configMaps, configMap] })),
      
      updateConfigMap: (id, updates) =>
        set((state) => ({
          configMaps: state.configMaps.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
      
      deleteConfigMap: (id) =>
        set((state) => ({
          configMaps: state.configMaps.filter((c) => c.id !== id),
        })),
      
      addTLSSecret: (secret) =>
        set((state) => ({ tlsSecrets: [...state.tlsSecrets, secret] })),
      
      updateTLSSecret: (id, updates) =>
        set((state) => ({
          tlsSecrets: state.tlsSecrets.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),
      
      deleteTLSSecret: (id) =>
        set((state) => ({
          tlsSecrets: state.tlsSecrets.filter((s) => s.id !== id),
        })),
      
      addIngress: (ingress) =>
        set((state) => ({ ingresses: [...state.ingresses, ingress] })),
      
      updateIngress: (id, updates) =>
        set((state) => ({
          ingresses: state.ingresses.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        })),
      
      deleteIngress: (id) =>
        set((state) => ({
          ingresses: state.ingresses.filter((i) => i.id !== id),
        })),
      
      addChartVersion: (version) =>
        set((state) => ({ chartVersions: [...state.chartVersions, version] })),
      
      deleteChartVersion: (id) =>
        set((state) => ({
          chartVersions: state.chartVersions.filter((v) => v.id !== id),
        })),
    }),
    {
      name: 'helm-designer-storage',
    }
  )
);
