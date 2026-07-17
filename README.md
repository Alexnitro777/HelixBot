HelixBot
--------
Современный модульный Discord-бот на TypeScript с поддержкой мультисерверности, динамической регистрации слэш-команд и интеграцией СУБД MariaDB через Drizzle ORM.

1. Структура проекта
```text
HelixBot/
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── config/
    │   └── config.ts
    ├── core/
    │   ├── client.ts
    │   └── types.ts
    ├── db/
    │   ├── index.ts
    │   └── schema.ts
    ├── logger/
    │   └── index.ts
    └── modules/
        └── embed/
            ├── index.ts
            ├── registry.ts
            ├── types.ts
            └── embeds/
                └── info.ts
```

2. Быстрый старт с Docker

2.1 Предварительные требования
* Установленный Docker и плагин Docker Compose.
* Запущенный на хост-системе сервер MariaDB/MySQL.
* Discord Bot Token и Client ID (из панели Discord Developer Portal).

2.2 Установка и запуск
1. Скопируйте файл конфигурации окружения:
   cp .env.example .env

2. Заполните переменные в созданном файле `.env`:
   * `DISCORD_TOKEN` — Токен доступа вашего бота.
   * `DISCORD_CLIENT_ID` — ID приложения (Client ID) вашего бота.
   * `DB_HOST` — 127.0.0.1 (IP базы данных на хосте).
   * `DB_PORT` — 3306.
   * `DB_USER` / `DB_PASSWORD` — Данные вашей учетной записи СУБД.
   * `DB_NAME` — Имя созданной базы данных (таблицы бот создаст сам).
   * `LOG_LEVEL` — Уровень логирования (например, info или debug).

3. Запустите сборку и старт контейнера в фоновом режиме:
   docker compose up -d --build

3. Управление контейнером

* Просмотр логов работы бота в реальном времени:
  docker logs -f helixbot

* Перезапуск контейнера с ботом:
  docker restart helixbot

* Остановка бота и удаление контейнера:
  docker compose down
