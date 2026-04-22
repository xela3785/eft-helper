import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { loginUser, registerUser } from '../api';
import { getErrorMessage } from '../../../shared/api/errors';
import { buttonClassNames, Button } from '../../../shared/ui/Button';

const loginSchema = z.object({
  username: z.string().min(3, 'Введите не менее 3 символов.'),
  password: z.string().min(4, 'Введите не менее 4 символов.'),
  confirmPassword: z.string().optional(),
});

const registerSchema = z
  .object({
    username: z.string().min(3, 'Введите не менее 3 символов.'),
    password: z.string().min(4, 'Введите не менее 4 символов.'),
    confirmPassword: z.string().min(4, 'Подтвердите пароль.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Пароли должны совпадать.',
    path: ['confirmPassword'],
  });

type AuthMode = 'login' | 'register';

interface FormValues {
  username: string;
  password: string;
  confirmPassword?: string;
}

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const schema = mode === 'register' ? registerSchema : loginSchema;
  const isRegisterMode = mode === 'register';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  const authMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        username: values.username.trim(),
        password: values.password,
      };

      return isRegisterMode ? registerUser(payload) : loginUser(payload);
    },
    onSuccess: () => {
      toast.success(isRegisterMode ? 'Регистрация успешно выполнена.' : 'Вход выполнен.');
      reset();
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          isRegisterMode ? 'Не удалось зарегистрироваться.' : 'Не удалось выполнить вход.',
        ),
      );
    },
  });

  const title = isRegisterMode ? 'Создать аккаунт' : 'Войти в аккаунт';

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
      <h2 className="text-2xl font-semibold text-slate-50">{title}</h2>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit((values) => authMutation.mutate(values))}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">Имя пользователя</span>
          <input
            {...register('username')}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400"
            placeholder="Введите логин"
          />
          {errors.username ? (
            <span className="mt-2 block text-sm text-rose-300">{errors.username.message}</span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">Пароль</span>
          <input
            {...register('password')}
            type="password"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400"
            placeholder="Введите пароль"
          />
          {errors.password ? (
            <span className="mt-2 block text-sm text-rose-300">{errors.password.message}</span>
          ) : null}
        </label>

        {isRegisterMode ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Подтверждение пароля</span>
            <input
              {...register('confirmPassword')}
              type="password"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400"
              placeholder="Повторите пароль"
            />
            {errors.confirmPassword ? (
              <span className="mt-2 block text-sm text-rose-300">{errors.confirmPassword.message}</span>
            ) : null}
          </label>
        ) : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button className="sm:flex-1" disabled={authMutation.isPending} type="submit">
            {authMutation.isPending
              ? 'Отправка...'
              : isRegisterMode
                ? 'Зарегистрироваться'
                : 'Войти'}
          </Button>
          <Link className={buttonClassNames({ variant: 'secondary', fullWidth: true })} to="/">
            Отмена
          </Link>
        </div>
      </form>
    </section>
  );
}
