<script lang="ts">
  let { label, value, sub = '', tone = '', tooltip = '' }: {
    label: string;
    value: string;
    sub?: string;
    tone?: string;
    tooltip?: string;
  } = $props();

  let barColor = $derived(
    tone === 'kpi-accent' ? 'before:bg-accent' :
    tone === 'kpi-good' ? 'before:bg-good' :
    tone === 'kpi-bad' ? 'before:bg-bad' :
    tone === 'kpi-warn' ? 'before:bg-warn' : ''
  );
</script>

<div
  class="bg-surface border border-line rounded-lg px-4 py-3.5 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:inset-x-0 before:h-0.5 {barColor}"
  data-tip={tooltip || undefined}
>
  <div class="text-[11px] text-ink-dim uppercase tracking-[.06em] font-semibold mb-2">{label}</div>
  <div class="font-mono font-bold text-[26px] leading-none text-ink tracking-tight">{value}</div>
  {#if sub}
    <div class="text-[11px] text-ink-dim mt-1.5 flex items-center gap-[5px] [&_.delta-tag]:font-mono [&_.delta-tag]:font-semibold [&_.delta-tag]:text-[11px] [&_.delta-tag]:px-[5px] [&_.delta-tag]:py-px [&_.delta-tag]:rounded [&_.delta-tag.up]:text-good [&_.delta-tag.up]:bg-good-dim [&_.delta-tag.down]:text-bad [&_.delta-tag.down]:bg-bad-dim [&_.delta-tag.flat]:text-warn [&_.delta-tag.flat]:bg-warn-dim">{@html sub}</div>
  {/if}
</div>
