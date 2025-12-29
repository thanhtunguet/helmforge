import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface FileTreeBrowserProps {
  files: Array<{ name: string; content: string }>;
  selectedFile: string | null;
  onFileSelect: (path: string, content: string) => void;
}

/**
 * Build a tree structure from flat file list
 */
function buildFileTree(files: Array<{ name: string; content: string }>): FileNode[] {
  const root: FileNode[] = [];
  
  files.forEach(({ name, content }) => {
    const parts = name.split('/');
    let currentLevel = root;
    
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const path = parts.slice(0, index + 1).join('/');
      
      let existingNode = currentLevel.find(node => node.name === part);
      
      if (!existingNode) {
        const newNode: FileNode = {
          name: part,
          path,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        };
        currentLevel.push(newNode);
        existingNode = newNode;
      }
      
      if (!isFile && existingNode.children) {
        currentLevel = existingNode.children;
      }
    });
  });
  
  return root;
}

interface TreeNodeProps {
  node: FileNode;
  level: number;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
}

function TreeNode({ 
  node, 
  level, 
  selectedFile, 
  onFileSelect, 
  expandedFolders,
  toggleFolder 
}: TreeNodeProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile === node.path;
  
  const handleClick = () => {
    if (node.type === 'folder') {
      toggleFolder(node.path);
    } else {
      onFileSelect(node.path);
    }
  };
  
  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-muted/50 rounded-sm transition-colors',
          isSelected && 'bg-muted',
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' && (
          <>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}
          </>
        )}
        {node.type === 'file' && (
          <>
            <div className="w-4" />
            <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </>
        )}
        <span className={cn(
          'text-sm truncate',
          isSelected && 'font-medium'
        )}>
          {node.name}
        </span>
      </div>
      
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTreeBrowser({ files, selectedFile, onFileSelect }: FileTreeBrowserProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    // Auto-expand root folder on mount
    const rootFolder = files[0]?.name.split('/')[0];
    return rootFolder ? new Set([rootFolder]) : new Set();
  });
  
  const tree = buildFileTree(files);
  const fileMap = new Map(files.map(f => [f.name, f.content]));
  
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };
  
  const handleFileSelect = (path: string) => {
    const content = fileMap.get(path) || '';
    onFileSelect(path, content);
  };
  
  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            level={0}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
