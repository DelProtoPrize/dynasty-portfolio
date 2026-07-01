<script lang="ts">
  import { cn } from '$lib/utils';

  let { variant = 'default', class: className, children }:
    { variant?: 'default' | 'good' | 'bad' | 'warn' | 'accent'; class?: string; children: any } = $props();

  const variants: Record<string, string> = {
    default: 'bg-surface text-ink-dim border-line',
    good: 'bg-good-dim text-good border-good/25',
    bad: 'bg-bad-dim text-bad border-bad/25',
    warn: 'bg-warn-dim text-warn border-warn/25',
    accent: 'bg-accent-dim text-accent border-accent/25',
  };
</script>

<span class={cn('inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold font-mono tracking-wide border', variants[variant], className)}>
  {@render children()}
</span>
