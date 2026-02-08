<script lang="ts">
  import "../layout.css";
  import { ModeWatcher } from "mode-watcher";
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import favicon from "$lib/assets/favicon.ico";
  import { onMount } from "svelte";
  import { browser_store } from "$lib/browsers.svelte";
  import Breadcrumbs from "$lib/components/breadcrumbs.svelte";

  let { children } = $props();

  onMount(() => {
    browser_store.connect();
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
        <Breadcrumbs />
      </div>
    </header>
    <div class="flex flex-col gap-4 p-4">
      {@render children()}
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>
