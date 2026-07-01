<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLAttributes } from 'svelte/elements';

  let { class: className, children, ...rest }: HTMLAttributes<HTMLTableSectionElement> & { children: any } = $props();
</script>

<thead class={cn('border-b border-line', className)} {...rest}>
  {@render children()}
</thead>
