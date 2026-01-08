import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import perl from 'highlight.js/lib/languages/perl';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('css', css);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('go', go);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('perl', perl);
hljs.registerLanguage('php', php);
hljs.registerLanguage('python', python);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);

const languageAliases: Record<string, string> = {
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  python: 'python',
  py: 'python',
  ruby: 'ruby',
  rb: 'ruby',
  rust: 'rust',
  rs: 'rust',
  c: 'c',
  'c++': 'cpp',
  cpp: 'cpp',
  'c#': 'csharp',
  csharp: 'csharp',
  dotnet: 'csharp',
  java: 'java',
  php: 'php',
  go: 'go',
  perl: 'perl',
  html: 'xml',
  xml: 'xml',
  css: 'css',
  json: 'json',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  dockerfile: 'dockerfile',
  'docker-compose': 'yaml',
  dockercompose: 'yaml',
  docker_compose: 'yaml',
};

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-([^\s]+)/.exec(className || '');
    const rawLanguage = match?.[1]?.toLowerCase();
    const language = rawLanguage ? languageAliases[rawLanguage] ?? rawLanguage : undefined;
    const codeContent = String(children).replace(/\n$/, '');
    
    // Check if this is inline code (no language class and short content)
    const isInline = !className && !codeContent.includes('\n');

    if (isInline) {
      return (
        <code
          className={cn('rounded bg-muted px-1.5 py-0.5 text-sm font-mono', className)}
          {...props}
        >
          {children}
        </code>
      );
    }

    if (language && hljs.getLanguage(language)) {
      const highlighted = hljs.highlight(codeContent, { language }).value;
      return (
        <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
          <code
            className={cn('hljs', `language-${language}`)}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      );
    }

    return (
      <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
        <code className={cn('hljs', className)} {...props}>
          {codeContent}
        </code>
      </pre>
    );
  },
};

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
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
      <p className={cn('text-muted-foreground text-sm', className)}>
        No content available.
      </p>
    );
  }

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
