<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let { leagues }: { leagues: any[] } = $props();

  let selected = $derived($page.url.searchParams.get('league') || leagues[0]?.league_id || '');

  function onChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    goto(`?league=${val}`, { replaceState: true, noScroll: true });
  }
</script>

<select value={selected} onchange={onChange} class="bg-panel text-ink border border-line-strong rounded-md px-2.5 py-[5px] text-xs cursor-pointer">
  {#each leagues as l}
    <option value={l.league_id}>{l.league_name} ({l.season}){l.is_superflex ? ' · SF' : ''}</option>
  {/each}
</select>
