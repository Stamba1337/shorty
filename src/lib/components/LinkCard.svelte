<script lang="ts">
  import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
  import { db } from '$lib/firebase';
  import ClickChart from './ClickChart.svelte';
  import type { Timestamp } from 'firebase/firestore';

  interface LinkData {
    id: string;
    type: 'url' | 'file';
    destination: string;
    title: string;
    clicks: number;
    createdAt: Timestamp;
    expiresAt: Timestamp | null;
    maxClicks: number | null;
    fileType: string | null;
    fileSize: number | null;
  }

  let { link, onDeleted }: { link: LinkData; onDeleted: () => void } = $props();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shortUrl = `${baseUrl}/${link.id}`;

  let expanded = $state(false);
  let events = $state<{ timestamp: Timestamp; device?: string; referrer?: string }[]>([]);
  let loadingEvents = $state(false);
  let copied = $state(false);
  let confirmDelete = $state(false);
  let deleting = $state(false);

  async function loadEvents() {
    if (events.length > 0) return;
    loadingEvents = true;
    const q = query(collection(db, 'links', link.id, 'events'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    events = snap.docs.map((d) => d.data() as { timestamp: Timestamp; device?: string; referrer?: string });
    loadingEvents = false;
  }

  function toggle() {
    expanded = !expanded;
    if (expanded) loadEvents();
  }

  async function copy() {
    await navigator.clipboard.writeText(shortUrl);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  async function deleteLink() {
    deleting = true;
    await deleteDoc(doc(db, 'links', link.id));
    onDeleted();
  }

  function formatDate(ts: Timestamp | null) {
    if (!ts) return '—';
    return ts.toDate().toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return ` · ${(bytes / 1024).toFixed(1)} KB`;
    return ` · ${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const isExpired = $derived(
    link.expiresAt !== null && link.expiresAt.toDate() < new Date()
  );
  const isMaxed = $derived(
    link.maxClicks !== null && link.clicks >= link.maxClicks
  );
</script>

<div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden
  transition-all {isExpired || isMaxed ? 'opacity-60' : ''}">
  <div class="p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <!-- Type badge + slug -->
        <div class="mb-1 flex flex-wrap items-center gap-2">
          <span class="rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide
            {link.type === 'file'
            ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
            : 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent-light)]'}">
            {link.type === 'file' ? '📄 file' : '🔗 url'}
          </span>
          <span class="font-mono text-sm font-semibold text-[#e2e8f0]">{link.id}</span>
          {#if isExpired}
            <span class="rounded border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10
              px-1.5 py-0.5 text-[10px] text-[var(--color-danger)]">expired</span>
          {:else if isMaxed}
            <span class="rounded border border-orange-500/30 bg-orange-500/10
              px-1.5 py-0.5 text-[10px] text-orange-400">maxed</span>
          {/if}
        </div>

        <!-- Title / destination -->
        <p class="truncate text-sm text-[var(--color-muted)]">
          {link.title || link.destination}
          {formatSize(link.fileSize)}
        </p>

        <!-- Meta -->
        <p class="mt-0.5 text-xs text-[var(--color-muted)]/70">
          Created {formatDate(link.createdAt)}
          {#if link.expiresAt} · Expires {formatDate(link.expiresAt)}{/if}
          {#if link.maxClicks} · Max {link.maxClicks} clicks{/if}
        </p>
      </div>

      <!-- Click count -->
      <div class="text-right">
        <p class="text-2xl font-bold text-[var(--color-accent-light)]">{link.clicks}</p>
        <p class="text-[10px] text-[var(--color-muted)]">clicks</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        onclick={copy}
        class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all
          {copied
          ? 'border-[var(--color-success)]/50 text-[var(--color-success)]'
          : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[#94a3b8]'}"
      >
        {copied ? '✓ Copied' : 'Copy link'}
      </button>

      <a
        href={link.destination}
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)]
          px-2.5 py-1 text-xs font-medium text-[var(--color-muted)] transition-all hover:text-[#94a3b8]"
      >
        Visit →
      </a>

      <button
        onclick={toggle}
        class="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)]
          px-2.5 py-1 text-xs font-medium text-[var(--color-muted)] transition-all hover:text-[#94a3b8]"
      >
        {expanded ? 'Hide' : 'Analytics'}
        <svg
          class="size-3 transition-transform {expanded ? 'rotate-180' : ''}"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {#if !confirmDelete}
        <button
          onclick={() => (confirmDelete = true)}
          class="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--color-border)]
            px-2.5 py-1 text-xs font-medium text-[var(--color-muted)] transition-all
            hover:border-[var(--color-danger)]/50 hover:text-[var(--color-danger)]"
        >
          Delete
        </button>
      {:else}
        <div class="ml-auto flex items-center gap-1.5">
          <span class="text-xs text-[#94a3b8]">Sure?</span>
          <button
            onclick={deleteLink}
            disabled={deleting}
            class="rounded-lg border border-[var(--color-danger)]/50 bg-[var(--color-danger)]/10
              px-2.5 py-1 text-xs font-medium text-[var(--color-danger)]
              transition-all hover:bg-[var(--color-danger)]/20"
          >
            {deleting ? '...' : 'Yes, delete'}
          </button>
          <button
            onclick={() => (confirmDelete = false)}
            class="rounded-lg border border-[var(--color-border)] px-2.5 py-1
              text-xs text-[var(--color-muted)] hover:text-[#94a3b8]"
          >
            Cancel
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Analytics panel -->
  {#if expanded}
    <div class="border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/50 p-4">
      <ClickChart {events} loading={loadingEvents} />
    </div>
  {/if}
</div>
