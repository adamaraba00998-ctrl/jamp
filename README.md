# Frog Jump

Комикс-игра для GitHub Pages и Telegram Mini App. Прыгай вверх, стреляй сюрикенами, убивай мобов, побеждай боссов — 10 этапов.

## Управление
- Телефон: left/right — касание левой/правой половины экрана, кнопка ★ — сюрикен (автонаведение на ближайшего врага).
- ПК: ← → или A D, пробел — выстрел.

## Структура
index.html · css/style.css · js/game.js · js/config.js · .nojekyll

## Как выложить на GitHub Pages
1. Зайди на github.com → **New repository**, назови его, например, `frog-jump`, выбери **Public**, нажми **Create repository**.
2. Распакуй ZIP на компьютере. Внутри папки `frog-jump` должны лежать `index.html`, папки `css` и `js`.
3. В репозитории нажми **uploading an existing file** (или **Add file → Upload files**).
4. Перетащи ВСЁ содержимое распакованной папки (файлы и папки `css`, `js`, а также `.nojekyll`). `index.html` должен лежать в корне репозитория.
5. Нажми **Commit changes**.
6. Открой **Settings → Pages**. В разделе *Build and deployment* выбери Source: **Deploy from a branch**, Branch: **main**, папка **/(root)**, нажми **Save**.
7. Через 1–2 минуты ссылка появится на этой же странице: `https://ТВОЙ_НИК.github.io/frog-jump/`. Это и есть ссылка на игру.

## Общий ТОП-100 для друзей (бесплатно)
1. https://console.firebase.google.com/ → создай проект.
2. **Build → Realtime Database → Create Database**, режим **Test Mode**.
3. Скопируй URL базы (`https://...firebaseio.com`).
4. Открой `js/config.js`, вставь его в `FIREBASE_DB_URL`, загрузи файл на GitHub заново (Add file → Upload files, заменив старый).

## Telegram Mini App
В @BotFather: `/newapp` (или `/setmenubutton`) → укажи ссылку GitHub Pages.
