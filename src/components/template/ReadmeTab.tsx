import { useState } from 'react';
import { useHelmStore } from '@/lib/store';
import { TemplateWithRelations } from '@/types/helm';
import { Button } from '@/components/ui/button';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Save, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ReadmeTabProps {
  template: TemplateWithRelations;
}

export function ReadmeTab({ template }: ReadmeTabProps) {
  const updateTemplate = useHelmStore((state) => state.updateTemplate);
  const [readme, setReadme] = useState(template.readme || '');
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = readme !== (template.readme || '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTemplate(template.id, { readme });
      toast.success('README saved successfully');
    } catch (error) {
      toast.error('Failed to save README');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">README</h3>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          size="sm"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Write documentation for your Helm chart template. Supports GitHub Flavored Markdown.
      </p>
      <MarkdownEditor
        value={readme}
        onChange={setReadme}
        height="500px"
        placeholder="# My Helm Chart

Describe your chart here...

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+

## Installation

```bash
helm install my-release ./my-chart
```

## Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
"
      />
    </div>
  );
}
