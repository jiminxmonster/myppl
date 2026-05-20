"use client";

import { useEffect } from "react";

import { inferShoppingMallName, shoppingMallOptions } from "@/lib/shopping-mall";

type ShoppingMallFieldsProps = {
  link: string;
  storeName: string;
  onLinkChange: (value: string) => void;
  onStoreNameChange: (value: string) => void;
};

const inputClass = "w-full rounded-[5px] border border-[var(--border)] px-4 py-3 outline-none";

export function ShoppingMallFields({ link, storeName, onLinkChange, onStoreNameChange }: ShoppingMallFieldsProps) {
  const inferredStoreName = inferShoppingMallName(link);

  useEffect(() => {
    if (inferredStoreName && !storeName.trim()) {
      onStoreNameChange(inferredStoreName);
    }
  }, [inferredStoreName, onStoreNameChange, storeName]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block space-y-2">
        <span className="text-sm font-medium">쇼핑몰 링크</span>
        <input
          type="url"
          className={inputClass}
          placeholder="https://..."
          value={link}
          onChange={(event) => onLinkChange(event.target.value)}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">쇼핑몰 이름</span>
        <input
          className={inputClass}
          list="shopping-mall-name-options"
          placeholder={inferredStoreName || "예: 네이버쇼핑, 쿠팡, 브랜드 공식몰"}
          value={storeName}
          onChange={(event) => onStoreNameChange(event.target.value)}
        />
        <datalist id="shopping-mall-name-options">
          {shoppingMallOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </label>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        {shoppingMallOptions.slice(0, 8).map((option) => (
          <button
            key={option}
            type="button"
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              storeName === option ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--border)] bg-white text-slate-600"
            }`}
            onClick={() => onStoreNameChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
