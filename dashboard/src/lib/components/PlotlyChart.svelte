<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  let { data, layout, config = {}, style = 'height:400px' }: {
    data: any[];
    layout: any;
    config?: any;
    style?: string;
  } = $props();

  let container: HTMLDivElement;
  let Plotly: any;

  onMount(async () => {
    Plotly = (await import('plotly.js-basic-dist-min')).default;
    Plotly.react(container, data, layout, { displayModeBar: false, responsive: true, ...config });
  });

  $effect(() => {
    if (Plotly && container && data) {
      Plotly.react(container, data, layout, { displayModeBar: false, responsive: true, ...config });
    }
  });
</script>

{#if browser}
  <div bind:this={container} {style}></div>
{:else}
  <div {style}></div>
{/if}
