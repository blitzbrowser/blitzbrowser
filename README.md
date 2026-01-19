<div align="center">
  <a href="https://blitzbrowser.com/" align="center">
    <center align="center">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-white.png" width="300">
        <source media="(prefers-color-scheme: light)" srcset="./assets/logo.png" width="300">
        <img src="./assets/logo.svg" alt="BlitzBrowser logo" width="300">
      </picture>
    </center>
  </a>
  
  <h3>Deploy and manage headful browsers in docker. Run your browsers with BlitzBrowser in the cloud or self hosted.</h3>

  <div>
    <img src="https://img.shields.io/github/actions/workflow/status/blitzbrowser/blitzbrowser/cicd.yml?style=flat-square" />
    <img src="https://img.shields.io/github/package-json/v/blitzbrowser/blitzbrowser?style=flat-square" />
  </div>
</div>

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Configuration](#️-configuration)
- [Cloud or self-hosted](#️-cloud-or--self-hosted)
- [Support](#support)

## ✨ Features

- **Parallelism** - Run multiple browsers concurrently.
- **Chrome DevTools Protocol** - Connect directly from Puppeteer, Playwright and any CDP supported frameworks. No custom library needed.
- **User Data Storage** - Save and reuse your browsing sessions easily with S3.
- **Proxy** - Connect your browsers to any HTTP proxy.
- **Queueing** - The CDP connections are queued while the browsers are starting.
- **No DevOps** - Run your browsers without worrying about the infrastructure, zombie process or a script. The container manages everything for you.

## 🚀 Quick Start

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
<summary><b>Docker Compose with Rustfs (User Data Storage)</b></summary>

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

## ⚙️ Configuration

### Environment Variables

- `PORT`: The HTTP port of the web server. The default port is `9999`.
- `MAX_BROWSER_INSTANCES`: The maximum number of browsers the instance can run concurrently. The default value is `99`.
- `S3_ENDPOINT`: The endpoint of the S3 server to use for storage.
- `S3_ACCESS_KEY_ID`: Access key ID to connect to the S3 server.
- `S3_SECRET_ACCESS_KEY`: Secret access key to connect to the S3 server.
- `S3_USER_DATA_BUCKET`: The S3 bucket to store the user data.
- `TAGS`: The tags used to identify the pool of browsers. No tags by default. The tags are in the following format `a=1,b=2,c=3`.

## ☁️ Cloud or 💻 self-hosted

The cloud and self-hosted versions offer the same features.

You should use the self-hosted version if you are looking to host on your own server or to test locally. It works perfectly if you are scaling vertically. 1 server to handle multiple browsers and the S3 storage for user data.

The cloud version allows you to focus on scaling your features while we handle all the infrastructure. You connect to our CDP endpoint and we will handle the scaling, the S3 storage and the proxy. No version management, no infrastructure deployment and priority support.

Our proxy is available as a standalone HTTP proxy. You don't need to use our cloud version to get access to our proxies. It works with the self-hosted version and it is really cheap!

## ❔Support

To get support, you can contact us on [Discord](https://discord.com/invite/qZ3tCZJ2Ze) or at [support@blitzbrowser.com](support@blitzbrowser.com).
