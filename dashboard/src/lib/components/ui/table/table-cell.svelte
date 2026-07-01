<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLAttributes } from 'svelte/elements';

  let { class: className, children, ...rest }: HTMLAttributes<HTMLTableCellElement> & { children: any } = $props();
</script>

<td class={cn('px-2.5 py-2 align-middle text-[13px] text-ink', className)} {...rest}>
  {@render children()}
</td>
