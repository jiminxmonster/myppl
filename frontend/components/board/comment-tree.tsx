import { CommentNode } from "@/lib/api";

type CommentTreeProps = {
  comments: CommentNode[];
};

export function CommentTree({ comments }: CommentTreeProps) {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-2xl bg-[var(--muted)]/50 p-4">
          <p className="text-sm font-semibold">{comment.author_nickname}</p>
          <p className="mt-2 text-sm text-slate-700">{comment.content}</p>
        </div>
      ))}
    </div>
  );
}
