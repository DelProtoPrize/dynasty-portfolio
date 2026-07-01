<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let { active = false, class: className, children, ...rest }:
    HTMLButtonAttributes & { active?: boolean; children: any } = $props();
</script>

<button
  class={cn(
    'rounded px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer',
    active ? 'bg-panel text-ink border border-line-strong' : 'text-ink-dim hover:text-ink border border-transparent',
    className
  )}
  {...rest}
>
  {@render children()}
</button>
