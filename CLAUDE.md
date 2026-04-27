# CLAUDE.md — Frontend (React + TypeScript)

Instrucciones específicas para trabajar en la carpeta `frontend/`.
Se combinan con las reglas del `CLAUDE.md` raíz.

---

## Stack

| Elemento       | Detalle                                      |
|----------------|----------------------------------------------|
| Framework      | React 18+                                    |
| Lenguaje       | TypeScript (strict mode)                     |
| Build          | Vite                                         |
| Servidor prod  | Nginx (contenedor Docker)                    |
| Estilos        | [Tailwind CSS / CSS Modules — completar]     |
| Estado global  | [Zustand / Redux Toolkit — completar]        |
| HTTP           | [Axios / Fetch / TanStack Query — completar] |
| Testing        | [Vitest + Testing Library — completar]       |

---

## Estructura esperada

```
frontend/frontend/
├── src/
│   ├── components/      ← Componentes reutilizables (solo presentación)
│   ├── pages/           ← Vistas/rutas principales
│   ├── hooks/           ← Custom hooks (lógica reutilizable)
│   ├── services/        ← Llamadas a la API del backend (abstracción HTTP)
│   ├── store/           ← Estado global
│   ├── types/           ← Interfaces y tipos TypeScript
│   └── utils/           ← Helpers puros (sin side effects)
├── public/
├── Dockerfile
├── nginx.conf           ← Configuración Nginx para producción
└── ...
```

---

## Comunicación con el backend

- En Docker: el frontend (Nginx) hace proxy al backend en `http://backend:5000`
- En desarrollo local: configurar en `.env` como `VITE_API_URL=http://localhost:5000`
- **Nunca hardcodear** la URL del backend en el código
- Todos los requests pasan por la capa `services/` — nunca `fetch` directo en componentes

---

## Comandos (ejecutar dentro del contenedor o localmente)

```bash
# Desde la raíz del mono-repo (Docker)
docker compose exec frontend sh

# Dentro del contenedor / local:
npm install
npm run dev          # Dev server (localhost:5173 en local)
npm run build        # Build de producción
npm run lint         # ESLint
npm run lint --fix   # Fix automático
npm run test         # Tests
npm run type-check   # Verificar tipos TypeScript
```

---

## Reglas específicas del frontend

### Separación de responsabilidades
- **Componentes UI**: solo presentación, props tipadas, sin lógica de negocio
- **Hooks**: toda lógica reutilizable (`useClientes`, `useFacturas`, etc.)
- **Services**: todas las llamadas HTTP — encapsuladas, tipadas, con manejo de errores
- **Pages**: orquestación — conectan hooks con componentes

### TypeScript
- Strict mode activado — sin `any` salvo justificación documentada
- Tipar siempre las respuestas de la API con interfaces en `types/`
- No usar `as` para castear sin validar

### Manejo de errores y estados
- Toda llamada asíncrona debe manejar: loading, error y success
- No silenciar errores (`catch` vacío)
- Mostrar feedback al usuario en caso de error (no solo en consola)

### Autenticación JWT
- Token almacenado de forma segura (httpOnly cookie preferido sobre localStorage)
- Interceptor HTTP que adjunta el token automáticamente
- Manejar expiración y refresh de token
- Redirigir a login si el servidor responde 401

### Nginx (producción)
- Verificar que `nginx.conf` redirige `/api/` al backend correctamente
- SPA routing: todas las rutas no encontradas sirven `index.html`
- Headers de seguridad configurados (CSP, X-Frame-Options, etc.)

### Calidad
- Componentes reutilizables documentados con JSDoc si son complejos
- No duplicar lógica de fetching en múltiples componentes
- Limpiar suscripciones/timers en `useEffect` (cleanup function)