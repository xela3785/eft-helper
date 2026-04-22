import { EmptyState } from '../shared/ui/EmptyState';
import { PageShell } from '../shared/ui/PageShell';

export function ItemsPage() {
  return (
    <PageShell
      eyebrow="Раздел в разработке"
      title="Предметы"
      description="Здесь позже можно показать каталог предметов, фильтры и полезные данные по крафтам и модулю убежища."
    >
      <EmptyState
        title="Каталог предметов пока не реализован"
        description="Страница создана как заглушка и уже доступна через верхнее меню."
      />
    </PageShell>
  );
}
