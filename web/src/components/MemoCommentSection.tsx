import MemoCommentThread from "@/components/MemoCommentThread";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";

interface Props {
  memo: Memo;
  comments: Memo[];
  parentPage?: string;
}

const MemoCommentSection = ({ memo, comments, parentPage }: Props) => {
  const t = useTranslate();

  return (
    <>
      <h2 id="comments" className="sr-only">
        {t("memo.comment.self")}
      </h2>
      <MemoCommentThread comments={comments} memo={memo} parentPage={parentPage} variant="detail" />
    </>
  );
};

export default MemoCommentSection;
