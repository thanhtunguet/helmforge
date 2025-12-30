import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string | number;
  readOnly?: boolean;
  placeholder?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  height = '400px',
  readOnly = false,
  placeholder = 'Write your markdown here...',
}: MarkdownEditorProps) {
  const { theme } = useTheme();

  return (
    <div style={{ height }} className="border rounded-lg overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
              Editor
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                language="markdown"
                value={value}
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                options={{
                  readOnly,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'off',
                  wordWrap: 'on',
                  automaticLayout: true,
                  padding: { top: 12 },
                }}
                onChange={(val) => onChange(val || '')}
              />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
              Preview
            </div>
            <div className="flex-1 overflow-auto p-4">
              {value ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {value}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{placeholder}</p>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  if (!content) {
    return (
      <p className={cn("text-muted-foreground text-sm", className)}>
        No content available.
      </p>
    );
  }

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
