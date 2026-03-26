import { timestampDate } from "@bufbuild/protobuf/wkt";
import { MessageCircleIcon } from "lucide-react";
import { useState } from "react";
import MemoEditor from "@/components/MemoEditor";
import MemoView from "@/components/MemoView";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { extractMemoIdFromName } from "@/helpers/resource-names";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useUsersByNames } from "@/hooks/useUserQueries";
import i18n from "@/i18n";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";

interface Props {
  memo: Memo;
  comments: Memo[];
  parentPage?: string;
}

const MemoCommentSection = ({ memo, comments, parentPage }: Props) => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const [showEditor, setShowEditor] = useState(false);
  const { data: commentCreators } = useUsersByNames(comments.map((comment) => comment.creator));

  const showCreateButton = currentUser && !showEditor;

  const handleCommentCreated = async (_memoCommentName: string) => {
    setShowEditor(false);
  };

  return (
    <div className="pt-8 pb-16 w-full">
      <h2 id="comments" className="sr-only">
        {t("memo.comment.self")}
      </h2>
      <div className="relative mx-auto grow w-full min-h-full">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/35 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircleIcon className="h-4 w-4" />
            <span>{t("memo.comment.self")}</span>
            <span>({comments.length})</span>
          </div>
          {showCreateButton && (
            <Button variant="ghost" className="text-muted-foreground" onClick={() => setShowEditor(true)}>
              {t("memo.comment.write-a-comment")}
            </Button>
          )}
        </div>
        {showEditor && (
          <div className="mb-4 w-full rounded-3xl border border-border bg-background px-4 py-4 shadow-sm">
            <MemoEditor
              cacheKey={`${memo.name}-${memo.updateTime}-comment`}
              placeholder={t("editor.add-your-comment-here")}
              parentMemoName={memo.name}
              autoFocus
              onConfirm={handleCommentCreated}
              onCancel={() => setShowEditor(false)}
            />
          </div>
        )}
        {comments.length === 0 ? (
          showCreateButton ? null : (
            <div className="w-full py-6 text-center text-sm text-muted-foreground">{t("memo.comment.self")}</div>
          )
        ) : (
          <div className="relative pl-6">
            <div className="absolute bottom-4 left-4 top-4 w-px bg-border" />
            <div className="flex flex-col gap-4">
              {comments.map((comment) => {
                const creator = commentCreators?.get(comment.creator);
                const commentId = extractMemoIdFromName(comment.name);
                const displayTime = comment.displayTime ? timestampDate(comment.displayTime) : undefined;

                return (
                  <div className="relative pl-6" key={`${comment.name}-${comment.displayTime}`} id={commentId}>
                    <span className="absolute left-[0.1rem] top-12 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                    <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <UserAvatar className="h-9 w-9 rounded-2xl" avatarUrl={creator?.avatarUrl} />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {creator?.displayName || creator?.username || "Unknown user"}
                        </div>
                        {displayTime && (
                          <relative-time datetime={displayTime.toISOString()} format="auto" lang={i18n.language}></relative-time>
                        )}
                      </div>
                    </div>
                    <MemoView memo={comment} parentPage={parentPage} compact showCreator={false} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoCommentSection;
