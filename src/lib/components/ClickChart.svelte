<script lang="ts">
  import type { Timestamp } from 'firebase/firestore';

  interface Event {
    timestamp: Timestamp;
    device?: string;
    referrer?: string;
  }

  let { events, loading = false }: { events: Event[]; loading?: boolean } = $props();

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const labels = days.map((d) =>
    d.toLocaleDateString('en', { weekday: 'short', month: 'numeric', day: 'numeric' })
  );

  const counts = $derived(
    days.map((day) => {
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      return events.filter((e) => {
        const ts = e.timestamp?.toDate?.();
        return ts && ts >= start && ts <= end;
      }).length;
    })
  );

  const maxCount = $derived(Math.max(...counts, 1));

  const deviceCounts = $derived({
    mobile: events.filter((e) => e.device === 'mobile').length,
    tablet: events.filter((e) => e.device === 'tablet').length,
    desktop: events.filter((e) => e.device === 'desktop').length,
  });

  const topReferrers = $derived(
    Object.entries(
      events.reduce(
        (acc, e) => {
          const r = e.referrer || 'direct';
          acc[r] = (acc[r] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  );
</script>

{#if loading}
  <div class="flex items-center justify-center py-6">
    <svg class="size-5 animate-spin text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </div>
{:else}
  <div class="space-y-4">
    <!-- Bar chart -->
    <div>
      <p class="mb-2 text-xs font-medium text-[#94a3b8]">Clicks — last 7 days</p>
      <div class="flex h-20 items-end gap-1">
        {#each counts as count, i}
          <div class="group relative flex flex-1 flex-col items-center">
            <!-- Tooltip -->
            <div class="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap
              rounded bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[#e2e8f0] opacity-0
              shadow group-hover:opacity-100 transition-opacity">
              {count}
            </div>
            <div
              class="w-full rounded-t transition-all"
              style="
                height: {Math.max((count / maxCount) * 100, 4)}%;
                background: {count > 0
                  ? 'linear-gradient(to top, var(--color-accent), var(--color-accent-light))'
                  : 'var(--color-border)'};
                opacity: {count > 0 ? 1 : 0.4};
              "
            ></div>
          </div>
        {/each}
      </div>
      <div class="mt-1 flex gap-1">
        {#each labels as label}
          <p class="flex-1 truncate text-center text-[10px] text-[var(--color-muted)]">{label.split(',')[0]}</p>
        {/each}
      </div>
    </div>

    <!-- Device split -->
    {#if events.length > 0}
      <div class="flex flex-wrap gap-2">
        {#each [['desktop', '🖥'], ['mobile', '📱'], ['tablet', '📟']] as [key, icon]}
          {@const count = deviceCounts[key as keyof typeof deviceCounts]}
          {@const pct = events.length ? Math.round((count / events.length) * 100) : 0}
          {#if count > 0}
            <span class="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs text-[#94a3b8]">
              {icon} {key} {pct}%
            </span>
          {/if}
        {/each}
      </div>

      <!-- Top referrers -->
      {#if topReferrers.length > 0}
        <div>
          <p class="mb-1.5 text-xs font-medium text-[#94a3b8]">Top sources</p>
          <div class="space-y-1">
            {#each topReferrers as [ref, count]}
              <div class="flex items-center justify-between gap-2">
                <span class="max-w-[200px] truncate text-xs text-[var(--color-muted)]">{ref}</span>
                <span class="text-xs font-medium text-[#e2e8f0]">{count}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {:else}
      <p class="text-xs text-[var(--color-muted)]">No click data yet.</p>
    {/if}
  </div>
{/if}
