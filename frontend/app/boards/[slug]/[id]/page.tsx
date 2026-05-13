import { PageNavigator } from "@/components/layout/page-navigator";
import { PostDetailView } from "@/components/board/post-detail-view";
import { getBoardDetail, getPostDetail } from "@/lib/api";

type PostDetailPageProps = {
  params: Promise<{ slug: string; id: string }>;
};

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { slug, id } = await params;
  const [post, board] = await Promise.all([
    getPostDetail(id).catch(() => null),
    getBoardDetail(slug).catch(() => null),
  ]);

  if (!post) {
    return <div className="rounded-xl bg-white p-8 shadow-soft">게시글을 불러오지 못했습니다.</div>;
  }

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: board?.slug === "notice" ? "공지" : board?.board_type === "product" ? "상품게시판" : "커뮤니티", href: board?.slug === "notice" ? "/boards/notice" : "/boards" },
          ...(board ? [{ label: board.name, href: `/boards/${slug}` }] : []),
          { label: post.title },
        ]}
      />
      <PostDetailView slug={slug} postId={id} initialPost={post} />
    </section>
  );
}
