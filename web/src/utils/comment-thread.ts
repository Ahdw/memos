import { timestampDate } from "@bufbuild/protobuf/wkt";
import { extractMemoIdFromName } from "@/helpers/resource-names";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

const THREAD_MARKER_REGEX = /^\[thread\s+root=(\S+)\s+reply_to=(\S+)\]$/;
const MAX_QUOTE_LENGTH = 180;

export interface ThreadMeta {
  rootId: string;
  replyToId: string;
}

export interface ThreadCommentNode {
  memo: Memo;
  displayMemo: Memo;
  memoId: string;
  displayContent: string;
  threadMeta: ThreadMeta | null;
  replyToId: string | null;
  replyTo?: ThreadCommentNode;
  children: ThreadCommentNode[];
  depth: number;
  sortTime: number;
}

export interface ThreadCommentTree {
  roots: ThreadCommentNode[];
  ordered: ThreadCommentNode[];
  byId: Map<string, ThreadCommentNode>;
}

const getSortTime = (memo: Memo) => {
  const ts = memo.createTime ?? memo.updateTime;
  if (!ts) {
    return 0;
  }
  return timestampDate(ts).getTime();
};

export const parseThreadMeta = (content: string): ThreadMeta | null => {
  const firstLine = content.split(/\r?\n/, 1)[0]?.trim();
  if (!firstLine) {
    return null;
  }
  const match = THREAD_MARKER_REGEX.exec(firstLine);
  if (!match) {
    return null;
  }
  return {
    rootId: match[1],
    replyToId: match[2],
  };
};

export const stripThreadMarker = (content: string): string => {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0 || !THREAD_MARKER_REGEX.test(lines[0].trim())) {
    return content;
  }
  const remaining = lines.slice(1);
  while (remaining.length > 0 && remaining[0].trim() === "") {
    remaining.shift();
  }
  return remaining.join("\n");
};

export const getCommentSnippet = (content: string): string => {
  const text = stripThreadMarker(content).replace(/\s+/g, " ").trim();
  if (text.length <= MAX_QUOTE_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_QUOTE_LENGTH - 1).trimEnd()}…`;
};

export const buildReplyTemplate = ({
  rootMemoName,
  targetMemoName,
  username,
  content,
}: {
  rootMemoName: string;
  targetMemoName: string;
  username?: string;
  content: string;
}) => {
  const lines = getCommentSnippet(content)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `> ${line}`);
  return [`[thread root=${rootMemoName} reply_to=${targetMemoName}]`, "", username ? `@${username}` : "", "", ...lines, "", ""]
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n");
};

export const buildCommentThreadTree = (rootMemoName: string, comments: Memo[]): ThreadCommentTree => {
  const orderedMemos = [...comments].sort((a, b) => {
    const sortDelta = getSortTime(a) - getSortTime(b);
    if (sortDelta !== 0) {
      return sortDelta;
    }
    return a.name.localeCompare(b.name);
  });

  const ordered = orderedMemos.map<ThreadCommentNode>((memo) => {
    const threadMeta = parseThreadMeta(memo.content);
    const displayContent = stripThreadMarker(memo.content);
    return {
      memo,
      displayMemo: { ...memo, content: displayContent },
      memoId: extractMemoIdFromName(memo.name),
      displayContent,
      threadMeta,
      replyToId: threadMeta?.rootId === rootMemoName ? extractMemoIdFromName(threadMeta.replyToId) : null,
      children: [],
      depth: 0,
      sortTime: getSortTime(memo),
    };
  });

  const byId = new Map(ordered.map((node) => [node.memoId, node]));
  const roots: ThreadCommentNode[] = [];

  for (const node of ordered) {
    if (!node.replyToId) {
      roots.push(node);
      continue;
    }
    const parent = byId.get(node.replyToId);
    if (!parent) {
      roots.push(node);
      continue;
    }
    node.replyTo = parent;
    parent.children.push(node);
  }

  const assignDepth = (nodes: ThreadCommentNode[], depth = 0) => {
    for (const node of nodes) {
      node.depth = depth;
      assignDepth(node.children, depth + 1);
    }
  };
  assignDepth(roots);

  return { roots, ordered, byId };
};
