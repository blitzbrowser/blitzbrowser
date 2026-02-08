<script lang="ts">
  import { browser_store } from '$lib/browsers.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import Video from '@lucide/svelte/icons/video';
  import * as Card from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { DateTime } from 'luxon';
  
  export const ssr = false;
</script>

<svelte:head>
  <title>Headful Browsers | BlitzBrowser</title>
</svelte:head>

<Card.Root>
  <Card.Header>
    <Card.Title class="text-2xl">Browsers</Card.Title>
    <Card.Description>Running browsers and available slots</Card.Description>
  </Card.Header>
  <Card.Content>
    <Table.Root class="border">
      <Table.Header>
        <Table.Row>
          <Table.Head class="w-36">Status</Table.Head>
          <Table.Head>Id</Table.Head>
          <Table.Head class="w-36">Duration</Table.Head>
          <Table.Head class="text-end">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each browser_store.browsers.values() as browser (browser.id)}
          <Table.Row>
            <Table.Cell>
              <div class="flex flex-row items-center gap-2">
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
                Running
              </div>
            </Table.Cell>
            <Table.Cell>{browser.id}</Table.Cell>
            <Table.Cell>
              {browser.connected_at
                ? DateTime.now()
                    .diff(DateTime.fromISO(browser.connected_at))
                    .toFormat('hh:mm:ss')
                : '-'}
            </Table.Cell>
            <Table.Cell class="text-end">
              {#if browser.vnc_enabled}
                <a href={`/browsers/${browser.id}/live-view`}>
                  <Button variant="outline" class="cursor-pointer" size="sm">
                    <Video />
                    Live View
                  </Button>
                </a>
              {:else}
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Button disabled variant="outline" size="sm">
                        <Video />
                        Live View
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p>Live view not enabled.</p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              {/if}
            </Table.Cell>
          </Table.Row>
        {/each}
        {#each { length: (browser_store.browser_pool?.max_browser_instances || 0) - browser_store.browsers.size } as _, i}
          <Table.Row>
            <Table.Cell>
              <div class="flex flex-row items-center gap-2">
                <span class="relative flex size-3">
                  <span
                    class="absolute inline-flex h-full w-full animate-ping rounded-full bg-neutral-400 opacity-75"
                  >
                  </span>
                  <span
                    class="relative inline-flex size-3 rounded-full bg-neutral-400"
                  >
                  </span>
                </span>
                Idle
              </div>
            </Table.Cell>
            <Table.Cell>-</Table.Cell>
            <Table.Cell>-</Table.Cell>
            <Table.Cell class="text-end"></Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </Card.Content>
</Card.Root>
