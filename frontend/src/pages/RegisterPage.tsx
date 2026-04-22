import { Link } from 'react-router-dom';
import { AuthForm } from '../features/auth/components/AuthForm';
import { buttonClassNames } from '../shared/ui/Button';
import { PageShell } from '../shared/ui/PageShell';

export function RegisterPage() {
  return (
    <PageShell
      eyebrow="Подготовленный маршрут"
      title="Регистрация"
      description="Форма регистрации подготовлена заранее и может быть подключена позже, когда авторизация понадобится в приложении."
      actions={
        <Link className={buttonClassNames()} to="/">
          На дашборд
        </Link>
      }
    >
      <div className="mx-auto max-w-md">
        <AuthForm mode="register" />
      </div>
    </PageShell>
  );
}
