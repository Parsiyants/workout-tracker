# tigran_tracker

Трекер тренировок и ежедневных практик.

Деплой на VPS (GitHub Actions + SSH, домены и nginx) — см. [DEPLOY.md](./DEPLOY.md).

## Запуск

```bash
cp .env.example .env
docker compose up --build
```

- UI (dev): http://localhost:5173
- UI (прод-сборка + PWA): http://localhost:8081 — `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build web`
- API: http://localhost:8000/api/health
- Storage: http://localhost:8010/health
- Postgres: localhost:5434

С телефона в той же сети: `http://<LAN-IP>:5173` (все сервисы слушают `0.0.0.0`).
Медиа отдаётся через тот же origin — Vite проксирует `/files` в storage, поэтому ссылки в БД относительные (`/files/exercises/x.jpg`).

## PWA (мобильное приложение)

В `frontend/public/` лежит `manifest.webmanifest`, `sw.js` и иконки. Service worker кэширует оболочку
и медиа (`/files/*`), API всегда идёт в сеть.

Установка требует **HTTPS** (или `localhost`): service worker не работает на `http://<IP>`.

1. Прод-сборка: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build web`
2. HTTPS снаружи — любой туннель, например `cloudflared tunnel --url http://localhost:8081`
   (или домен + сертификат на сервере).
3. Открыть адрес туннеля на телефоне:
   - Android/Chrome — меню → «Установить приложение»;
   - iOS/Safari — «Поделиться» → «На экран Домой».

После установки работает офлайн-оболочка; запись тренировки офлайн пока не поддерживается —
запросы к API идут в сеть.

## Storage

Отдельный сервис (`storage/`) для картинок и видео упражнений.

| Метод    | Путь                                            | Доступ                    |
| -------- | ----------------------------------------------- | ------------------------- |
| `POST`   | `/files?folder=exercises` (multipart `files[]`) | админ (JWT + claim `adm`) |
| `GET`    | `/files/{folder}/{name}`                        | публично                  |
| `DELETE` | `/files` (`{"paths": ["exercises/xxx.webp"]}`)  | админ                     |
| `POST`   | `/files/prune` (`{"folder", "keep": [...]}`)    | админ                     |

Файлы лежат в volume `uploads` (`/data/uploads` внутри контейнера). В БД хранится только URL.
`PUBLIC_BASE_URL` — адрес, который отдаётся клиенту (на сервере: `https://files.example.com`).

## Чистка осиротевших файлов

Удаляет из storage всё, на что не ссылается ни одно упражнение или категория.

```bash
docker compose exec backend python -m app.maintenance
# или из админки: POST /api/admin/storage/prune
```

## Админ

Создаётся сидом при старте backend (`ADMIN_EMAIL` / `ADMIN_PASSWORD` из `.env`).

Публичной регистрации нет: `POST /api/auth/register` требует токен админа и создаёт пользователя.
В UI — страница «Пользователи» (`/users`, видна только админу).

Упражнения в общем каталоге может добавлять и редактировать любой авторизованный пользователь
(демо — только чтение).

## Сид плана тренировок

`backend/app/seed_plan.py` создаёт при первом запуске упражнения «Дня A–D» и четыре шаблона
(Спина и задние дельты / Ноги и кор / Грудь и руки / Плечи и трапеции) для админа.
Идемпотентно: повторный запуск ничего не дублирует.

## Миграции

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend alembic revision --autogenerate -m "change"
```
