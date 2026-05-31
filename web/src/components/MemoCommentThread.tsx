import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ChevronDownIcon, ChevronUpIcon, CornerDownRightIcon, MessageCircleIcon } from "lucide-react";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MemoActionMenu from "@/components/MemoActionMenu";
import MemoContent from "@/components/MemoContent";
import MemoEditor from "@/components/MemoEditor";
import { AttachmentListView, LocationDisplayView, RelationListView } from "@/components/MemoMetadata";
import { MemoReactionListView } from "@/components/MemoReactionListView";
import PreviewImageDialog from "@/components/PreviewImageDialog";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { extractMemoIdFromName } from "@/helpers/resource-names";
import useCurrentUser from "@/hooks/useCurrentUser";
import useMediaQuery from "@/hooks/useMediaQuery";
import { useUsersByNames } from "@/hooks/useUserQueries";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";
import { type Memo, MemoRelation_Type } from "@/types/proto/api/v1/memo_service_pb";
import type { User } from "@/types/proto/api/v1/user_service_pb";
import { buildCommentThreadTree, buildReplyTemplate, type ThreadCommentNode } from "@/utils/comment-thread";
import { useTranslate } from "@/utils/i18n";
import { isSuperUser } from "@/utils/user";
import { useImagePreview } from "./MemoView/hooks";
import { MemoViewContext } from "./MemoView/MemoViewContext";

type Variant = "detail" | "preview";

interface Props {
  memo: Memo;
  comments: Memo[];
  parentPage?: string;
  variant: Variant;
  previewCount?: number;
}

const MAX_VISUAL_DEPTH = 3;

const getUserLabel = (creatorName: string, creator?: User) =>
  creator?.displayName || creator?.username || creatorName.split("/").pop() || "Unknown user";

const getReplyingToLabel = (node: ThreadCommentNode, creators: Map<string, User | undefined> | undefined) => {
  if (!node.replyTo) {
    return undefined;
  }
  return getUserLabel(node.replyTo.memo.creator, creators?.get(node.replyTo.memo.creator));
};

const CommentReplyEditor = ({
  rootMemo,
  target,
  creator,
  onConfirm,
  onCancel,
}: {
  rootMemo: Memo;
  target: ThreadCommentNode;
  creator?: User;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="mt-3 rounded-2xl border border-border bg-background/90 p-3 shadow-sm">
    <MemoEditor
      autoFocus
      cacheKey={`reply-${rootMemo.name}-${target.memoId}`}
      initialContent={buildReplyTemplate({
        rootMemoName: rootMemo.name,
        targetMemoName: target.memo.name,
        username: creator?.username,
        content: target.displayContent,
      })}
      parentMemoName={rootMemo.name}
      placeholder="Write a reply..."
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  </div>
);

const noop = () => {};
const PREVIEW_COLLAPSE_LENGTH = 220;

const PreviewCommentCard = ({
  rootMemo,
  node,
  creator,
  replyingTo,
  parentHidden,
  parentPage,
  canReply,
  isReplyOpen,
  onReply,
  onCloseReply,
  compactContent,
}: {
  rootMemo: Memo;
  node: ThreadCommentNode;
  creator?: User;
  replyingTo?: string;
  parentHidden: boolean;
  parentPage?: string;
  canReply: boolean;
  isReplyOpen: boolean;
  onReply: () => void;
  onCloseReply: () => void;
  compactContent: boolean;
}) => {
  const t = useTranslate();
  const [showFullContent, setShowFullContent] = useState(false);
  const displayTime = node.memo.createTime ? timestampDate(node.memo.createTime) : undefined;
  const shouldCollapse =
    compactContent && (node.displayContent.length > PREVIEW_COLLAPSE_LENGTH || node.displayContent.split(/\r?\n/).length > 4);

  return (
    <div className="rounded-2xl border border-border bg-background/80 px-3 py-3 shadow-xs">
      <div className="flex items-start gap-3">
        <UserAvatar className="h-9 w-9 rounded-2xl" avatarUrl={creator?.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{getUserLabel(node.memo.creator, creator)}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {displayTime && (
                  <Link
                    className="hover:text-foreground"
                    state={{ from: parentPage }}
                    to={`/${rootMemo.name}#${node.memoId}`}
                    viewTransition
                  >
                    <relative-time datetime={displayTime.toISOString()} format="auto" lang={i18n.language}></relative-time>
                  </Link>
                )}
                {parentHidden && replyingTo && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                    <CornerDownRightIcon className="h-3 w-3" />
                    Replying to {replyingTo}
                  </span>
                )}
              </div>
            </div>
            {canReply && (
              <Button className="h-7 px-2 text-xs" size="sm" variant="ghost" onClick={isReplyOpen ? onCloseReply : onReply}>
                Reply
              </Button>
            )}
          </div>
          <p
            className={cn(
              "mt-2 whitespace-pre-wrap break-words text-sm text-foreground/90",
              shouldCollapse && !showFullContent && "line-clamp-4",
            )}
          >
            {node.displayContent.trim() || "..."}
          </p>
          {shouldCollapse && (
            <Button className="mt-2 h-7 px-2 text-xs" size="sm" variant="ghost" onClick={() => setShowFullContent((prev) => !prev)}>
              {showFullContent ? t("common.collapse") : t("common.expand")}
            </Button>
          )}
        </div>
      </div>
      {isReplyOpen && (
        <CommentReplyEditor creator={creator} rootMemo={rootMemo} target={node} onConfirm={onCloseReply} onCancel={onCloseReply} />
      )}
    </div>
  );
};

const ThreadCommentCard = ({
  rootMemo,
  node,
  creator,
  replyingTo,
  parentPage,
  canReply,
  isReplyOpen,
  onReply,
  onCloseReply,
  compactContent,
}: {
  rootMemo: Memo;
  node: ThreadCommentNode;
  creator?: User;
  replyingTo?: string;
  parentPage?: string;
  canReply: boolean;
  isReplyOpen: boolean;
  onReply: () => void;
  onCloseReply: () => void;
  compactContent: boolean;
}) => {
  const currentUser = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const { previewState, openPreview, setPreviewOpen } = useImagePreview();
  const readonly = node.memo.creator !== currentUser?.name && !isSuperUser(currentUser);
  const displayTime = node.memo.createTime ? timestampDate(node.memo.createTime) : undefined;
  const visualDepth = Math.min(node.depth, MAX_VISUAL_DEPTH);
  const referencedMemos = node.displayMemo.relations.filter((relation) => relation.type === MemoRelation_Type.REFERENCE);
  const contextValue = {
    memo: node.displayMemo,
    creator,
    currentUser,
    parentPage: parentPage || "/",
    cardWidth: 0,
    isArchived: false,
    readonly,
    showBlurredContent: true,
    blurred: false,
    openEditor: noop,
    toggleBlurVisibility: noop,
    openPreview,
  };

  if (isEditing) {
    return (
      <div className="rounded-2xl border border-border bg-background/90 p-3 shadow-sm">
        <MemoEditor
          autoFocus
          cacheKey={`edit-comment-${node.memo.name}`}
          memo={node.memo}
          onConfirm={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      className="relative"
      id={extractMemoIdFromName(node.memo.name)}
      style={{ marginLeft: visualDepth === 0 ? 0 : `${visualDepth * 20}px` }}
    >
      {visualDepth > 0 && (
        <>
          <div className="absolute bottom-0 left-[-14px] top-0 w-px bg-border" />
          <span className="absolute left-[-19px] top-9 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
        </>
      )}
      <div className="rounded-2xl border border-border bg-background/85 px-4 py-4 shadow-xs">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <UserAvatar className="h-9 w-9 rounded-2xl" avatarUrl={creator?.avatarUrl} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{getUserLabel(node.memo.creator, creator)}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {displayTime && (
                  <Link className="hover:text-foreground" state={{ from: parentPage }} to={`/${node.memo.name}`} viewTransition>
                    <relative-time datetime={displayTime.toISOString()} format="auto" lang={i18n.language}></relative-time>
                  </Link>
                )}
                {replyingTo && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                    <CornerDownRightIcon className="h-3 w-3" />
                    Replying to {replyingTo}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canReply && (
              <Button className="h-7 px-2 text-xs" size="sm" variant="ghost" onClick={isReplyOpen ? onCloseReply : onReply}>
                Reply
              </Button>
            )}
            <MemoActionMenu memo={node.memo} readonly={readonly} onEdit={() => setIsEditing(true)} />
          </div>
        </div>

        <MemoViewContext.Provider value={contextValue}>
          <div className="flex flex-col gap-3">
            <MemoContent compact={compactContent} content={node.displayContent} contentClassName="text-sm leading-6" />
            <AttachmentListView attachments={node.memo.attachments} onImagePreview={openPreview} />
            <RelationListView currentMemoName={node.memo.name} parentPage={parentPage} relations={referencedMemos} />
            {node.memo.location && <LocationDisplayView location={node.memo.location} />}
            <MemoReactionListView memo={node.memo} reactions={node.memo.reactions} />
          </div>
        </MemoViewContext.Provider>

        {isReplyOpen && (
          <CommentReplyEditor creator={creator} rootMemo={rootMemo} target={node} onConfirm={onCloseReply} onCancel={onCloseReply} />
        )}
      </div>

      <PreviewImageDialog
        items={previewState.items}
        initialIndex={previewState.index}
        onOpenChange={setPreviewOpen}
        open={previewState.open}
      />
    </div>
  );
};

const renderThreadNodes = ({
  nodes,
  rootMemo,
  creators,
  parentPage,
  activeReplyMemoName,
  setActiveReplyMemoName,
  compactContent,
}: {
  nodes: ThreadCommentNode[];
  rootMemo: Memo;
  creators: Map<string, User | undefined> | undefined;
  parentPage?: string;
  activeReplyMemoName: string | null;
  setActiveReplyMemoName: (memoName: string | null) => void;
  compactContent: boolean;
}): JSX.Element[] =>
  nodes.map((node) => {
    const creator = creators?.get(node.memo.creator);
    const replyingTo = getReplyingToLabel(node, creators);
    const isReplyOpen = activeReplyMemoName === node.memo.name;

    return (
      <div className="flex flex-col gap-3" key={node.memo.name}>
        <ThreadCommentCard
          canReply
          creator={creator}
          isReplyOpen={isReplyOpen}
          node={node}
          onCloseReply={() => setActiveReplyMemoName(null)}
          onReply={() => setActiveReplyMemoName(node.memo.name)}
          compactContent={compactContent}
          parentPage={parentPage}
          replyingTo={replyingTo}
          rootMemo={rootMemo}
        />
        {node.children.length > 0 &&
          renderThreadNodes({
            nodes: node.children,
            rootMemo,
            creators,
            parentPage,
            activeReplyMemoName,
            setActiveReplyMemoName,
            compactContent,
          })}
      </div>
    );
  });

const MemoCommentThread = ({ memo, comments, parentPage, variant, previewCount = 3 }: Props) => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const [showRootEditor, setShowRootEditor] = useState(false);
  const [expanded, setExpanded] = useState(variant === "detail");
  const [activeReplyMemoName, setActiveReplyMemoName] = useState<string | null>(null);
  const isDesktop = useMediaQuery("md");
  const { data: commentCreators } = useUsersByNames(comments.map((comment) => comment.creator));

  const thread = useMemo(() => buildCommentThreadTree(memo.name, comments), [memo.name, comments]);
  const previewNodes = useMemo(() => thread.ordered.slice(-previewCount), [thread.ordered, previewCount]);
  const previewNodeIds = useMemo(() => new Set(previewNodes.map((node) => node.memoId)), [previewNodes]);
  const canCreateComment = Boolean(currentUser);
  const compactPreviewContent = variant === "preview" && !isDesktop;

  const showCreateButton = variant === "detail" && canCreateComment && !showRootEditor;

  return (
    <div
      className={cn(
        "w-full",
        variant === "detail"
          ? "pt-8 pb-16"
          : "mb-2 rounded-b-2xl border border-t-0 border-border bg-gradient-to-b from-muted/35 to-background px-4 py-3",
      )}
    >
      <div
        className={cn(
          "mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/35 px-4 py-3",
          variant === "preview" && "mb-3",
        )}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircleIcon className="h-4 w-4" />
          <span>{t("memo.comment.self")}</span>
          <span>({comments.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {variant === "preview" && comments.length > previewCount && (
            <Button className="h-8 px-2 text-xs" size="sm" variant="ghost" onClick={() => setExpanded((prev) => !prev)}>
              {expanded ? (
                <>
                  <ChevronUpIcon className="mr-1 h-3.5 w-3.5" />
                  {t("common.collapse")}
                </>
              ) : (
                <>
                  <ChevronDownIcon className="mr-1 h-3.5 w-3.5" />
                  {t("common.expand")}
                </>
              )}
            </Button>
          )}
          {showCreateButton && (
            <Button className="text-muted-foreground" variant="ghost" onClick={() => setShowRootEditor(true)}>
              {t("memo.comment.write-a-comment")}
            </Button>
          )}
        </div>
      </div>

      {variant === "detail" && showRootEditor && (
        <div className="mb-4 rounded-3xl border border-border bg-background px-4 py-4 shadow-sm">
          <MemoEditor
            autoFocus
            cacheKey={`${memo.name}-${memo.updateTime}-comment`}
            onCancel={() => setShowRootEditor(false)}
            onConfirm={() => setShowRootEditor(false)}
            parentMemoName={memo.name}
            placeholder={t("editor.add-your-comment-here")}
          />
        </div>
      )}

      {comments.length === 0 ? (
        variant === "detail" && !showCreateButton ? (
          <div className="py-6 text-center text-sm text-muted-foreground">{t("memo.comment.self")}</div>
        ) : null
      ) : variant === "preview" && !expanded ? (
        <div className="flex flex-col gap-2">
          {previewNodes.map((node) => {
            const creator = commentCreators?.get(node.memo.creator);
            const replyingTo = getReplyingToLabel(node, commentCreators);
            const isReplyOpen = activeReplyMemoName === node.memo.name;
            return (
              <PreviewCommentCard
                canReply={canCreateComment}
                creator={creator}
                isReplyOpen={isReplyOpen}
                key={node.memo.name}
                node={node}
                onCloseReply={() => setActiveReplyMemoName(null)}
                onReply={() => setActiveReplyMemoName(node.memo.name)}
                compactContent={compactPreviewContent}
                parentHidden={Boolean(node.replyTo && !previewNodeIds.has(node.replyTo.memoId))}
                parentPage={parentPage}
                replyingTo={replyingTo}
                rootMemo={memo}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {renderThreadNodes({
            nodes: thread.roots,
            rootMemo: memo,
            creators: commentCreators,
            parentPage,
            activeReplyMemoName,
            setActiveReplyMemoName,
            compactContent: compactPreviewContent,
          })}
        </div>
      )}
    </div>
  );
};

export default MemoCommentThread;
