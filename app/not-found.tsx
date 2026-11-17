import { AppLayout } from "@/components/common/AppLayout";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function NotFound() {
  return (
    <AppLayout>
      <PlaceholderPage
        title="페이지를 찾을 수 없어요"
        description="주소를 확인하거나 위 메뉴에서 홈으로 가 보세요."
      />
    </AppLayout>
  );
}
