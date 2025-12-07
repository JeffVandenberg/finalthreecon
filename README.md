# Final Three Con Tools

## Overview
This repository contains small PHP scripts that pull data from Tabletop.Events (TTE), store them in MySQL, and render a few operational reports.

This document explains the centralized configuration and bootstrap layer to make maintenance easier and safer.

### Configuration model (precedence)
Values are resolved with strict precedence:
1) Environment variables (highest priority)
2) config/secrets.php (for sensitive values; not committed)
3) config/app.php (non-secret defaults)

### Files
- config/app.php: Non-secret defaults (app name, base URL, timezone, env, DB default DSN/user/password, feature flags).
- config/secrets.php: Secrets (DB user/password, optional DSN override, TTE API credentials). Not committed.
- config/secrets.example.php: Example template to copy to config/secrets.php for local/dev setup.
- core/bootstrap.php: Bootstrap for every entry point. Loads Composer autoloader, utils.php, app config and secrets; exposes helpers; applies timezone and error display.
- utils.php: Small utilities (e.g., e() for safe HTML escaping).
- db_connect.php: Centralized PDO connection using the new config()/secret() helpers.

### Helpers
- config($key, $default = null)
  - Dot notation: e.g., config('db.default_dsn')
  - Precedence: ENV > secrets.php > app.php
  - Common ENV mappings used internally: DB_DSN, DB_USER, DB_PASSWORD, APP_TZ, APP_ENV, APP_BASE_URL

- secret($key, $default = null)
  - Dot notation: e.g., secret('tte.api_key')
  - Precedence: ENV > secrets.php > default
  - Common ENV mappings: DB_USER, DB_PASSWORD, DB_DSN, TTE_CONVENTION_ID, TTE_API_KEY, TTE_API_USER, TTE_API_PASSWORD

### Bootstrap usage in scripts
Every script should start with:

```php
require_once __DIR__ . '/core/bootstrap.php';
```

Then use the centralized DB connector when a PDO instance is needed:

```php
$pdo = require_once __DIR__ . '/db_connect.php';
```

## Setting up locally
1) Install dependencies
- composer install

2) Copy the secrets example and fill in values
- Copy config/secrets.example.php to config/secrets.php
- Fill in DB user/password and (optionally) TTE credentials

3) Configure environment (optional but recommended)
- Set DB_DSN, DB_USER, DB_PASSWORD in your environment for per-machine overrides
- APP_ENV can be set to dev/staging/prod to control error display
- APP_TZ can set the default timezone

4) Verify connectivity
- Run `php -l` on the repo root files or simply open database_panel.php and badge_transfers.php locally
- Ensure your DB credentials are available via ENV or config/secrets.php

Security & maintainability
- Do not commit config/secrets.php. It is ignored by .gitignore.
- Use e($value) when rendering dynamic content into HTML.
- Prefer prepared statements for any DB inserts/updates.

Adoption progress
- The following entry points have been updated to require the bootstrap: badge_transfers.php, database_panel.php, import_event_types.php, import_events.php, import_rooms.php, import_spaces.php, import_dayparts.php, import_badge_types.php, index.php.

Future improvements (suggested)
- Optional .env support (vlucas/phpdotenv) to load ENV from a file in development
- Introduce a tiny logger for imports (Monolog)
- Add a base layout/template for report pages
- Basic CI to lint and smoke-test critical scripts

# Other Notes

Some datasets are not fully automated for refreshing. This was done because the data is fundamental to each individual convention and is generally a one time operation to setup as fixture data. 

The list includes:
- eventtypes
- room
- spaces
- dayparts

Sample API Call Sequence to get static JSON for certain datasets
- Create Session 
```shell
curl -X POST -F username="jeffvandenberg" -F password='<your_password>' -F api_key_id="<your_api_key>"  https://tabletop.events/api/session
```

- Parse Response for Session ID
```json
{
   "result" : {
      "object_type" : "session",
      "object_name" : "Session",
      "id" : "D9867910-D3AF-11F0-AC04-E2C24397CDBC",
      "user_id" : "E02426D6-337D-11EC-A13B-BC4900B6F5E5"
   }
}
```

- Call the appropriate end point
```shell
curl -X GET -F _items_per_page=100 "https://tabletop.events/api/convention/<convention_id>/rooms?session_id=<session_id>" > room.json
```

Sample files can be found in `/static/2025/`

Deployment
- Simple deployment via SFTP to the Final Three Con Server
- Automatic upload via PHPStorm is your friend
- Emily can provide credentials
- There is no particular testing framework in place
