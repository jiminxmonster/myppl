import { ProductAlertManager } from "@/components/catalog/product-alert-manager";

export default function MyAlertPage() {
  return (
    <ProductAlertManager
      title="상품 알림 설정"
      description="관심 상품 조건을 저장하고, 받고 싶은 알림 채널을 선택합니다."
      showChannelPreferencePanel
      breadcrumbItems={[
        { label: "홈", href: "/" },
        { label: "마이페이지", href: "/mypage" },
        { label: "상품 알림 설정" },
      ]}
    />
  );
}
