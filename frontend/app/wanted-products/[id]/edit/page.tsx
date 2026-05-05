import { ProductAlertManager } from "@/components/catalog/product-alert-manager";

type WantedProductsEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function WantedProductsEditPage({ params }: WantedProductsEditPageProps) {
  const { id } = await params;

  return (
    <ProductAlertManager
      title="원하는상품 수정"
      description="저장한 원하는 상품 조건과 알림 설정을 다시 조정합니다."
      initialSubscriptionId={Number(id)}
      breadcrumbItems={[
        { label: "홈", href: "/" },
        { label: "원하는상품", href: "/wanted-products" },
        { label: "수정" },
      ]}
    />
  );
}
