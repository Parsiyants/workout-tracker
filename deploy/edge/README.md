# Общий входной nginx (`/root/edge`)

Один nginx на весь VPS: принимает 80/443 и по домену разводит запросы по проектам.
Живёт отдельно от проектов — в `/root/edge`, а не внутри `abm_app` или `workout-tracker`.

```
интернет ──► edge_nginx (host network, 80/443)
                ├── abm-order.ru / api.abm-order.ru       → 127.0.0.1:3005 / :8000   (abm_app)
                └── workout-tracker.abm-order.ru (+ api., storage.) → 127.0.0.1:8080 / :8081 / :8082 (tracker)
```

Контейнер работает с `network_mode: host`, поэтому обращается к проектам по `127.0.0.1:<порт>`.
Проектам не нужны общие docker-сети, а их порты опубликованы только на loopback
(`127.0.0.1:8080:80` и т.п.) — снаружи они закрыты.

## Состав

```
/root/edge
├── docker-compose.yml
├── conf.d/
│   ├── abm.conf               # abm-order.ru, www, api.
│   └── workout-tracker.conf   # workout-tracker., api., storage.
├── certbot/www/                # сюда certbot кладёт challenge-файлы
└── logs/
```

---

## Шаг 1. Узнать, кто сейчас держит 80/443 и где сертификаты

```bash
ss -ltnp | grep -E ':(80|443) '
docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E ':(80|443)->'

ls -la /etc/letsencrypt/live/
# проверяем, какие домены покрыты сертификатом:
openssl x509 -in /etc/letsencrypt/live/abm-order.ru/fullchain.pem -noout -text \
  | grep -A1 "Subject Alternative Name"
```

Если `live` содержит другое имя (например `www.abm-order.ru`) — поправьте пути
`ssl_certificate` / `ssl_certificate_key` в `conf.d/abm.conf` и `conf.d/workout-tracker.conf`.

> Wildcard `*.abm-order.ru` покрывает `workout-tracker.abm-order.ru`,
> но **не** покрывает `api.workout-tracker...` и `storage.workout-tracker...`
> (wildcard — только один уровень). Если их нет в SAN — см. «Сертификаты» ниже.

## Шаг 2. Разложить edge на сервере

```bash
mkdir -p /root/edge/certbot/www /root/edge/logs
cp -r /root/workout-tracker/deploy/edge/conf.d /root/edge/
cp /root/workout-tracker/deploy/edge/docker-compose.yml /root/edge/
```

## Шаг 3. Проверить конфиг, НЕ останавливая старый nginx

```bash
docker run --rm \
  -v /root/edge/conf.d:/etc/nginx/conf.d:ro \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  nginx:alpine nginx -t
```

Должно быть `syntax is ok` / `test is successful`. Если ругается на `default_server`
(дубль) — уберите `default_server` из нашего `abm.conf`, оставив его только в одном месте.

## Шаг 4. Переключение (простой 2–10 секунд)

```bash
# 1) остановить старый вход
docker ps --format '{{.Names}}' | grep -i nginx        # найти имя
docker stop <имя_старого_nginx>                        # или: systemctl stop nginx

# 2) поднять edge
cd /root/edge && docker compose up -d

# 3) посмотреть, что nginx поднялся без ошибок
docker logs --tail=20 edge_nginx
```

## Шаг 5. Проверить оба проекта

```bash
curl -I https://abm-order.ru
curl -I https://api.abm-order.ru
curl -I https://workout-tracker.abm-order.ru
curl -s https://workout-tracker.abm-order.ru/api/health
curl -I https://storage.workout-tracker.abm-order.ru/
```

## Откат (если что-то не так)

```bash
cd /root/edge && docker compose down
docker start <имя_старого_nginx>     # или: systemctl start nginx
```

Старый проект не изменён — он просто снова занимает 80/443.

## Шаг 6. Закрепить результат

- Убрать старый nginx из автозапуска: `docker update --restart=no <имя_старого_nginx>`
  (или `systemctl disable --now nginx`, если он системный).
- В compose `abm_app` оставить порты `8000`/`3005`, но лучше ограничить их loopback:

  ```yaml
  ports:
    - "127.0.0.1:8000:8000"
    - "127.0.0.1:3005:3005"
  ```

- Добавить шпаргалку: `docker compose -f /root/edge/docker-compose.yml up -d` после ребута
  (или `restart: unless-stopped` уже в compose — тогда сам поднимется).

---

## Сертификаты

**Если все пять доменов уже в сертификате** — ничего не делать, всё заработает.

**Если нет (wildcard не покрывает api./storage.)** — расширить существующий сертификат
через webroot (nginx при этом можно не останавливать):

```bash
certbot certonly --webroot -w /root/edge/certbot/www --expand \
  -d abm-order.ru -d www.abm-order.ru -d api.abm-order.ru \
  -d workout-tracker.abm-order.ru \
  -d api.workout-tracker.abm-order.ru \
  -d storage.workout-tracker.abm-order.ru
docker exec edge_nginx nginx -s reload
```

> Prefix `api.workout-tracker.abm-order.ru` — это отдельный поддомен третьего уровня,
> для него нужен либо SAN в сертификате (команда выше), либо отдельный сертификат
> и свой `ssl_certificate` в блоке.

**Автопродление** (challenge уже отдаётся из `/var/www/certbot`):

```bash
crontab -e
# 0 3 * * * certbot renew --webroot -w /root/edge/certbot/www --deploy-hook "docker exec edge_nginx nginx -s reload"
```

---

## Как добавить третий проект

1. Публикуете его порты на loopback: `ports: ["127.0.0.1:8090:80"]`.
2. Кладёте `conf.d/newproject.conf` с `server_name` и `proxy_pass http://127.0.0.1:8090;`.
3. `docker exec edge_nginx nginx -t && docker exec edge_nginx nginx -s reload`.

Ничего в других проектах при этом не меняется.
