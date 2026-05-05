import { ProductAlertManager } from "@/components/catalog/product-alert-manager";

export default function HotdealSubscribePage() {
  return (
    <ProductAlertManager
      title="핫딜받기"
      description="원하는 상품군과 세부 조건을 저장하고, 카카오 알림·문자·이메일·내부 알림 중 원하는 채널로 핫딜 등록 소식을 받습니다."
      breadcrumbItems={[
        { label: "홈", href: "/" },
        { label: "핫딜", href: "/hotdeals" },
        { label: "핫딜받기" },
      ]}
    />
  );
}
