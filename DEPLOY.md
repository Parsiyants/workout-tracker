# Деплой workout-tracker на VPS (GitHub Actions + SSH)

Инструкция для первого раза: всё по шагам, с пометками **где** выполнять команду.

- 🖥️ **локально** — терминал на вашем компьютере
- ☁️ **на сервере** — после `ssh root@168.222.140.36`
- 🌐 **в браузере** — GitHub / DNS-панель

---

## 0. Как это будет устроено (и как вообще работает nginx)

### Главное правило

На одном IP-адресе порт **80** (http) может слушать **только один процесс**. Сейчас его уже слушает
ваш первый проект (`abm_app`) — он и принимает все запросы на `abm-order.ru`.

Значит, наш второй проект **не может** поднять свой nginx на 80. Вместо этого тот единственный
входной nginx работает как **коммутатор**: смотрит, на какой домен пришёл запрос, и отправляет его
в нужный контейнер.

### Как nginx выбирает, куда отправить

```
запрос: GET https://workout-tracker.abm-order.ru/catalog
   │
   ▼
edge_nginx :443  →  смотрит заголовок Host: workout-tracker.abm-order.ru
   └─ находит server { server_name workout-tracker.abm-order.ru; ... }
        └─ location /  →  proxy_pass http://127.0.0.1:8080
             └─ tracker_web отдаёт SPA и сам проксирует /api и /files
```

- `server_name` — «я обслуживаю этот домен»;
- `location` — «запросы с таким путём обрабатываю так»;
- `proxy_pass` — «передай запрос вот этому адресу».

Входной nginx — **общий**, он лежит отдельно от проектов в `/root/edge` и ничего не знает
о их внутренностях. Проекты только публикуют свои порты на loopback (`127.0.0.1:8080` и т.п.),
снаружи эти порты закрыты.

### Что где будет

```
/root/abm_app           — первый проект
/root/workout-tracker   — наш проект
/root/edge              — общий входной nginx (80/443, конфиги обоих проектов)
```

| Домен                                  | Куда идёт                  | Что это                              |
| -------------------------------------- | -------------------------- | ------------------------------------ |
| `abm-order.ru`, `api.abm-order.ru`     | `127.0.0.1:3005` / `:8000` | первый проект                        |
| `workout-tracker.abm-order.ru`         | `127.0.0.1:8080`           | сайт + PWA (внутри `/api`, `/files`) |
| `api.workout-tracker.abm-order.ru`     | `127.0.0.1:8081`           | API, `/docs`                         |
| `storage.workout-tracker.abm-order.ru` | `127.0.0.1:8082`           | файлы упражнений                     |

Контейнеры: `tracker_web`, `tracker_backend`, `tracker_storage`, `tracker_db`.
Порты публикуются только на `127.0.0.1` — снаружи и для `abm_app` они не видны.
Postgres вообще не публикуется.

### Файлы деплоя в репозитории

| Файл                                      | Для чего                                |
| ----------------------------------------- | --------------------------------------- |
| `.github/workflows/deploy.yml`            | автодеплой по push в `main`             |
| `docker-compose.server.yml`               | прод-стек (порты на loopback)           |
| `deploy/edge/`                            | готовый общий nginx для `/root/edge`    |
| `deploy/edge/conf.d/abm.conf`             | маршруты первого проекта (abm-order.ru) |
| `deploy/edge/conf.d/workout-tracker.conf` | маршруты нашего проекта                 |
| `deploy/edge/README.md`                   | миграция на общий nginx без простоя     |
| `.env.example`                            | шаблон секретов (на сервере → `.env`)   |

---

## 1. Залить проект на GitHub 🖥️

Репозитория сейчас нет, создаём:

```bash
cd "/home/parsiyants/Рабочий стол/tigran_workplace/tigran_tracker"
git init -b main
git add .
git commit -m "Initial commit"
```

`.env` уже в `.gitignore` — проверьте: `git status --short` не должен показывать `.env`.

🌐 Создайте **пустой** репозиторий на GitHub (например `workout-tracker`), затем:

```bash
git remote add origin git@github.com:<ВАШ_ЛОГИН>/workout-tracker.git
git push -u origin main
```

---

## 2. SSH-ключ для деплоя

Логика: GitHub Actions должен уметь заходить на сервер без пароля. Для этого создаём
**отдельную** пару ключей: приватный — в GitHub Secrets, публичный — на сервере.

### 2.1 Создать ключ 🖥️ локально

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/workout_deploy -N ""
```

- `-f ~/.ssh/workout_deploy` — файл ключа (появится `workout_deploy` и `workout_deploy.pub`);
- `-N ""` — без пароля (иначе Actions не сможет его использовать);
- на вопросы ничего дополнительно отвечать не надо.

### 2.2 Положить публичный ключ на сервер 🖥️ локально

```bash
ssh-copy-id -i ~/.ssh/workout_deploy.pub root@168.222.140.36
```

(если `ssh-copy-id` недоступен — `cat ~/.ssh/workout_deploy.pub` и вставить строку
в `/root/.ssh/authorized_keys` на сервере)

Проверка — должно пустить без пароля:

```bash
ssh -i ~/.ssh/workout_deploy root@168.222.140.36 "echo ok"
```

### 2.3 Добавить приватный ключ в GitHub 🌐

Скопируйте **приватный** ключ целиком (вместе со строками `-----BEGIN/END-----`):

```bash
🖥️  cat ~/.ssh/workout_deploy
```

🌐 GitHub → репозиторий → **Settings → Secrets and variables → Actions → New repository secret**:

| Имя           | Значение                                       |
| ------------- | ---------------------------------------------- |
| `VPS_HOST`    | `168.222.140.36`                               |
| `VPS_USER`    | `root`                                         |
| `VPS_PORT`    | `22`                                           |
| `VPS_SSH_KEY` | содержимое `~/.ssh/workout_deploy` (весь файл) |

> Приватный ключ нельзя показывать никому и нельзя коммитить в репозиторий.

---

## 3. Сервер: клонировать проект и заполнить `.env`

### 3.1 Зайти на сервер 🖥️ локально

```bash
ssh root@168.222.140.36
```

### 3.2 Доступ сервера к GitHub ☁️ (только для приватного репозитория)

Серверу нужен свой ключ на чтение:

```bash
ssh-keygen -t ed25519 -C "vps-read" -f ~/.ssh/github_read -N ""
cat ~/.ssh/github_read.pub
```

🌐 GitHub → репозиторий → **Settings → Deploy keys → Add deploy key** → вставить этот ключ
(«Allow write access» не нужно).

☁️ Прописать ключ для github.com:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_read
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
```

Если репозиторий публичный — шаг можно пропустить.

### 3.3 Клонировать проект ☁️

```bash
cd /root
git clone git@github.com:<ВАШ_ЛОГИН>/workout-tracker.git
cd workout-tracker
```

Путь `/root/workout-tracker` совпадает с тем, что прописан в workflow. Если выберете другой —
поправьте `cd` в `.github/workflows/deploy.yml`.

### 3.4 Создать `.env` — по шагам ☁️

**Шаг 1.** Скопировать шаблон:

```bash
cp .env.example .env
```

**Шаг 2.** Сгенерировать два секрета (каждая команда печатает строку — скопируйте её):

```bash
openssl rand -hex 32      # → это JWT_SECRET
openssl rand -hex 16      # → это POSTGRES_PASSWORD
```

**Шаг 3.** Открыть файл на редактирование:

```bash
nano .env
```

**Шаг 4.** Вписать значения (что означает каждая строка):

```dotenv
# подпись JWT-токенов: вставьте вывод `openssl rand -hex 32`
JWT_SECRET=8f3c...32_символа

# под каким логином/паролем вы будете входить в приложение как админ
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=придумайте_надёжный_пароль

# пароль Postgres: вставьте вывод `openssl rand -hex 16`
POSTGRES_USER=tracker
POSTGRES_PASSWORD=7a1f...16_символов
POSTGRES_DB=tracker

# пусто = ссылки на файлы относительные (/files/...) — то, что нужно
STORAGE_PUBLIC_URL=

# с какого домена разрешены запросы к storage
ALLOWED_ORIGINS=https://workout-tracker.abm-order.ru
```

**Шаг 5.** Сохранить и выйти: `Ctrl+O` → `Enter` → `Ctrl+X`.

**Шаг 6.** Проверить, что всё записалось:

```bash
cat .env
```

> ⚠️ Админ создаётся **при первом запуске** из `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
> Если поменять их позже, пароль в базе не изменится (нужно менять через БД или пересевом).

---

## 4. DNS: три поддомена 🌐

У регистратора (или в Cloudflare) добавьте A-записи:

| Имя                                    | Тип | Значение         |
| -------------------------------------- | --- | ---------------- |
| `workout-tracker.abm-order.ru`         | A   | `168.222.140.36` |
| `api.workout-tracker.abm-order.ru`     | A   | `168.222.140.36` |
| `storage.workout-tracker.abm-order.ru` | A   | `168.222.140.36` |

Проверка (через несколько минут) 🖥️:

```bash
dig +short workout-tracker.abm-order.ru
```

> Cloudflare: включите «проксировано» (оранжевая тучка) — сразу получите HTTPS, нужный для PWA.

---

## 5. Общий входной nginx в `/root/edge`

Один nginx на весь VPS: принимает 80/443 и по домену разводит запросы по проектам.
Конфиги проектов лежат рядом — в `/root/edge/conf.d`. В `abm_app` и `workout-tracker` ничего
дописывать не нужно.

```
интернет ──► edge_nginx (80/443)
               ├── abm-order.ru / api.abm-order.ru → 127.0.0.1:3005 / :8000
               └── workout-tracker.* → 127.0.0.1:8080 / :8081 / :8082
```

### Шаг 1. Узнать, кто держит 80/443 и где сертификаты ☁️

```bash
ss -ltnp | grep -E ':(80|443) '
docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E ':(80|443)->'

ls /etc/letsencrypt/live/
openssl x509 -in /etc/letsencrypt/live/abm-order.ru/fullchain.pem -noout -text \
  | grep -A1 "Subject Alternative Name"
```

Если сертификат лежит в другой папке — поправьте пути `ssl_certificate` и `ssl_certificate_key`
в `deploy/edge/conf.d/abm.conf` и `deploy/edge/conf.d/workout-tracker.conf`.

> Wildcard `*.abm-order.ru` покрывает `workout-tracker.abm-order.ru`, но **не** покрывает
> `api.workout-tracker...` и `storage.workout-tracker...` (wildcard — только один уровень).
> Как добавить их в сертификат — в `deploy/edge/README.md`, раздел «Сертификаты».

### Шаг 2. Разложить edge на сервере ☁️

```bash
mkdir -p /root/edge/certbot/www /root/edge/logs
cp -r /root/workout-tracker/deploy/edge/conf.d /root/edge/
cp /root/workout-tracker/deploy/edge/docker-compose.yml /root/edge/
```

### Шаг 3. Проверить конфиг, НЕ останавливая старый nginx ☁️

```bash
docker run --rm \
  -v /root/edge/conf.d:/etc/nginx/conf.d:ro \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  nginx:alpine nginx -t
```

Ожидаем `syntax is ok` / `test is successful`.

### Шаг 4. Переключение (простой 2–10 секунд) ☁️

```bash
docker ps --format '{{.Names}}' | grep -i nginx     # имя старого nginx
docker stop <имя_старого_nginx>                      # или: systemctl stop nginx

cd /root/edge && docker compose up -d
docker logs --tail=20 edge_nginx
```

### Шаг 5. Проверить оба проекта ☁️

```bash
curl -I https://abm-order.ru
curl -I https://workout-tracker.abm-order.ru
curl -s https://workout-tracker.abm-order.ru/api/health
```

### Откат

```bash
cd /root/edge && docker compose down
docker start <имя_старого_nginx>     # или: systemctl start nginx
```

Старые проекты не менялись — старый nginx снова займёт 80/443.

### Шаг 6. Закрепить ☁️

```bash
docker update --restart=no <имя_старого_nginx>   # или: systemctl disable --now nginx
```

> Сертификаты, автопродление и добавление третьего проекта — в `deploy/edge/README.md`.

---

## 6. Первый запуск ☁️

```bash
cd /root/workout-tracker
docker compose -f docker-compose.server.yml up -d --build
docker compose -f docker-compose.server.yml ps
```

Первая сборка — несколько минут (ставится node и собирается фронтенд).
Внутри backend при старте: `alembic upgrade head` → `python -m app.seed` → uvicorn.

Проверки ☁️ (до переключения nginx — напрямую по loopback):

```bash
curl -s http://127.0.0.1:8080/api/health
curl -s http://127.0.0.1:8081/api/health
curl -I http://127.0.0.1:8082/
```

После шага 5 — уже через домен:

```bash
curl -s https://workout-tracker.abm-order.ru/api/health
```

Затем в браузере: `https://workout-tracker.abm-order.ru` → вход под `ADMIN_EMAIL`.

---

## 7. Автоматический деплой

🌐 GitHub → **Actions → Deploy to VPS → Run workflow** (ручной первый запуск).
Дальше каждый push в `main` деплоит сам:

```bash
🖥️  git add -A && git commit -m "..." && git push
```

Что делает workflow: `git fetch` → `git reset --hard origin/main` (ваш `.env` не трогается) →
`docker compose -f docker-compose.server.yml up -d --build` → `docker image prune -f` → `ps`.

---

## 8. HTTPS

Сертификаты у вас уже есть (certbot на хосте), edge-nginx монтирует `/etc/letsencrypt`
и использует их напрямую — блоки `listen 443 ssl` уже прописаны в `deploy/edge/conf.d/*.conf`.

Осталось убедиться, что наши домены попали в сертификат:

```bash
openssl x509 -in /etc/letsencrypt/live/abm-order.ru/fullchain.pem -noout -text \
  | grep -A1 "Subject Alternative Name"
```

Если `workout-tracker.abm-order.ru` / `api.` / `storage.` в списке нет — расширить сертификат
без простоя (nginx продолжает работать):

```bash
certbot certonly --webroot -w /root/edge/certbot/www --expand \
  -d abm-order.ru -d www.abm-order.ru -d api.abm-order.ru \
  -d workout-tracker.abm-order.ru \
  -d api.workout-tracker.abm-order.ru \
  -d storage.workout-tracker.abm-order.ru
docker exec edge_nginx nginx -s reload
```

Автопродление (challenge-файлы edge отдаёт из `/var/www/certbot`):

```bash
crontab -e
# 0 3 * * * certbot renew --webroot -w /root/edge/certbot/www --deploy-hook "docker exec edge_nginx nginx -s reload"
```

После HTTPS: Android/Chrome → «Установить приложение», iOS/Safari → «Поделиться → На экран Домой».

---

## 9. Обслуживание

```bash
cd /root/workout-tracker

# логи
docker compose -f docker-compose.server.yml logs -f tracker_backend
docker compose -f docker-compose.server.yml logs --tail=100 tracker_web

# перезапуск одного сервиса
docker compose -f docker-compose.server.yml restart tracker_backend

# бэкап БД
docker exec tracker_db pg_dump -U tracker tracker > /root/backup_$(date +%F).sql

# бэкап загруженных файлов
docker run --rm -v workout-tracker_uploads:/data -v /root:/backup alpine \
  tar czf /backup/uploads_$(date +%F).tar.gz -C /data .
```

Откат версии: `git revert <коммит>` (или `git reset --hard <коммит>`) → `git push`.

---

## 10. Частые проблемы

| Симптом                               | Причина / решение                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `502 Bad Gateway` на нашем домене     | `tracker_web`/`tracker_backend` не запущены — `docker compose -f docker-compose.server.yml ps` и логи |
| `JWT_SECRET is required` в логах      | нет `/root/workout-tracker/.env` или в нём нет `JWT_SECRET`                                           |
| 404 после перезагрузки страницы       | в server-блоке edge неверный `server_name` или `proxy_pass`                                           |
| `/files/...` → 404                    | `tracker_storage` не запущен (порт 8082)                                                              |
| `502` после перезапуска edge          | проект публикует порт не на тот порт — сверьте `ports:` в compose с `proxy_pass` в conf.d             |
| «Установить приложение» не появляется | нет HTTPS или домен не в сертификате (п. 8)                                                           |
| Деплой падает на `git fetch`          | у сервера нет доступа к приватному репозиторию (п. 3.2)                                               |
| Сборка падает по памяти               | swap 2 ГБ: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
| Конфликт портов                       | исключён: порты проектов опубликованы только на `127.0.0.1`                                           |
