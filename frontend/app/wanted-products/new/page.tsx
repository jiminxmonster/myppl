import { ProductAlertManager } from "@/components/catalog/product-alert-manager";

export default function WantedProductsNewPage() {
  return (
    <ProductAlertManager
      title="원하는상품 등록"
      description="운영자가 정의한 체크리스트와 알림 옵션을 골라 원하는 상품을 저장합니다."
      breadcrumbItems={[
        { label: "홈", href: "/" },
        { label: "원하는상품", href: "/wanted-products" },
        { label: "원하는상품+" },
      ]}
    />
  );
}
