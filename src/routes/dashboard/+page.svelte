<script lang="ts">
  import { db } from '$lib/firebase';
  import { authStore } from '$lib/stores/auth.svelte';
  import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
  import { goto } from '$app/navigation';
  import LinkCard from '$lib/components/LinkCard.svelte';

  interface LinkDoc {
    id: string;
    type: 'url' | 'file';
    destination: string;
    title: string;
    clicks: number;
    createdAt: import('firebase/firestore').Timestamp;
    expiresAt: import('firebase/firestore').Timestamp | null;
    maxClicks: number | null;
    fileType: string | null;
    fileSize: number | null;
  }

  let links = $state<LinkDoc[]>([]);
  let loading = $state(true);
  let error = $state('');
  let search = $state('');
  let loaded = $state(false);

  const filtered = $derived(
    search.trim()
      ? links.filter(
          (l) =>
            l.id.includes(search.toLowerCase()) ||
            l.title.toLowerCase().includes(search.toLowerCase())
        )
      : links
  );

  $effect(() => {
    if (authStore.loading) return;
    if (!authStore.user) { goto('/login'); return; }
    if (loaded) return; // don't reload on auth re-runs
    loadLinks();
  });

  async function loadLinks() {
    loading = true;
    error = '';
    try {
      const q = query(
        collection(db, 'links'),
        where('uid', '==', authStore.user!.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      links = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LinkDoc);
      loaded = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Firestore index errors include a direct link to create the index
      error = msg;
      console.error('Dashboard load error:', e);
    } finally {
      loading = false;
    }
  }

  function removeLink(id: string) {
    links = links.filter((l) => l.id !== id);
  }

  const totalClicks = $derived(links.reduce((sum, l) => sum + (l.clicks ?? 0), 0));
</script>

<svelte:head>
  <title>Dashboard — Shorty</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-10">
  <!-- Header -->
  <div class="mb-8 flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-[#e2e8f0]">My Links</h1>
      {#if authStore.user}
        <p class="mt-0.5 text-sm text-[var(--color-muted)]">
          Signed in as {authStore.user.displayName ?? authStore.user.email}
        </p>
      {/if}
    </div>

    <a
      href="/"
      class="flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm
        font-medium text-white transition-all hover:opacity-90"
    >
      + New link
    </a>
  </div>

  <!-- Stats bar -->
  {#if !loading}
    <div class="mb-6 grid grid-cols-3 gap-3">
      {#each [
        ['Total links', links.length, '🔗'],
        ['Total clicks', totalClicks, '📊'],
        ['File links', links.filter((l) => l.type === 'file').length, '📁'],
      ] as [label, value, icon]}
        <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p class="text-xs text-[var(--color-muted)]">{icon} {label}</p>
          <p class="mt-1 text-2xl font-bold text-[#e2e8f0]">{value}</p>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Search -->
  {#if links.length > 3}
    <div class="mb-4 relative">
      <svg class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        type="text"
        bind:value={search}
        placeholder="Search links..."
        class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]
          py-2.5 pl-9 pr-4 text-sm text-[#e2e8f0] placeholder-[var(--color-muted)] outline-none
          focus:border-[var(--color-accent)]"
      />
    </div>
  {/if}

  <!-- Error -->
  {#if error}
    <div class="mb-4 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4">
      <p class="mb-1 text-sm font-medium text-[var(--color-danger)]">Failed to load links</p>
      <p class="font-mono text-xs text-[var(--color-muted)] break-all">{error}</p>
      {#if error.includes('indexes?create_composite')}
        <p class="mt-2 text-xs text-[#94a3b8]">
          This query needs a Firestore composite index.
          <a
            href={error.match(/https:\/\/[^\s]+/)?.[0] ?? 'https://console.firebase.google.com'}
            target="_blank"
            rel="noopener"
            class="text-[var(--color-accent-light)] underline"
          >Click here to create it automatically →</a>
        </p>
      {/if}
      <button
        onclick={loadLinks}
        class="mt-3 rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted)] hover:text-[#94a3b8]"
      >
        Retry
      </button>
    </div>
  {/if}

  <!-- Links -->
  {#if loading || authStore.loading}
    <div class="flex items-center justify-center py-20">
      <svg class="size-8 animate-spin text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  {:else if filtered.length === 0}
    <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed
      border-[var(--color-border)] py-20 text-center">
      {#if links.length === 0}
        <p class="text-4xl">🔗</p>
        <p class="mt-3 text-sm font-medium text-[#94a3b8]">No links yet</p>
        <p class="mt-1 text-xs text-[var(--color-muted)]">Create your first short link or upload a file</p>
        <a
          href="/"
          class="mt-4 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Create a link
        </a>
      {:else}
        <p class="text-sm text-[var(--color-muted)]">No links match your search</p>
      {/if}
    </div>
  {:else}
    <div class="space-y-3">
      {#each filtered as link (link.id)}
        <LinkCard {link} onDeleted={() => removeLink(link.id)} />
      {/each}
    </div>
  {/if}
</div>
