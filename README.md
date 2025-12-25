# luci-podkop-subscribe

![luci-podkop-subscribe](img.png)

Расширение LuCI для Podkop, добавляющее функциональность Subscribe URL для получения и управления конфигурациями прокси VLESS.

## Описание

Этот плагин расширяет интерфейс LuCI Podkop функцией Subscribe, которая позволяет пользователям:

- Вводить Subscribe URL, содержащий конфигурации VLESS в формате base64
- Получать конфигурации из Subscribe URL одним нажатием кнопки
- Просматривать доступные конфигурации в удобном списке
- Выбирать и применять конфигурации к настройкам прокси или напрямую к Xray
- Автоматически сохранять и восстанавливать Subscribe URL при перезагрузке страницы

## Возможности

### Режим "Connection URL"
- **Поле Subscribe URL**: Поле ввода для ввода ссылок подписки
- **Получить конфигурации**: Кнопка для получения и парсинга конфигураций VLESS
- **Список конфигураций**: Отображает доступные конфигурации с их названиями
- **Выбор одним кликом**: Клик по конфигурации применяет её к настройкам прокси Podkop
- **Автосохранение**: Subscribe URL автоматически сохраняется и восстанавливается
- **Умная видимость**: Список конфигураций появляется только когда Тип подключения установлен в "Proxy" и Тип конфигурации в "Connection URL"

### Режим "Outbound Config" (NEW!)
- **Поле Subscribe URL**: Поле ввода для Subscribe URL (такое же, как в режиме Connection URL)
- **Получить конфигурации**: Кнопка для получения списка конфигураций VLESS
- **Список конфигураций**: Отображает доступные конфигурации
- **Прямое применение к Xray**: Клик по конфигурации:
  - Парсит VLESS URL и преобразует в конфигурацию Xray
  - Создает/обновляет файл `/etc/xray/config.json`
  - Автоматически перезапускает службу Xray
- **Поддержка всех параметров VLESS**: 
  - Поддержка типов сети: `tcp`, `ws`, `xhttp` и других
  - Поддержка безопасности: `tls`, `reality`
  - Поддержка параметров REALITY: `serverName`, `fingerprint`, `publicKey`, `shortId`, `spiderX`
  - Поддержка xhttpSettings: `host`, `path`, `mode`
  - Поддержка WebSocket: `path`, `host`

## Требования

- OpenWrt 24.x или новее
- luci-app-podkop (Podkop должен быть установлен)
- wget
- base64 (обычно включен в BusyBox)
- xray (требуется для режима "Outbound Config") - устанавливается автоматически при установке Podkop или отдельно

## Протестировано на

- **Podkop**: v0.7.9 - v0.7.10
- **LuCI App**: v0.7.9 - v0.7.10
- **OpenWrt**: 24.10.4

## Установка

### Быстрая установка

```bash
sh <(wget -O - https://raw.githubusercontent.com/mr-Abdrahimov/luci-podkop-subscribe/main/install.sh)
```

## Как это работает

### Режим "Connection URL"
1. Пользователь вводит Subscribe URL в поле "Subscribe URL"
2. Нажимает кнопку "Получить"
3. Плагин получает содержимое URL (ожидается данные в формате base64)
4. Декодирует данные base64 и парсит URL VLESS
5. Отображает конфигурации в списке ниже поля Subscribe URL
6. Пользователь кликает по конфигурации для применения её к настройкам прокси Podkop
7. Subscribe URL автоматически сохраняется для будущего использования

### Режим "Outbound Config"
1. Пользователь выбирает "Outbound Config" в поле "Configuration Type"
2. Вводит Subscribe URL в поле "Subscribe URL"
3. Нажимает кнопку "Получить"
4. Плагин получает и парсит конфигурации VLESS (как в режиме Connection URL)
5. Отображает список конфигураций
6. При клике на конфигурацию:
   - Парсится VLESS URL и извлекаются все параметры (uuid, host, port, security, network и т.д.)
   - Генерируется полная конфигурация Xray в формате JSON
   - Сохраняется в `/etc/xray/config.json` со следующей структурой:
     - `log`: настройки логирования
     - `inbounds`: SOCKS прокси на порту 10808
     - `outbounds`: конфигурация VLESS из выбранной ссылки, плюс `direct` и `block` outbounds
     - `routing`: правила маршрутизации для направления трафика через прокси
   - Автоматически перезапускается служба Xray командой `/etc/init.d/xray restart`
7. Subscribe URL автоматически сохраняется для будущего использования

## Технические детали

- **Frontend**: JavaScript расширение для представления секции Podkop
- **Backend**: Три CGI скрипта:
  - `/cgi-bin/podkop-subscribe`: Получает и парсит данные подписки из Subscribe URL
  - `/cgi-bin/podkop-subscribe-url`: Управляет хранением Subscribe URL
  - `/cgi-bin/podkop-xray-config`: Парсит VLESS URL и генерирует конфигурацию Xray (для режима Outbound Config)
- **Хранилище**: Subscribe URL сохраняется в `/tmp/podkop_subscribe_url.txt`
- **Конфигурация Xray**: Сохраняется в `/etc/xray/config.json` при использовании режима Outbound Config

### Поддерживаемые параметры VLESS URL

Скрипт `podkop-xray-config` поддерживает следующие параметры из VLESS URL:

- **type**: Тип сети (`tcp`, `ws`, `xhttp`, и другие)
- **security**: Тип безопасности (`none`, `tls`, `reality`)
- **sni**: Server Name Indication (для TLS/REALITY)
- **fp**: Fingerprint (для TLS/REALITY)
- **pbk**: Public Key (для REALITY)
- **sid**: Short ID (для REALITY)
- **spx**: SpiderX (для REALITY)
- **flow**: Flow control (для VLESS)
- **path**: Путь (для WebSocket или xhttp)
- **host**: Хост (для WebSocket или xhttp)
- **mode**: Режим (для xhttp)

### Формат конфигурации Xray

При использовании режима "Outbound Config" создается конфигурация следующего формата:

```json
{
  "log": { "loglevel": "warning" },
  "inbounds": [
    {
      "tag": "socks-local",
      "port": 10808,
      "listen": "127.0.0.1",
      "protocol": "socks",
      "settings": { "udp": true },
      "sniffing": {
        "enabled": true,
        "destOverride": ["tls", "http", "quic"]
      }
    }
  ],
  "outbounds": [
    {
      "tag": "proxy",
      "protocol": "vless",
      "settings": { ... },
      "streamSettings": { ... }
    },
    { "tag": "direct", "protocol": "freedom", "settings": {} },
    { "tag": "block", "protocol": "blackhole", "settings": { "response": { "type": "none" } } }
  ],
  "routing": {
    "rules": [
      {
        "type": "field",
        "inboundTag": ["socks-local"],
        "outboundTag": "proxy"
      }
    ]
  }
}
```

## Важные примечания

- Этот плагин модифицирует файл `section.js` Podkop
- Повторная установка плагина полностью заменит модифицированный файл
- Podkop и его зависимости **никогда** не удаляются при удалении плагина
- При использовании режима "Outbound Config" файл `/etc/xray/config.json` будет перезаписан при выборе новой конфигурации
- Убедитесь, что служба Xray установлена и работает перед использованием режима "Outbound Config"
- Для режима "Outbound Config" требуется правильная настройка прав доступа к файлу `/etc/xray/config.json`

## Лицензия

GPL-2.0

## Репозиторий

https://github.com/mr-Abdrahimov/luci-podkop-subscribe

## Автор

mr-Abdrahimov
