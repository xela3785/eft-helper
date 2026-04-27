import { Link } from 'react-router-dom';
import { AuthForm } from '../features/auth/components/AuthForm';
import { buttonClassNames } from '../shared/ui/button-class-names';
import { PageShell } from '../shared/ui/PageShell';

export function LoginPage() {
  return (
    <PageShell
      eyebrow="Авторизация"
      title="Вход"
      description="Введите email и пароль, чтобы продолжить работу с прогрессом убежища."
      actions={
        <Link className={buttonClassNames()} to="/register">
          Регистрация
        </Link>
      }
    >
      <div className="mx-auto max-w-md">
        <AuthForm mode="login" />
      </div>
    </PageShell>
  );
}
