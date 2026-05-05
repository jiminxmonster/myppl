import { ProductAlertManager } from "@/components/catalog/product-alert-manager";

export default function MyHotdealPage() {
  return (
    <ProductAlertManager
      title="나의 핫딜"
      description="내가 저장한 핫딜 조건과 알림 채널 설정을 한 번에 확인하고 관리합니다."
      breadcrumbItems={[
        { label: "홈", href: "/" },
        { label: "핫딜", href: "/hotdeals" },
        { label: "나의 핫딜" },
      ]}
    />
  );
}
