import { EmptyState } from '../shared/ui/EmptyState';
import { PageShell } from '../shared/ui/PageShell';

export function MarketPage() {
  return (
    <PageShell
      eyebrow="Раздел в разработке"
      title="Маркет"
      description="Здесь позже появится работа с барахолкой, ценами и вспомогательной аналитикой."
    >
      <EmptyState
        title="Маркет пока не реализован"
        description="Страница создана как заглушка и уже подключена в навигацию."
      />
    </PageShell>
  );
}
