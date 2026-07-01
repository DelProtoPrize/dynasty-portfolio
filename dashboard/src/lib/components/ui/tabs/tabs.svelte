<script lang="ts">
  import { cn } from '$lib/utils';

  let { class: className, children }: { class?: string; children: any } = $props();
</script>

<div class={cn('inline-flex items-center gap-1 rounded-md border border-line bg-surface p-0.5', className)}>
  {@render children()}
</div>
