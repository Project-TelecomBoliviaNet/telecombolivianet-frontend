import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Wifi, Loader2, AlertCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { extractApiError } from '@/utils/apiError';

const loginSchema = z.object({
  Email:    z.string().min(1, 'El correo es obligatorio').email('Correo inválido'),
  Password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate   = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError,  setServerError]  = useState('');
  const [isLoading,    setIsLoading]    = useState(false);

  const { register, handleSubmit, formState: { errors } } =
    useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setServerError('');
    setIsLoading(true);
    try {
      const res = await authService.login(data);
      setSession({
        token:                  res.Token,
        userId:                 res.UserId,
        fullName:               res.FullName,
        email:                  res.Email,
        role:                   res.Role,
        requiresPasswordChange: res.RequiresPasswordChange,
      });
      navigate(res.RequiresPasswordChange ? '/change-password' : res.RedirectUrl, { replace: true });
    } catch (err: unknown) {
      setServerError(extractApiError(err, 'Error al iniciar sesión. Intenta nuevamente.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Wifi className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">TelecomBoliviaNet</h1>
          <p className="text-blue-200 text-sm mt-1">Sistema de gestión interno</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

          {serverError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div>
              <label htmlFor="Email" className="label">Correo electrónico</label>
              <input
                id="Email" type="email" autoComplete="email"
                placeholder="admin@telecombolivianet.bo"
                className={`input-field ${errors.Email ? 'input-error' : ''}`}
                {...register('Email')}
              />
              {errors.Email && <p className="error-msg">{errors.Email.message}</p>}
            </div>

            <div>
              <label htmlFor="Password" className="label">Contraseña</label>
              <div className="relative">
                <input
                  id="Password" type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password" placeholder="••••••••"
                  className={`input-field pr-10 ${errors.Password ? 'input-error' : ''}`}
                  {...register('Password')}
                />
                <button type="button" tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.Password && <p className="error-msg">{errors.Password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5 mt-2">
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</>
                : 'Ingresar al sistema'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Acceso exclusivo para personal autorizado
          </p>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          © {new Date().getFullYear()} TelecomBoliviaNet · Cochabamba, Bolivia
        </p>
      </div>
    </div>
  );
}
