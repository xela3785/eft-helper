import { Link } from 'react-router-dom';
import { AuthForm } from '../features/auth/components/AuthForm';
import { buttonClassNames } from '../shared/ui/button-class-names';
import { PageShell } from '../shared/ui/PageShell';

export function RegisterPage() {
  return (
    <PageShell
      eyebrow="Создание аккаунта"
      title="Регистрация"
      description="Создайте учетную запись, чтобы отслеживать прогресс и входить в систему по логину и паролю."
      actions={
        <Link className={buttonClassNames()} to="/login">
          Вход
        </Link>
      }
    >
      <div className="mx-auto max-w-md">
        <AuthForm mode="register" />
      </div>
    </PageShell>
  );
}
