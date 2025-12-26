import { useEffect, useRef } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import type * as Monaco from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  language?: string;
  height?: string | number;
  readOnly?: boolean;
  onChange?: (value: string | undefined) => void;
  options?: Monaco.editor.IStandaloneEditorConstructionOptions;
}

export function MonacoEditor({
  value,
  language = 'nginx',
  height = '600px',
  readOnly = true,
  onChange,
  options = {},
}: MonacoEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorWillMount: BeforeMount = (monaco) => {
    // Register nginx language if not already registered
    const languages = monaco.languages.getLanguages();
    const nginxLang = languages.find((lang) => lang.id === 'nginx');
    
    if (!nginxLang) {
      // Register nginx language
      monaco.languages.register({ id: 'nginx' });
      
      // Define nginx language configuration
      monaco.languages.setLanguageConfiguration('nginx', {
        comments: {
          lineComment: '#',
        },
        brackets: [
          ['{', '}'],
          ['[', ']'],
          ['(', ')'],
        ],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
        surroundingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
      });

      // Define nginx syntax highlighting
      monaco.languages.setMonarchTokensProvider('nginx', {
        keywords: [
          'http', 'server', 'location', 'upstream', 'events',
          'if', 'set', 'return', 'rewrite', 'break',
          'listen', 'server_name', 'root', 'index',
          'proxy_pass', 'proxy_set_header', 'proxy_http_version',
          'proxy_cache_bypass', 'add_header',
          'include', 'types', 'default_type',
          'sendfile', 'keepalive_timeout', 'gzip',
          'worker_processes', 'worker_connections',
          'error_log', 'access_log', 'log_format',
          'ssl_certificate', 'ssl_certificate_key',
          'ssl_protocols', 'ssl_ciphers',
          'tcp_nopush', 'tcp_nodelay', 'types_hash_max_size',
          'gzip_vary', 'gzip_proxied', 'gzip_comp_level', 'gzip_types',
          'use', 'multi_accept', 'epoll',
        ],
        tokenizer: {
          root: [
            [/#.*$/, 'comment'],
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string_double'],
            [/'/, 'string', '@string_single'],
            [/\d+\.\d+\.\d+\.\d+(:\d+)?/, 'number.ip'],
            [/\d+[KkMmGg]?/, 'number'],
            [/[a-z_][\w]*/, {
              cases: {
                '@keywords': 'keyword',
                '@default': 'identifier'
              }
            }],
            [/[{}()\[\]]/, '@brackets'],
            [/[;,.]/, 'delimiter'],
          ],
          string_double: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop'],
          ],
          string_single: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string.escape'],
            [/'/, 'string', '@pop'],
          ],
        },
      });
    }
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    // Update editor value when prop changes
    if (editorRef.current && editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  const defaultOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
    readOnly,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13,
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    roundedSelection: false,
    automaticLayout: true,
    wordWrap: 'off',
    folding: true,
    glyphMargin: false,
    ...options,
  };

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      options={defaultOptions}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorDidMount}
      onChange={onChange}
    />
  );
}
