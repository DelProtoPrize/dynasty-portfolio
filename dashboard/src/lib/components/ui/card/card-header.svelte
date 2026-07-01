<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLAttributes } from 'svelte/elements';

  let { class: className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: any } = $props();
</script>

<div class={cn('flex items-baseline justify-between p-4 pb-3', className)} {...rest}>
  {@render children()}
</div>
