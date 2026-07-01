<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let { variant = 'default', size = 'sm', class: className, children, ...rest }:
    HTMLButtonAttributes & { variant?: 'default' | 'ghost' | 'active'; size?: 'sm' | 'md'; children: any } = $props();

  const variants: Record<string, string> = {
    default: 'bg-surface border-line text-ink-dim hover:text-ink hover:bg-panel-hover',
    ghost: 'border-transparent text-ink-dim hover:text-ink hover:bg-panel-hover',
    active: 'bg-panel border-line-strong text-ink',
  };

  const sizes: Record<string, string> = {
    sm: 'h-7 px-2.5 text-[11px]',
    md: 'h-9 px-4 text-[13px]',
  };
</script>

<button class={cn('inline-flex items-center justify-center rounded border font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer', variants[variant], sizes[size], className)} {...rest}>
  {@render children()}
</button>
