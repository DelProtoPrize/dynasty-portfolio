<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLAttributes } from 'svelte/elements';

  let { class: className, children, ...rest }: HTMLAttributes<HTMLTableCellElement> & { children: any } = $props();
</script>

<th class={cn('h-8 px-2.5 text-left align-middle text-[10px] font-bold uppercase tracking-wider text-ink-dim', className)} {...rest}>
  {@render children()}
</th>
