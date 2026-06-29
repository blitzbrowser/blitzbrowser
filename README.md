> [!IMPORTANT]
> I'm not maintaining this project anymore. Web automation require too much time to maintain, it is a cat and mouse game. I will keep the project online because I think some features are interesting to learn from.

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

Managing browsers can be a recipe for memory leaks, zombie processes and devops issues. BlitzBrowser handles all the hard work of deploying and scaling the browsers, so you can focus on your code.

Connect to headful browsers from Puppeteer, Playwright and any CDP frameworks. Persist your user data with S3 and connect to HTTP proxies.

<video src="https://github.com/user-attachments/assets/b4294d66-a202-4345-990c-58b3574f4f61"></video>

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Changlog](#changelog)
- [F.A.Q.](#faq)
- [Support](#support)

## Features

- [**Live View**](https://docs.blitzbrowser.com/features/live-view) - Watch and interact directly with any browser currently running.
- [**Persistent Sessions**](https://docs.blitzbrowser.com/features/user-data-storage) - Persist your browser user data.
- [**Proxy Support**](https://docs.blitzbrowser.com/features/http-proxy) - Connect your browsers to any HTTP proxies.
- [**Security**](https://docs.blitzbrowser.com/features/security) - Control who can access the browsers.
- [**Chrome DevTools Protocol**](https://docs.blitzbrowser.com/configurations/chrome-devtools-protocol) - No proprietary SDK. Connect directly from Puppeteer, Playwright or any CDP supported framework.
- [**Google Chrome Versions**](https://docs.blitzbrowser.com/features/google-chrome-versions) - Run any google chrome version from 116 to the latest one.
- **Parallelism** - Spin up and run multiple browsers concurrently.
- **Headful** - Run the browsers with a GUI to render exactly as a user would see.
- **Queueing** - CDP connections are automatically queued while the browsers are starting.
- **No DevOps** - Run your browsers without worrying about the infrastructure, zombie processes or a custom script. The container manages everything for you.

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

- [Getting Started](https://docs.blitzbrowser.com/getting-started)
- [Persist the user data with S3](https://docs.blitzbrowser.com/features/user-data-storage)
- [Run any Google Chrome version](https://docs.blitzbrowser.com/features/google-chrome-versions)
- [Configure your browser](https://docs.blitzbrowser.com/features/chrome-devtools-protocol)

## Changelog

### 1.6.0

March 3, 2026

- Dashboard doesn't require HTTPS to authenticate if environment variable `HTTPS_DISABLED=true` is configured.

### 1.5.0

February 28, 2026

- Support running any [Google Chrome version](https://docs.blitzbrowser.com/features/google-chrome-versions) since 116.

### 1.4.0

February 15, 2026

- Browser user data can now be stored on local disk or with an S3 provider. All details [here](https://docs.blitzbrowser.com/features/user-data-storage).

### 1.3.0

February 14, 2026

- BlitzBrowser and the dashboard now support [authentication](https://docs.blitzbrowser.com/features/security).

### 1.2.0

February 1, 2026

- Added [Live View](/features/live-view) and the [dashboard](https://docs.blitzbrowser.com/features/dashboard).

### 1.1.4

January 15, 2026

- Released the open source version of BlitzBrowser.com(Cloud version, now closed).

## FAQ

### BlitzBrowser vs. Puppeteer/Playwright

Puppeteer and Playwright are libraries that give you control of a browser. With them you can:

- Take a screenshot of a web page.
- Automate tasks on websites like clicking, scrolling and typing.
- Extract data from a website.

They do not handle the infrastructure or cleanup. If you run them directly in your application code, you are responsible for:

- Killing zombie processes that don't always close properly.
- Managing multiple browsers concurrently.
- Handling dependencies to run Google Chrome.
- Persisting browser user data.
- Authenticate and route traffic to HTTP proxies.
- Secure the access to the browser.

BlitzBrowser is a browser-as-a-service software. Your code stays focused on your project needs and the heavy lifting of managing the browsers happens inside the BlitzBrowser container.

### Can I use my Puppeteer/Playwright code?

Yes. BlitzBrowser isn't a library like Puppeteer and Playwright. BlitzBrowser is deployed as a docker container to run your browsers. To control a browser, you still need Puppeteer and Playwright. You will only need 1 line of code changed to use BlitzBrowser instead of running the browsers yourself.

<details open>
<summary><b>Puppeteer</b></summary>

```typescript
import puppeteer from 'puppeteer';

// Change the launch() method to connect({ ... })

// const browser = await puppeteer.launch();

const browser = await puppeteer.connect({ browserWSEndpoint: `ws://localhost:9999` });

const context = await browser.createBrowserContext();
const page = await context.newPage();

// ...

await browser.close();
```

</details>

<details>
<summary><b>Playwright</b></summary>

```typescript
import { chromium } from 'playwright';

// Change the launch() method to connect({ ... })

// const browser = await chromium.launch();

const browser = await chromium.connectOverCDP(`ws://localhost:9999`);

const context = await browser.newContext();
const page = await context.newPage();

// ...

await browser.close();
```

</details>

### Does it only work with Puppeteer/Playwright on NodeJS?

No. BlitzBrowser is language and framework agnostic. It works with any framework using the Chrome DevTools Protocol (CDP). If your browser automation tool/framework can connect to a browser through CDP, you can use BlitzBrowser.

<details>
<summary><b>Playwright + Python</b></summary>

```python
import asyncio
import os

from playwright.async_api import async_playwright

async def main():
    playwright = await async_playwright().start()

    browser = await playwright.chromium.connect_over_cdp("ws://localhost:9999")
    context = await browser.new_context()
    page = await context.new_page()

    # ...

    await browser.close()
    await playwright.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

</details>

<details>
<summary><b>Playwright + Java</b></summary>

```java
package com.example.demo;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;

public class PlaywrightJavaExample {

    public static void main(String[] args) {
        try (Playwright playwright = Playwright.create();
             Browser browser = playwright.chromium().connectOverCDP("ws://localhost:9999")
        ) {
            BrowserContext context = browser.newContext();
            Page page = context.newPage();

            // ...
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

}
```

</details>

### Does BlitzBrowser help with Bot Detection?

Yes. BlitzBrowser runs the browsers in headful mode within a virtual display. The browsers appear more like a real user to websites compared to headless mode, which carries signals that anti bot services, like Cloudflare or Akamai, can detect.

It doesn't mean BlitzBrowser will bypass all the anti bot mechanisms. You still need to implement different strategies like residential IPs, captcha solving and human-like behaviour.

## Support

To get support, you can contact us on [Discord](https://discord.com/invite/qZ3tCZJ2Ze) or at [support@blitzbrowser.com](support@blitzbrowser.com).
