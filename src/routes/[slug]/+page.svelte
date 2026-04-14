<script lang="ts">
  import { page } from '$app/state';
  import { db } from '$lib/firebase';
  import { doc, getDoc } from 'firebase/firestore';
  import { logClick } from '$lib/utils/analytics';
  import { onMount } from 'svelte';

  type Status = 'loading' | 'redirecting' | 'expired' | 'maxed' | 'not-found' | 'error';

  let status = $state<Status>('loading');
  let destination = $state('');
  let errorMsg = $state('');

  const slug = page.params.slug as string;

  onMount(async () => {
    try {
      const snap = await getDoc(doc(db, 'links', slug));

      if (!snap.exists()) {
        status = 'not-found';
        return;
      }

      const data = snap.data();

      // Check expiry
      if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
        status = 'expired';
        return;
      }

      // Check max clicks
      if (data.maxClicks !== null && data.clicks >= data.maxClicks) {
        status = 'maxed';
        return;
      }

      destination = data.destination;
      status = 'redirecting';

      // Log click (fire and forget — don't block the redirect)
      logClick(slug as string).catch(console.error);

      // Small delay so the spinner shows, then redirect
      setTimeout(() => {
        window.location.href = destination;
      }, 300);
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Unknown error';
      status = 'error';
    }
  });
</script>

<svelte:head>
  <title>Redirecting... — Shorty</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center px-4 text-center">
  {#if status === 'loading' || status === 'redirecting'}
    <div class="space-y-4">
      <svg class="mx-auto size-10 animate-spin text-[var(--color-accent-light)]" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.2"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="text-sm text-[var(--color-muted)]">Redirecting you...</p>
      {#if destination}
        <p class="max-w-xs truncate text-xs text-[var(--color-muted)]/70">{destination}</p>
      {/if}
    </div>

  {:else if status === 'not-found'}
    <div class="space-y-3">
      <p class="text-5xl">🔍</p>
      <h1 class="text-xl font-bold text-[#e2e8f0]">Link not found</h1>
      <p class="text-sm text-[var(--color-muted)]">
        The slug <code class="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-xs">{slug}</code> doesn't exist.
      </p>
      <a href="/" class="inline-block rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white">
        Go home
      </a>
    </div>

  {:else if status === 'expired'}
    <div class="space-y-3">
      <p class="text-5xl">⏰</p>
      <h1 class="text-xl font-bold text-[#e2e8f0]">Link expired</h1>
      <p class="text-sm text-[var(--color-muted)]">This link has passed its expiry date.</p>
      <a href="/" class="inline-block rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white">
        Create a new link
      </a>
    </div>

  {:else if status === 'maxed'}
    <div class="space-y-3">
      <p class="text-5xl">🚫</p>
      <h1 class="text-xl font-bold text-[#e2e8f0]">Click limit reached</h1>
      <p class="text-sm text-[var(--color-muted)]">This link has reached its maximum number of clicks.</p>
      <a href="/" class="inline-block rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white">
        Go home
      </a>
    </div>

  {:else if status === 'error'}
    <div class="space-y-3">
      <p class="text-5xl">⚠️</p>
      <h1 class="text-xl font-bold text-[#e2e8f0]">Something went wrong</h1>
      <p class="text-sm text-[var(--color-muted)]">{errorMsg || 'Could not load this link.'}</p>
      <a href="/" class="inline-block rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white">
        Go home
      </a>
    </div>
  {/if}
</div>
