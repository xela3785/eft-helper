import { Link } from 'react-router-dom';
import { AuthForm } from '../features/auth/components/AuthForm';
import { buttonClassNames } from '../shared/ui/Button';
import { PageShell } from '../shared/ui/PageShell';

export function LoginPage() {
  return (
    <PageShell
      eyebrow="Подготовленный маршрут"
      title="Вход"
      description="Форма авторизации готова, но не используется в основном пользовательском потоке приложения."
      actions={
        <Link className={buttonClassNames()} to="/">
          На главную
        </Link>
      }
    >
      <div className="mx-auto max-w-md">
        <AuthForm mode="login" />
      </div>
    </PageShell>
  );
}
