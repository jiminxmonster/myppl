import { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type NavigatorItem = {
  label: string;
  href?: string;
};

type PageNavigatorProps = {
  items: NavigatorItem[];
  actions?: ReactNode;
};

export function PageNavigator({ items, actions }: PageNavigatorProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 lg:flex-row lg:items-center lg:justify-between">
      <nav aria-label="breadcrumb" className="min-w-0 flex-1">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                {item.href && !isLast ? (
                  <Link href={item.href} className="font-medium hover:text-[var(--brand)]">
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "font-semibold text-slate-900" : "font-medium"}>
                    {item.label}
                  </span>
                )}
                {!isLast ? <ChevronRight className="h-4 w-4 text-slate-400" /> : null}
              </li>
            );
          })}
        </ol>
      </nav>
      {actions ? <div className="flex flex-wrap items-center justify-end gap-3">{actions}</div> : null}
    </div>
  );
}
