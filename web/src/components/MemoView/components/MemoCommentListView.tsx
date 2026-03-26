import { timestampDate } from "@bufbuild/protobuf/wkt";
import { ArrowUpRightIcon, MessageCircleMoreIcon } from "lucide-react";
import { Link } from "react-router-dom";
import UserAvatar from "@/components/UserAvatar";
import { extractMemoIdFromName } from "@/helpers/resource-names";
import { useMemoComments } from "@/hooks/useMemoQueries";
import { useUsersByNames } from "@/hooks/useUserQueries";
import i18n from "@/i18n";
import { useMemoViewContext, useMemoViewDerived } from "../MemoViewContext";

const MemoCommentListView: React.FC = () => {
  const { memo, parentPage } = useMemoViewContext();
  const { isInMemoDetailPage, commentAmount } = useMemoViewDerived();

  const { data } = useMemoComments(memo.name, { enabled: !isInMemoDetailPage && commentAmount > 0, pageSize: 3 });
  const comments = (data?.memos ?? []).slice(0, 3);
  const { data: commentCreators } = useUsersByNames(comments.map((comment) => comment.creator));

  if (isInMemoDetailPage || commentAmount === 0) {
    return null;
  }

  return (
    <div className="mb-2 rounded-b-2xl border border-t-0 border-border bg-gradient-to-b from-muted/35 to-background px-4 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageCircleMoreIcon className="h-3.5 w-3.5" />
          <span>Comments</span>
          <span>({commentAmount})</span>
        </div>
        <Link
          to={`/${memo.name}#comments`}
          state={{ from: parentPage }}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          viewTransition
        >
          View all
          <ArrowUpRightIcon className="w-3 h-3" />
        </Link>
      </div>

      <div className="relative pl-4">
        <div className="absolute bottom-2 left-3 top-2 w-px bg-border" />
        <div className="flex flex-col gap-2">
          {comments.map((comment) => {
            const creator = commentCreators?.get(comment.creator);
            const commentId = extractMemoIdFromName(comment.name);
            const displayTime = comment.displayTime ? timestampDate(comment.displayTime) : undefined;
            const previewText = comment.snippet || comment.content || "...";

            return (
              <Link
                key={comment.name}
                className="group relative flex items-start gap-3 rounded-2xl border border-transparent bg-background/75 px-3 py-2 transition-all hover:border-border hover:bg-background"
                to={`/${memo.name}#${commentId}`}
                state={{ from: parentPage }}
                viewTransition
              >
                <span className="absolute -left-[0.15rem] top-5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                <UserAvatar className="h-9 w-9 rounded-2xl" avatarUrl={creator?.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate font-medium text-foreground">
                      {creator?.displayName || creator?.username || "Unknown user"}
                    </span>
                    {displayTime && <relative-time datetime={displayTime.toISOString()} format="auto" lang={i18n.language}></relative-time>}
                  </div>
                  <p className="mt-1 truncate text-sm text-foreground/90 group-hover:text-foreground">{previewText}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MemoCommentListView;
