<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';

  let {
    title,
    items,
  }: {
    title: string;
    items: {
      title: string;
      url: string;
      icon: any;
    }[];
  } = $props();
</script>

<Sidebar.Group>
  <Sidebar.GroupLabel>{title}</Sidebar.GroupLabel>
  <Sidebar.Menu>
    {#each items as item (item.title)}
      <Sidebar.MenuItem>
        <Sidebar.MenuButton tooltipContent={item.title}>
          {#snippet child({ props })}
            <a
              href={item.url}
              target={item.url.startsWith('https') ? '_blank' : '_self'}
              {...props}
            >
              {#if typeof item.icon === 'string'}
                <div class="dark:fill-white w-4">
                  {@html item.icon}
                </div>
              {:else}
                <item.icon />
              {/if}
              <span>{item.title}</span>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    {/each}
  </Sidebar.Menu>
</Sidebar.Group>
