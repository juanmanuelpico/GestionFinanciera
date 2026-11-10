# Gestión Financiera

Sistema de gestión financiera con infraestructura Docker.

- **Backend:** NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Chatbot:** Python + FastAPI + LangChain (RAG y futuras tools CRUD)
- **Infraestructura:** Docker Compose (entorno de desarrollo)

## Requisitos

- Docker Desktop con Docker Compose v2
- Node.js 24 (solo para ejecutar comandos locales opcionales)
- Python 3.11+ (solo para correr el chatbot fuera de Docker)

## Puesta en marcha

```bash
cp env.example .env
docker compose up --build -d
```

Servicios disponibles (puertos por defecto definidos en `.env`):

| Servicio | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api |
| Swagger | http://localhost:3000/api/docs |
| Health | http://localhost:3000/api/health |
| PostgreSQL | localhost:5433 |
| Chatbot (API) | http://localhost:8100 |
| Chatbot (docs) | http://localhost:8100/docs |
| Adminer (opcional) | http://localhost:8080 |

El frontend consume el chatbot con `VITE_CHATBOT_URL` (plantilla en `env.example`);
los puertos publicados en host, credenciales, JWT y URL de la API se toman del
archivo `.env` (plantilla en `env.example`). Si cambiás `API_PORT` o `WEB_PORT`,
actualizá también `VITE_API_URL` y `CORS_ORIGIN` en el mismo archivo.

Adminer se levanta con el perfil `tools`:

```bash
docker compose --profile tools up -d adminer
```

El administrador inicial se crea con `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NAME`
del archivo `.env`. La plantilla trae valores de desarrollo: cambialos antes de
usar el sistema fuera de un entorno local.

## Comandos útiles

```bash
# Ver logs
docker compose logs -f api
docker compose logs -f web

# Detener servicios
docker compose down

# Detener y borrar la base de datos
docker compose down -v

# Migraciones
docker compose exec api npx prisma migrate dev --name <nombre>

# Seed
docker compose exec api npx prisma db seed

# Tests backend
docker compose exec api npm run test
docker compose exec api npm run test:e2e

# Tests frontend
docker compose exec web npm run test

# Chatbot: logs y tests
docker compose logs -f chatbot
docker compose exec chatbot python -m pytest

# Lint y typecheck
docker compose exec api npm run lint
docker compose exec api npm run typecheck
docker compose exec web npm run lint
docker compose exec web npm run build
```

## Estructura

```
.
├── docker-compose.yml
├── env.example
├── backend/            # NestJS + Prisma
│   ├── prisma/         # schema, migraciones y seed
│   └── src/
│       ├── common/     # filtros, interceptores, decoradores
│       ├── config/     # configuración y validación de entorno
│       ├── database/   # PrismaModule / PrismaService
│       └── modules/    # auth, users, health y dominio
├── chatbot/            # Python + FastAPI + LangChain (ver chatbot/README.md)
│   ├── app/            # servidor, chains RAG, core LLM y tools hacia la API
│   └── scripts/        # ingesta de documentos a ChromaDB
└── frontend/           # React + Vite + Tailwind
    └── src/
        ├── app/        # router y providers
        ├── components/ # ui y layout
        ├── features/   # auth y módulos de dominio
        ├── lib/        # api client, query client, utils
        └── routes/     # rutas protegidas/públicas
```

## Notas de desarrollo

- El sistema de diseño del frontend está en `docs/ui/design-system.md`: es obligatorio
  leerlo antes de crear o modificar cualquier pantalla. El color primario se cambia en
  runtime (`blue` por defecto, `amber`, `emerald`).
- Toda pantalla nueva o modificada se revisa con el agente `mobile-ui`
  (`.opencode/agents/mobile-ui.md`) antes de darla por terminada; ver `AGENTS.md`.
- `node_modules` se guarda en volúmenes nombrados para evitar conflictos con el host (Windows).
- Vite usa polling para HMR dentro de Docker.
- Al cambiar dependencias ejecutar `docker compose down -v && docker compose up --build` o `npm install` dentro del contenedor.
- Los modelos y endpoints de dominio (cuentas, categorías, transacciones, presupuestos, reportes) se agregarán junto con los casos de uso.
