<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  let { data, layout, config = {}, style = 'height:400px' }: {
    data: any[];
    layout: any;
    config?: any;
    style?: string;
  } = $props();

  let container: HTMLDivElement | undefined;
  let Plotly: any;

  onMount(async () => {
    if (!browser || !container) return;
    Plotly = (await import('plotly.js-basic-dist-min')).default;
    try {
      Plotly.react(container, data, layout, { displayModeBar: false, responsive: true, ...config });
    } catch (e) {
      // Ignore in test environments where container may not be fully mounted
      if (process?.env?.NODE_ENV !== 'test') console.error(e);
    }
  });

  $effect(() => {
    if (Plotly && container && data && browser) {
      try {
        Plotly.react(container, data, layout, { displayModeBar: false, responsive: true, ...config });
      } catch (e) {
        if (process?.env?.NODE_ENV !== 'test') console.error(e);
      }
    }
  });
</script>

<div bind:this={container} {style}></div>
