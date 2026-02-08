<script lang="ts">
  import { page } from '$app/state';
  import { browser_store } from '$lib/browsers.svelte';
  import * as Card from '$lib/components/ui/card';
  import { blitzbrowser_api_key, websocket_url } from '$lib/api';
  import { onDestroy, onMount } from 'svelte';

  let browser = $derived(
    browser_store.browsers.get(page.params.browser_instance_id || ''),
  );

  let vnc_url = $derived(
    `${websocket_url}browser-instances/${page.params.browser_instance_id}/vnc?apiKey=${blitzbrowser_api_key}`,
  );
  let vnc_connection_status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' =
    $state('DISCONNECTED');

  let rfb: any;
  let rfb_container: HTMLElement;

  onMount(connectVNC);

  async function connectVNC() {
    if (rfb) {
      rfb.disconnect();
    }

    // @ts-ignore
    const { default: RFB } = await import('@novnc/novnc');

    try {
      rfb = new RFB(rfb_container, vnc_url);

      rfb.addEventListener('connect', () => {
        vnc_connection_status = 'CONNECTED';
        rfb.viewOnly = false;
        rfb.scaleViewport = true;
      });

      rfb.addEventListener('disconnect', (e: any) => {
        vnc_connection_status = 'DISCONNECTED';

        if (browser) {
          setTimeout(connectVNC, 250);
        }
      });

      vnc_connection_status = 'CONNECTING';
    } catch (err) {
      console.error('noVNC initialization failed:', err);
    }
  }

  onDestroy(() => {
    if (rfb) {
      rfb.disconnect();
    }
  });
</script>

<svelte:head>
  <title>Live View | BlitzBrowser</title>
</svelte:head>

<Card.Root>
  <Card.Header>
    <Card.Title>
      <div class="flex flex-row items-center gap-3">
        <span class="relative flex size-3">
          {#if vnc_connection_status === 'CONNECTED'}
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
            >
            </span>
            <span class="relative inline-flex size-3 rounded-full bg-green-500">
            </span>
          {:else if vnc_connection_status === 'CONNECTING'}
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75"
            >
            </span>
            <span
              class="relative inline-flex size-3 rounded-full bg-yellow-500"
            >
            </span>
          {:else}
            <span class="relative inline-flex size-3 rounded-full bg-red-500">
            </span>
          {/if}
        </span>
        Live View
      </div>
    </Card.Title>
    <Card.Description>Live view of the browser.</Card.Description>
  </Card.Header>
  <Card.Content>
    <div
      class="relative flex flex-row justify-center aspect-video max-w-full w-full max-h-[75vh] rounded bg-gray-100 dark:bg-neutral-800"
    >
      <div bind:this={rfb_container}></div>
      {#if !browser}
        <div
          class="absolute flex flex-row justify-center items-center w-full h-full"
        >
          <span>Browser closed.</span>
        </div>
      {/if}
    </div>
  </Card.Content>
</Card.Root>
