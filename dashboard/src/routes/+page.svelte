<script lang="ts">
  import { browser_store } from '$lib/browsers.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import * as Card from '$lib/components/ui/card';
</script>

      <h1 class="font-extrabold text-4xl">Browsers</h1>
      {#if browser_store.browsers.length === 0}
        <Card.Root>
          <Card.Content>
            <span>
              No browser running. <a
                class="text-yellow-400 underline"
                href="https://docs.blitzbrowser.com/self-hosted/getting-started#connect-your-code"
                target="_blank">Connect your code to start running</a
              >.
            </span>
          </Card.Content>
        </Card.Root>
      {/if}
      {#each browser_store.browsers as browser}
        <Card.Root>
          <Card.Content class="flex flex-row justify-between items-center">
            <div class="flex flex-row items-center gap-4">
              <span class="relative flex size-3">
                <span
                  class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
                >
                </span>
                <span
                  class="relative inline-flex size-3 rounded-full bg-green-500"
                >
                </span>
              </span>
              {browser.id}
            </div>
            <div>
              <a href={`/browsers/${browser.id}/live-view`}>
                <Button class="cursor-pointer" size="sm">Live View</Button>
              </a>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
