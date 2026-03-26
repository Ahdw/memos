import MemoCommentThread from "@/components/MemoCommentThread";
import { useMemoComments } from "@/hooks/useMemoQueries";
import { useMemoViewContext, useMemoViewDerived } from "../MemoViewContext";

const MemoCommentListView: React.FC = () => {
  const { memo, parentPage } = useMemoViewContext();
  const { isInMemoDetailPage, commentAmount } = useMemoViewDerived();

  const { data } = useMemoComments(memo.name, { enabled: !isInMemoDetailPage && commentAmount > 0 });
  const comments = data?.memos ?? [];

  if (isInMemoDetailPage || commentAmount === 0) {
    return null;
  }

  return <MemoCommentThread comments={comments} memo={memo} parentPage={parentPage} previewCount={3} variant="preview" />;
};

export default MemoCommentListView;
