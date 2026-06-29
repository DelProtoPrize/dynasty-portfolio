<script lang="ts">
  import { page } from '$app/stores';
  let { children }: { children: any } = $props();
</script>

<header class="px-6 py-4 border-b border-line flex items-center justify-between bg-surface">
  <div>
    <div class="text-[15px] font-bold text-ink tracking-tight">Roster Portfolio & Asset Valuation</div>
    <div class="text-[11px] text-ink-dim tracking-[.04em] uppercase mt-0.5">Dynasty Intelligence Platform</div>
  </div>
  <div class="flex items-center gap-3">
    {@render children()}
    <nav class="flex gap-1">
      <a
        href="/"
        class="no-underline text-xs px-3 py-[5px] rounded-md border transition-all duration-150 hover:text-ink hover:bg-panel-hover {$page.url.pathname === '/' ? 'text-ink bg-panel border-line-strong' : 'text-ink-dim border-transparent'}"
      >Dashboard</a>
      <a
        href="/model-lab"
        class="no-underline text-xs px-3 py-[5px] rounded-md border transition-all duration-150 hover:text-ink hover:bg-panel-hover {$page.url.pathname === '/model-lab' ? 'text-ink bg-panel border-line-strong' : 'text-ink-dim border-transparent'}"
      >Model Lab</a>
    </nav>
  </div>
</header>
