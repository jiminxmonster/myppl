"use client";

const providers = [
  { name: "Kakao", color: "bg-yellow-400 text-slate-900" },
  { name: "Google", color: "bg-white text-slate-900 border border-[var(--border)]" },
  { name: "Naver", color: "bg-green-500 text-white" },
];

export function SocialLoginButtons() {
  return (
    <div className="mt-6 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">소셜 로그인 준비</p>
      {providers.map((provider) => (
        <button
          key={provider.name}
          type="button"
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold ${provider.color}`}
        >
          {provider.name} 로그인 준비중
        </button>
      ))}
    </div>
  );
}
