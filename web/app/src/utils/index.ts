import { message } from '@ctzhian/ui';
import { ResolvingMetadata } from 'next';
import { ITreeItem } from '@/assets/type';

export function addOpacityToColor(color: string, opacity: number) {
  let red, green, blue;

  if (color.startsWith('#')) {
    red = parseInt(color.slice(1, 3), 16);
    green = parseInt(color.slice(3, 5), 16);
    blue = parseInt(color.slice(5, 7), 16);
  } else if (color.startsWith('rgb')) {
    const matches = color.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)/,
    ) as RegExpMatchArray;
    red = parseInt(matches[1], 10);
    green = parseInt(matches[2], 10);
    blue = parseInt(matches[3], 10);
  } else {
    return '';
  }

  const alpha = opacity;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export const copyText = (text: string, callback?: () => void) => {
  const isNotHttps = !/^https:\/\//.test(window.location.origin);

  if (isNotHttps) {
    message.error('非 https 协议下不支持复制，请使用 https 协议');
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      message.success('复制成功');
      callback?.();
    } else {
      const textArea = document.createElement('textarea');
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          message.success('复制成功');
          callback?.();
        } else {
          message.error('复制失败，请手动复制');
        }
      } catch (err) {
        console.error(err);
        message.error('复制失败，请手动复制');
      }
      document.body.removeChild(textArea);
    }
  } catch (err) {
    console.error(err);
    message.error('复制失败，请手动复制');
  }
};

export const formatMeta = async (
  {
    title,
    description,
    keywords,
  }: { title?: string; description?: string; keywords?: string | string[] },
  parent: ResolvingMetadata,
) => {
  const keywordsIsEmpty =
    !keywords || (Array.isArray(keywords) && !keywords.length);
  const {
    title: parentTitle,
    description: parentDescription,
    keywords: parentKeywords,
  } = await parent;

  return {
    title: title ? `${parentTitle?.absolute} - ${title}` : parentTitle,
    description: description || parentDescription,
    keywords: keywordsIsEmpty ? parentKeywords : keywords,
  };
};

export const parsePathname = (
  pathname: string,
): { page: string; id: string; hash: string; search: string } => {
  const [filterSearch, search] = pathname.split('?');
  const [path, hash] = filterSearch.split('#');
  const [page, id] = path.split('/').filter(Boolean);
  return {
    page,
    id,
    hash,
    search,
  };
};

/**
 * 过滤树形数据，只保留匹配搜索关键词的节点及其父节点
 */
export const filterTreeBySearch = (
  tree: ITreeItem[],
  searchTerm: string,
): ITreeItem[] => {
  if (!searchTerm.trim()) {
    return tree;
  }

  const filtered: ITreeItem[] = [];

  const filterNode = (node: ITreeItem): ITreeItem | null => {
    const nameMatches = node.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    // 递归过滤子节点
    const filteredChildren: ITreeItem[] = [];
    if (node.children) {
      for (const child of node.children) {
        const filteredChild = filterNode(child);
        if (filteredChild) {
          filteredChildren.push(filteredChild);
        }
      }
    }

    // 如果当前节点匹配或有匹配的子节点，则保留
    if (nameMatches || filteredChildren.length > 0) {
      return {
        ...node,
        children:
          filteredChildren.length > 0 ? filteredChildren : node.children,
        defaultExpand: true, // 搜索时展开所有匹配的节点
        expanded: true,
      };
    }

    return null;
  };

  for (const node of tree) {
    const filteredNode = filterNode(node);
    if (filteredNode) {
      filtered.push(filteredNode);
    }
  }

  return filtered;
};

export const deepSearchFirstNode = (
  tree: ITreeItem[],
): ITreeItem | undefined => {
  for (const node of tree) {
    if (node.type === 2) {
      return node;
    }
    if (node.children) {
      const result = deepSearchFirstNode(node.children);
      if (result) {
        return result;
      }
    }
  }
};
