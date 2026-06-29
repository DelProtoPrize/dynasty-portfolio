<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLAttributes } from 'svelte/elements';

  let { class: className, children, ...rest }: HTMLAttributes<HTMLTableRowElement> & { children: any } = $props();
</script>

<tr class={cn('border-b border-line transition-colors hover:bg-panel-hover', className)} {...rest}>
  {@render children()}
</tr>
