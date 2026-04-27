import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { getMe, loginUser, registerUser } from '../../../entities/auth/api';
import type { User } from '../../../entities/auth/types';
import { authQueryKeys } from '../model/query-keys';
import { useAuthStore } from '../model/auth-store';
import { getErrorMessage } from '../../../shared/api/errors';
import { Button } from '../../../shared/ui/Button';
import { buttonClassNames } from '../../../shared/ui/button-class-names';

const loginSchema = z.object({
  email: z.string().min(3, 'Введите не менее 3 символов.'),
  password: z.string().min(4, 'Введите не менее 4 символов.'),
  confirmPassword: z.string().optional(),
});

const registerSchema = z
  .object({
    email: z.string().min(3, 'Введите не менее 3 символов.'),
    password: z.string().min(4, 'Введите не менее 4 символов.'),
    confirmPassword: z.string().min(4, 'Подтвердите пароль.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Пароли должны совпадать.',
    path: ['confirmPassword'],
  });

type AuthMode = 'login' | 'register';

interface FormValues {
  email: string;
  password: string;
  confirmPassword?: string;
}

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const schema = mode === 'register' ? registerSchema : loginSchema;
  const isRegisterMode = mode === 'register';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const authMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        email: values.email.trim(),
        password: values.password,
      };

      return isRegisterMode ? registerUser(payload) : loginUser(payload);
    },
    onSuccess: async () => {
      if (isRegisterMode) {
        toast.success('Регистрация успешно выполнена. Теперь войдите в аккаунт.');
        reset();
        navigate('/login', { replace: true });
        return;
      }

      try {
        const user = await queryClient.fetchQuery<User>({
          queryKey: authQueryKeys.me,
          queryFn: getMe,
        });
        setUser(user);
      } catch {
        await queryClient.invalidateQueries({ queryKey: authQueryKeys.me });
      }

      toast.success('Вход выполнен.');
      reset();
      navigate('/', { replace: true });
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
  const switchText = isRegisterMode ? 'Уже есть аккаунт?' : 'Нет аккаунта?';
  const switchLinkText = isRegisterMode ? 'Войти' : 'Зарегистрироваться';
  const switchLinkTo = isRegisterMode ? '/login' : '/register';

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
      <h2 className="text-2xl font-semibold text-slate-50">{title}</h2>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit((values) => authMutation.mutate(values))}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
          <input
            {...register('email')}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-400"
            placeholder="Введите email"
          />
          {errors.email ? (
            <span className="mt-2 block text-sm text-rose-300">{errors.email.message}</span>
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
        </div>
        <div className="space-y-3 pt-2">
          <p className="text-sm font-medium text-slate-300">Войти с помощью</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <a className={buttonClassNames({ variant: 'secondary' })} href="http://127.0.0.1:8000/api/v1/auth/google">
              <svg
                aria-hidden="true"
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.7 3.1-4.2 3.1-7.5Z"
                  fill="#4285F4"
                />
                <path
                  d="M12 22c2.7 0 4.9-.9 6.5-2.3l-3.2-2.6c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.5-4h-3.3v2.7A10 10 0 0 0 12 22Z"
                  fill="#34A853"
                />
                <path
                  d="M6.5 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.3H3.2A10 10 0 0 0 2 12c0 1.6.4 3.2 1.2 4.7L6.5 14Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 3.1 14.7 2 12 2a10 10 0 0 0-8.8 5.3L6.5 10c.8-2.3 3-4 5.5-4Z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </a>
            <a className={buttonClassNames({ variant: 'secondary' })} href="http://127.0.0.1:8000/api/v1/auth/github">
              <svg
                aria-hidden="true"
                className="mr-2 h-4 w-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.2.8-.6v-2.1c-3.4.7-4.1-1.6-4.1-1.6-.6-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.3 1 .1-.7.4-1.3.7-1.5-2.7-.3-5.5-1.4-5.5-6.1 0-1.3.5-2.4 1.2-3.3-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.4 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.4-1.2 3.4-1.2.6 1.6.2 2.8.1 3.1.8.9 1.2 2 1.2 3.3 0 4.7-2.8 5.8-5.5 6.1.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A12 12 0 0 0 12 .5Z" />
              </svg>
              Github
            </a>
          </div>
        </div>
        <p className="text-sm text-slate-300">
          {switchText}{' '}
          <Link className="text-violet-300 transition hover:text-violet-200" to={switchLinkTo}>
            {switchLinkText}
          </Link>
        </p>
      </form>
    </section>
  );
}
