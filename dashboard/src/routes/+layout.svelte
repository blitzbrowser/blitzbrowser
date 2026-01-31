<script lang="ts">
  import './layout.css';
  import { ModeWatcher } from 'mode-watcher';
  import AppSidebar from '$lib/components/app-sidebar.svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import favicon from '$lib/assets/favicon.ico';
  import { onMount } from 'svelte';
  import { browser_store, type Browser } from '$lib/browsers.svelte';
  import { page } from '$app/state';

  let breadcrumb_items: { title: string; href?: string }[] = $state([]);
  let { children } = $props();

  $effect(() => {
    if (page.url.pathname === '/') {
      breadcrumb_items = [{ title: 'Browsers', href: '/' }];
      return;
    }

    const path = page.url.pathname.split('/');

    console.log(page.url.pathname, path);

    if (path.length === 4 && path[3] === 'live-view') {
      breadcrumb_items = [
        { title: 'Browsers', href: '/' },
        { title: path[2], href: '/' },
        { title: 'Live View' },
      ];
    }
  });

  onMount(() => {
    const websocket = new WebSocket('ws://localhost:9999/browser-instances');

    websocket.onmessage = (event) => {
      browser_store.update(JSON.parse(event.data) as Browser[]);
    };

    fetch('http://localhost:9999/browser-pool').then(async (response) => {
      browser_store.browser_pool = await response.json();
    });
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />

<Sidebar.Provider>
  <AppSidebar />
  <Sidebar.Inset>
    <header
      class="border-b flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
    >
      <div class="flex items-center gap-2 px-4">
        <Sidebar.Trigger class="-ms-1" />
        <Separator
          orientation="vertical"
          class="me-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb.Root>
          <Breadcrumb.List>
            {#each breadcrumb_items as item, index}
              {#if item.href}
                <Breadcrumb.Item class="hidden md:block">
                  <Breadcrumb.Link href={item.href}>
                    {item.title}
                  </Breadcrumb.Link>
                </Breadcrumb.Item>
              {:else}
                <Breadcrumb.Item>
                  <Breadcrumb.Page>{item.title}</Breadcrumb.Page>
                </Breadcrumb.Item>
              {/if}
              {#if index + 1 < breadcrumb_items.length}
                <Breadcrumb.Separator />
              {/if}
            {/each}
          </Breadcrumb.List>
        </Breadcrumb.Root>
      </div>
    </header>
    <div class="flex flex-col gap-4 p-4">
      {@render children()}
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>
