<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLAttributes } from 'svelte/elements';

  let { class: className, children, ...rest }: HTMLAttributes<HTMLHeadingElement> & { children: any } = $props();
</script>

<h2 class={cn('text-[11px] font-bold uppercase tracking-wider text-ink-dim', className)} {...rest}>
  {@render children()}
</h2>
