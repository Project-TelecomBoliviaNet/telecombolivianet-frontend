import { z } from 'zod';

// VITE_API_URL es opcional: en Docker, Nginx proxea /api/* al backend
// y el hub de SignalR usa la ruta relativa /hubs/admin.
// Solo se necesita si se despliega en un dominio diferente al backend.
const envSchema = z.object({
  VITE_API_URL: z.string().optional().default(''),
});

const _parsed = envSchema.safeParse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
});

if (!_parsed.success) {
  const issues = _parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`[env] Variables de entorno inválidas:\n${issues}`);
}

export const env = _parsed.data;
