<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLAttributes } from 'svelte/elements';

  let { class: className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: any } = $props();
</script>

<div class={cn('rounded-lg border border-line bg-panel', className)} {...rest}>
  {@render children()}
</div>
