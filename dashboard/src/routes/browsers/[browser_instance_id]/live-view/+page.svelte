<script lang="ts">
  import { page } from '$app/stores';
  import * as Card from '$lib/components/ui/card';
  import { onMount, onDestroy } from 'svelte';

  $: vnc_url = `ws://localhost:9999/browser-instances/${$page.params.browser_instance_id}/vnc`;

  let canvasContainer: HTMLElement;
  let rfb: any;
  let status = 'Connecting...';

  onMount(async () => {
    // @ts-ignore
    const { default: RFB } = await import('@novnc/novnc');

    try {
      rfb = new RFB(canvasContainer, vnc_url);

      // Add event listeners for feedback
      rfb.addEventListener('connect', () => {
        status = 'Connected';
        rfb.viewOnly = false; // Set to true if you want read-only
        rfb.scaleViewport = true; // Auto-scale to fit container
      });

      rfb.addEventListener('disconnect', (e: any) => {
        status = e.detail.clean ? 'Disconnected' : 'Connection Error';
      });
    } catch (err) {
      console.error('noVNC initialization failed:', err);
      status = 'Failed to initialize';
    }
  });

  onDestroy(() => {
    if (rfb) {
      rfb.disconnect();
    }
  });
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>
      <div class="flex flex-row items-center gap-3">
        <span class="relative flex size-3">
          <span
            class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
          >
          </span>
          <span class="relative inline-flex size-3 rounded-full bg-green-500">
          </span>
        </span>
        Live View
      </div>
    </Card.Title>
    <Card.Description>Click, type and scroll directly in the browser.</Card.Description
    >
  </Card.Header>
  <Card.Content>
    <div class="vnc-wrapper rounded">
      <div bind:this={canvasContainer} class=" rounded overflow-hidden"></div>
    </div>
  </Card.Content>
</Card.Root>

<style>
  .vnc-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 75vh;
  }
</style>
