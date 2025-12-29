import { useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { FileTreeBrowser } from './FileTreeBrowser';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Card } from '@/components/ui/card';
import { FileCode } from 'lucide-react';
import { generateChartFiles } from '@/lib/helm-generator';
import { TemplateWithRelations } from '@/types/helm';
import { ChartVersion } from '@/types/helm';

interface YamlViewModeProps {
  template: TemplateWithRelations;
  version: ChartVersion;
}

export function YamlViewMode({ template, version }: YamlViewModeProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  // Generate all chart files
  const files = useMemo(() => {
    return generateChartFiles(template, version);
  }, [template, version]);

  // Auto-select first file on mount
  const firstFile = files[0];
  if (!selectedFile && firstFile) {
    setSelectedFile(firstFile.name);
    setFileContent(firstFile.content);
  }

  const handleFileSelect = (path: string, content: string) => {
    setSelectedFile(path);
    setFileContent(content);
  };

  const fileName = selectedFile?.split('/').pop() || 'No file selected';

  return (
    <div className="h-[calc(100vh-16rem)]">
      <ResizablePanelGroup direction="horizontal" className="rounded-lg border">
        {/* File Browser Panel */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          <div className="h-full flex flex-col bg-card">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Chart Files</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {files.length} file{files.length !== 1 ? 's' : ''}
              </p>
            </div>
            <FileTreeBrowser
              files={files}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Editor Panel */}
        <ResizablePanel defaultSize={70}>
          <div className="h-full flex flex-col bg-card">
            {/* Editor Header */}
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm font-medium">{fileName}</span>
              {selectedFile && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {fileContent.split('\n').length} lines
                </span>
              )}
            </div>

            {/* Monaco Editor */}
            <div className="flex-1">
              {selectedFile ? (
                <Editor
                  height="100%"
                  language="yaml"
                  value={fileContent}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    lineNumbers: 'on',
                    renderWhitespace: 'selection',
                    folding: true,
                    automaticLayout: true,
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <FileCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a file to view its content</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
