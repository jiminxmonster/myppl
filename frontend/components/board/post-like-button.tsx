"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";

import { likePost } from "@/lib/api";

type PostLikeButtonProps = {
  postId: number;
  initialLikes: number;
};

export function PostLikeButton({ postId, initialLikes }: PostLikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setError("");

    try {
      // 추천 성공 시 서버가 계산한 최신 추천 수로 갱신한다.
      const data = await likePost(postId);
      setLikes(data.likes);
    } catch (requestError) {
      setError("추천 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        <ThumbsUp className="h-4 w-4" />
        추천 {likes}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
