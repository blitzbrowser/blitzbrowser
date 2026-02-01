<div align="center">
  <a href="https://docs.blitzbrowser.com/" align="center">
    <center align="center">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-white.png" width="300">
        <source media="(prefers-color-scheme: light)" srcset="./assets/logo.png" width="300">
        <img src="./assets/logo.svg" alt="BlitzBrowser logo" width="300">
      </picture>
    </center>
  </a>
  
  <h3>Deploy and manage headful browsers in docker.</h3>
  
  <a href="https://docs.blitzbrowser.com/">https://docs.blitzbrowser.com</a>

  <div>
    <img src="https://img.shields.io/github/actions/workflow/status/blitzbrowser/blitzbrowser/cicd.yml?style=flat-square" />
    <img src="https://img.shields.io/github/v/tag/blitzbrowser/blitzbrowser?style=flat-square" />
  </div>
</div>

---

<div align="center">
  <video height="300px" src="./assets/live-view.mp4"></video>
</div>

<br />

Managing browsers can be a recipe for memory leaks, zombie processes and devops issues. BlitzBrowser handles all the hard work of deploying and scaling the browsers, so you can focus on your code.

Connect to headful browsers from Puppeteer, Playwright and any CDP frameworks. Persist your user data with S3 and connect to HTTP proxies.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Support](#support)

## Features

- **Parallelism** - Spin up and run multiple browsers concurrently.
- **Chrome DevTools Protocol** - No proprietary SDK. Connect directly from Puppeteer, Playwright or any CDP supported framework.
- **Headful** - Run the browsers with a GUI to bypass bot detection and to render exactly as a user would see.
- **Persistent Sessions** - Persist your browser user data with S3.
- **Proxy Support** - Connect your browsers to any HTTP proxies.
- **Queueing** - CDP connections are automatically queued while the browser are starting.
- **No DevOps** - Run your browsers without worrying about the infrastructure, zombie process or a custom script. The container manages everything for you.

## Quick Start

Start in seconds with docker and then connect your code.

### Docker

```bash
docker run -p=9999:9999 --shm-size=2g ghcr.io/blitzbrowser/blitzbrowser:latest
```

<details>
<summary><b>Docker Compose</b></summary>

```yaml
services:
  blitzbrowser:
    image: ghcr.io/blitzbrowser/blitzbrowser:latest
    ports:
      - "9999:9999"
    shm_size: "2gb"
    restart: always
```

</details>

<details>
<summary><b>Docker Compose with S3 (Rustfs) for user data storage</b></summary>

Before using user data storage with BlitzBrowser. You need to create the bucket `user-data` in Rustfs [http://localhost:9001](http://localhost:9001).

```yaml
services:
  blitzbrowser:
    image: ghcr.io/blitzbrowser/blitzbrowser:latest
    ports:
      - "9999:9999"
    environment:
      S3_ENDPOINT: http://s3:9000
      S3_ACCESS_KEY_ID: rustfsadmin
      S3_SECRET_ACCESS_KEY: rustfsadmin
      S3_USER_DATA_BUCKET: user-data
    shm_size: "2gb"
    restart: always
  s3:
    image: rustfs/rustfs
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      RUSTFS_VOLUMES: /data
      RUSTFS_ADDRESS: :9000
      RUSTFS_ACCESS_KEY: rustfsadmin
      RUSTFS_SECRET_KEY: rustfsadmin
      RUSTFS_CONSOLE_ENABLE: true
    restart: always
    volumes:
      - s3_data:/data
  # RustFS volume permissions fixer service
  volume-permission-helper:
    image: alpine
    volumes:
      - s3_data:/data
    command: >
      sh -c "
        chown -R 10001:10001 /data &&
        echo 'Volume Permissions fixed' &&
        exit 0
      "
    restart: "no"
volumes:
  s3_data:
```

</details>

### Connect your code

<details open>
<summary><b>Puppeteer</b></summary>

```typescript
import puppeteer from 'puppeteer';

const browser = await puppeteer.connect({
    browserWSEndpoint: `ws://localhost:9999`
});

const context = await browser.createBrowserContext();
const page = await context.newPage();

// ...

await browser.close();
```

</details>

<details>
<summary><b>Playwright + NodeJS</b></summary>

```typescript
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(`ws://localhost:9999`);

const context = await browser.newContext();
const page = await context.newPage();

// ...

await browser.close();
```

</details>

## Configuration

The developer documentation is available at [https://docs.blitzbrowser.com](https://docs.blitzbrowser.com).

### Quick Links

- [Getting Started](https://docs.blitzbrowser.com/self-hosted/getting-started)
- [Persist the user data with S3](https://docs.blitzbrowser.com/self-hosted/user-data-storage)
- [Configure your browser session](https://docs.blitzbrowser.com/self-hosted/chrome-devtools-protocol)

## Support

To get support, you can contact us on [Discord](https://discord.com/invite/qZ3tCZJ2Ze) or at [support@blitzbrowser.com](support@blitzbrowser.com).
