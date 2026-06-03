import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ProductsPage() {
  redirect("/boards/seller-hot-issues");
}
