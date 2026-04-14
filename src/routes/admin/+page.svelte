<script lang="ts">
  import { db } from '$lib/firebase';
  import { authStore } from '$lib/stores/auth.svelte';
  import {
    collection,
    query,
    orderBy,
    getDocs,
    collectionGroup,
    limit,
    type Timestamp,
  } from 'firebase/firestore';
  import { goto } from '$app/navigation';

  const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

  interface LinkDoc {
    id: string;
    uid: string;
    type: 'url' | 'file';
    destination: string;
    title: string;
    clicks: number;
    createdAt: Timestamp;
    expiresAt: Timestamp | null;
    maxClicks: number | null;
    fileSize: number | null;
  }

  interface ClickEvent {
    timestamp: Timestamp;
    device?: string;
    referrer?: string;
  }

  let links = $state<LinkDoc[]>([]);
  let recentEvents = $state<(ClickEvent & { slug: string })[]>([]);
  let loading = $state(true);
  let eventsLoading = $state(true);
  let sort = $state<'clicks' | 'date'>('clicks');
  let search = $state('');
  let copied = $state(false);

  const isAdmin = $derived(
    !authStore.loading && authStore.user?.uid === ADMIN_UID
  );

  const isSetup = $derived(!!ADMIN_UID);

  // Stats
  const totalClicks = $derived(links.reduce((s, l) => s + (l.clicks ?? 0), 0));
  const uniqueUsers = $derived(new Set(links.map((l) => l.uid)).size);
  const fileCount = $derived(links.filter((l) => l.type === 'file').length);
  const activeLinks = $derived(
    links.filter(
      (l) => !l.expiresAt || l.expiresAt.toDate() > new Date()
    ).length
  );

  // Links-created-per-day (last 14 days)
  const createdPerDay = $derived(
    Array.from({ length: 14 }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (13 - i));
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      return {
        label: day.toLocaleDateString('en', { month: 'numeric', day: 'numeric' }),
        count: links.filter((l) => {
          const t = l.createdAt?.toDate?.();
          return t && t >= day && t < next;
        }).length,
      };
    })
  );
  const createdPerDayMax = $derived(Math.max(...createdPerDay.map((d) => d.count), 1));

  // Filtered + sorted link list
  const filtered = $derived(
    links
      .filter((l) =>
        search
          ? l.id.includes(search) ||
            l.title.toLowerCase().includes(search.toLowerCase()) ||
            l.uid.includes(search)
          : true
      )
      .sort((a, b) =>
        sort === 'clicks'
          ? (b.clicks ?? 0) - (a.clicks ?? 0)
          : b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.()
      )
  );

  // Redirect if not auth'd or not admin
  $effect(() => {
    if (authStore.loading) return;
    if (!authStore.user) { goto('/login'); return; }
    if (isSetup && !isAdmin) return; // show access denied, don't redirect
    if (!loading) return;
    loadAll();
  });

  async function loadAll() {
    loading = true;
    eventsLoading = true;

    // Load all links
    const snap = await getDocs(
      query(collection(db, 'links'), orderBy('createdAt', 'desc'))
    );
    links = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LinkDoc);
    loading = false;

    // Load recent events via collectionGroup
    try {
      const evSnap = await getDocs(
        query(collectionGroup(db, 'events'), orderBy('timestamp', 'desc'), limit(50))
      );
      recentEvents = evSnap.docs.map((d) => {
        const pathParts = d.ref.path.split('/');
        const slug = pathParts[1]; // links/{slug}/events/{id}
        return { slug, ...d.data() } as ClickEvent & { slug: string };
      });
    } catch {
      // collectionGroup requires a composite index — gracefully ignore if not set up
    }
    eventsLoading = false;
  }

  async function copyUid() {
    if (!authStore.user) return;
    await navigator.clipboard.writeText(authStore.user.uid);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function fmt(ts: Timestamp | null) {
    if (!ts) return '—';
    return ts.toDate().toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function fmtTime(ts: Timestamp | null) {
    if (!ts) return '—';
    const d = ts.toDate();
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  }
</script>

<svelte:head>
  <title>Admin — Shorty</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-10">

  <!-- Not logged in -->
  {#if authStore.loading}
    <div class="flex justify-center py-20">
      <svg class="size-8 animate-spin text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>

  <!-- ADMIN_UID not configured yet — show setup helper -->
  {:else if !isSetup}
    <div class="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-8 text-center">
      <p class="text-3xl">⚙️</p>
      <h1 class="mt-3 text-xl font-bold text-[#e2e8f0]">Admin not configured</h1>
      <p class="mt-2 text-sm text-[var(--color-muted)]">
        Add your Firebase UID as <code class="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-xs text-yellow-400">VITE_ADMIN_UID</code> in your <code class="font-mono text-xs">.env</code> file and in Vercel environment variables.
      </p>
      {#if authStore.user}
        <div class="mt-6 flex flex-col items-center gap-3">
          <p class="text-xs text-[var(--color-muted)]">Your Firebase UID (logged in as {authStore.user.email}):</p>
          <div class="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
            <code class="font-mono text-sm text-[#e2e8f0]">{authStore.user.uid}</code>
            <button
              onclick={copyUid}
              class="ml-2 rounded border border-[var(--color-border)] px-2 py-0.5 text-xs transition-all
                {copied ? 'border-[var(--color-success)]/50 text-[var(--color-success)]' : 'text-[var(--color-muted)] hover:text-[#94a3b8]'}"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p class="text-xs text-[var(--color-muted)]">
            Paste it into <code class="font-mono text-xs">.env</code> →
            <code class="font-mono text-xs text-yellow-400">VITE_ADMIN_UID=your-uid-here</code>
            then restart the dev server.
          </p>
        </div>
      {:else}
        <a href="/login" class="mt-4 inline-block rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white">
          Sign in first
        </a>
      {/if}
    </div>

  <!-- Logged in but not admin -->
  {:else if !isAdmin}
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <p class="text-5xl">🚫</p>
      <h1 class="mt-3 text-xl font-bold text-[#e2e8f0]">Access denied</h1>
      <p class="mt-1 text-sm text-[var(--color-muted)]">This page is restricted to the site admin.</p>
      <a href="/" class="mt-4 inline-block rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)]">
        Go home
      </a>
    </div>

  <!-- ADMIN DASHBOARD -->
  {:else}
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-[#e2e8f0]">Admin Analytics</h1>
        <p class="mt-0.5 text-sm text-[var(--color-muted)]">All users · All time</p>
      </div>
      <button
        onclick={loadAll}
        class="flex items-center gap-2 rounded-lg border border-[var(--color-border)]
          px-3 py-1.5 text-xs text-[var(--color-muted)] transition-all hover:text-[#94a3b8]"
      >
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        Refresh
      </button>
    </div>

    {#if loading}
      <div class="flex justify-center py-20">
        <svg class="size-8 animate-spin text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
    {:else}
      <!-- Stats cards -->
      <div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {#each [
          { label: 'Total links', value: links.length, icon: '🔗', color: 'text-[var(--color-accent-light)]' },
          { label: 'Total clicks', value: totalClicks, icon: '📊', color: 'text-[var(--color-success)]' },
          { label: 'Unique users', value: uniqueUsers, icon: '👤', color: 'text-blue-400' },
          { label: 'Active links', value: activeLinks, icon: '✅', color: 'text-yellow-400' },
        ] as stat}
          <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p class="text-xs text-[var(--color-muted)]">{stat.icon} {stat.label}</p>
            <p class="mt-1 text-3xl font-bold {stat.color}">{stat.value.toLocaleString()}</p>
          </div>
        {/each}
      </div>

      <!-- Secondary stats -->
      <div class="mb-8 grid grid-cols-3 gap-3">
        {#each [
          { label: 'URL links', value: links.length - fileCount },
          { label: 'File links', value: fileCount },
          { label: 'Avg clicks/link', value: links.length ? (totalClicks / links.length).toFixed(1) : '0' },
        ] as s}
          <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <p class="text-xs text-[var(--color-muted)]">{s.label}</p>
            <p class="mt-0.5 text-xl font-semibold text-[#e2e8f0]">{s.value}</p>
          </div>
        {/each}
      </div>

      <!-- Links-created-per-day chart -->
      <div class="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <p class="mb-4 text-sm font-medium text-[#94a3b8]">Links created — last 14 days</p>
        <div class="flex h-24 items-end gap-0.5">
          {#each createdPerDay as day}
            <div class="group relative flex flex-1 flex-col items-center">
              <div
                class="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap
                  rounded bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[#e2e8f0]
                  opacity-0 shadow transition-opacity group-hover:opacity-100"
              >
                {day.count} link{day.count !== 1 ? 's' : ''} · {day.label}
              </div>
              <div
                class="w-full rounded-t transition-all"
                style="
                  height: {Math.max((day.count / createdPerDayMax) * 100, 3)}%;
                  background: {day.count > 0
                    ? 'linear-gradient(to top, var(--color-accent), var(--color-accent-light))'
                    : 'var(--color-border)'};
                  opacity: {day.count > 0 ? 1 : 0.3};
                "
              ></div>
            </div>
          {/each}
        </div>
        <div class="mt-1.5 flex gap-0.5">
          {#each createdPerDay as day, i}
            {#if i === 0 || i === 6 || i === 13}
              <p class="flex-1 text-center text-[10px] text-[var(--color-muted)]">{day.label}</p>
            {:else}
              <div class="flex-1"></div>
            {/if}
          {/each}
        </div>
      </div>

      <!-- Two columns: top links + recent activity -->
      <div class="mb-8 grid gap-4 lg:grid-cols-2">
        <!-- Top 10 by clicks -->
        <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p class="mb-4 text-sm font-medium text-[#94a3b8]">Top links by clicks</p>
          {#if links.length === 0}
            <p class="text-xs text-[var(--color-muted)]">No links yet.</p>
          {:else}
            {@const top = [...links].sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0)).slice(0, 10)}
            {@const topMax = Math.max(top[0]?.clicks ?? 1, 1)}
            <div class="space-y-2">
              {#each top as link}
                <div class="flex items-center gap-3">
                  <span class="w-16 shrink-0 font-mono text-xs font-semibold text-[#e2e8f0]">{link.id}</span>
                  <div class="flex-1">
                    <div
                      class="h-1.5 rounded-full bg-[var(--color-accent)]/70"
                      style="width: {Math.max((link.clicks / topMax) * 100, 2)}%"
                    ></div>
                  </div>
                  <span class="w-10 text-right text-xs font-medium text-[var(--color-accent-light)]">
                    {link.clicks ?? 0}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Recent click events -->
        <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p class="mb-4 text-sm font-medium text-[#94a3b8]">Recent clicks</p>
          {#if eventsLoading}
            <p class="text-xs text-[var(--color-muted)]">Loading...</p>
          {:else if recentEvents.length === 0}
            <p class="text-xs text-[var(--color-muted)]">
              No events yet, or Firestore collectionGroup index not configured.
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                class="text-[var(--color-accent-light)] hover:underline"
              >Set up index →</a>
            </p>
          {:else}
            <div class="space-y-2 overflow-y-auto" style="max-height: 260px">
              {#each recentEvents as ev}
                <div class="flex items-center justify-between gap-2 text-xs">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="shrink-0 font-mono font-semibold text-[var(--color-accent-light)]">/{ev.slug}</span>
                    <span class="shrink-0 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)]">
                      {ev.device ?? '?'}
                    </span>
                    <span class="truncate text-[var(--color-muted)]">{ev.referrer ?? 'direct'}</span>
                  </div>
                  <span class="shrink-0 text-[var(--color-muted)]/70">{fmtTime(ev.timestamp)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- All links table -->
      <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div class="flex items-center justify-between gap-3 border-b border-[var(--color-border)] p-4">
          <p class="text-sm font-medium text-[#94a3b8]">All links ({filtered.length})</p>
          <div class="flex items-center gap-2">
            <input
              type="text"
              bind:value={search}
              placeholder="Search slug, title, UID..."
              class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]
                px-3 py-1.5 text-xs text-[#e2e8f0] placeholder-[var(--color-muted)] outline-none
                focus:border-[var(--color-accent)] w-52"
            />
            <div class="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
              {#each [['clicks', '# Clicks'], ['date', '📅 Date']] as [s, label]}
                <button
                  onclick={() => (sort = s as 'clicks' | 'date')}
                  class="px-3 py-1.5 text-xs transition-all
                    {sort === s
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent-light)]'
                    : 'text-[var(--color-muted)] hover:text-[#94a3b8]'}"
                >
                  {label}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-[var(--color-border)] text-left text-[var(--color-muted)]">
                <th class="px-4 py-2.5 font-medium">Slug</th>
                <th class="px-4 py-2.5 font-medium">Type</th>
                <th class="px-4 py-2.5 font-medium">Title / Destination</th>
                <th class="px-4 py-2.5 font-medium">User UID</th>
                <th class="px-4 py-2.5 font-medium text-right">Clicks</th>
                <th class="px-4 py-2.5 font-medium">Created</th>
                <th class="px-4 py-2.5 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              {#each filtered.slice(0, 100) as link (link.id)}
                <tr class="border-b border-[var(--color-border)]/50 transition-colors hover:bg-[var(--color-surface-2)]/50">
                  <td class="px-4 py-2.5">
                    <a
                      href="/{link.id}"
                      target="_blank"
                      class="font-mono font-semibold text-[var(--color-accent-light)] hover:underline"
                    >
                      {link.id}
                    </a>
                  </td>
                  <td class="px-4 py-2.5">
                    <span class="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide
                      {link.type === 'file'
                      ? 'border-blue-500/30 text-blue-400'
                      : 'border-[var(--color-accent)]/30 text-[var(--color-accent-light)]'}">
                      {link.type}
                    </span>
                  </td>
                  <td class="px-4 py-2.5 max-w-[200px]">
                    <span class="block truncate text-[var(--color-muted)]" title={link.title || link.destination}>
                      {link.title || link.destination}
                    </span>
                  </td>
                  <td class="px-4 py-2.5">
                    <span class="font-mono text-[10px] text-[var(--color-muted)]/70">
                      {link.uid.slice(0, 12)}…
                    </span>
                  </td>
                  <td class="px-4 py-2.5 text-right font-semibold text-[#e2e8f0]">
                    {link.clicks ?? 0}
                  </td>
                  <td class="px-4 py-2.5 text-[var(--color-muted)]">{fmt(link.createdAt)}</td>
                  <td class="px-4 py-2.5 text-[var(--color-muted)]">
                    {#if link.expiresAt}
                      <span class="{link.expiresAt.toDate() < new Date() ? 'text-[var(--color-danger)]' : ''}">
                        {fmt(link.expiresAt)}
                      </span>
                    {:else}
                      <span class="text-[var(--color-muted)]/50">Never</span>
                    {/if}
                  </td>
                </tr>
              {/each}
              {#if filtered.length > 100}
                <tr>
                  <td colspan="7" class="px-4 py-3 text-center text-xs text-[var(--color-muted)]">
                    Showing first 100 of {filtered.length} links. Use search to narrow results.
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
          {#if filtered.length === 0}
            <p class="py-8 text-center text-xs text-[var(--color-muted)]">No links match your search.</p>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
