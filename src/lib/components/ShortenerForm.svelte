<script lang="ts">
  import { db } from '$lib/firebase';
  import { authStore } from '$lib/stores/auth.svelte';
  import { generateSlug, isValidCustomSlug } from '$lib/utils/slug';
  import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

  let { onCreated }: { onCreated: (slug: string) => void } = $props();

  let url = $state('');
  let customSlug = $state('');
  let expiry = $state('never');
  let maxClicks = $state('');
  let showAdvanced = $state(false);
  let loading = $state(false);
  let error = $state('');

  async function shorten() {
    error = '';
    if (!url.trim()) { error = 'Please enter a URL'; return; }

    try { new URL(url); } catch {
      error = 'Please enter a valid URL (including https://)';
      return;
    }

    if (!authStore.user) { error = 'Please sign in to create links'; return; }

    loading = true;
    try {
      let slug = customSlug.trim().toLowerCase() || generateSlug();

      if (customSlug.trim() && !isValidCustomSlug(slug)) {
        error = 'Slug must be 3-30 lowercase letters, numbers, or hyphens';
        return;
      }

      // Check slug availability
      const existing = await getDoc(doc(db, 'links', slug));
      if (existing.exists()) {
        error = 'That slug is already taken. Try a different one.';
        return;
      }

      let expiresAt = null;
      if (expiry !== 'never') {
        const ms: Record<string, number> = { '1d': 86400000, '7d': 604800000, '30d': 2592000000 };
        expiresAt = new Date(Date.now() + ms[expiry]);
      }

      await setDoc(doc(db, 'links', slug), {
        uid: authStore.user.uid,
        type: 'url',
        destination: url.trim(),
        title: url.trim(),
        createdAt: serverTimestamp(),
        expiresAt,
        maxClicks: maxClicks ? parseInt(maxClicks) : null,
        clicks: 0,
        storageRef: null,
        fileType: null,
        fileSize: null,
      });

      onCreated(slug);
      url = '';
      customSlug = '';
      expiry = 'never';
      maxClicks = '';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Something went wrong';
    } finally {
      loading = false;
    }
  }
</script>

<div class="space-y-4">
  <div class="flex gap-2">
    <input
      type="url"
      bind:value={url}
      placeholder="https://your-long-url.com/goes/here"
      onkeydown={(e) => e.key === 'Enter' && shorten()}
      class="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]
        px-4 py-3 text-[#e2e8f0] placeholder-[var(--color-muted)] outline-none transition-all
        focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/40"
    />
    <button
      onclick={shorten}
      disabled={loading}
      class="flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-3 font-medium
        text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {#if loading}
        <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      {/if}
      Shorten
    </button>
  </div>

  <button
    onclick={() => (showAdvanced = !showAdvanced)}
    class="flex items-center gap-1 text-xs text-[var(--color-muted)] transition-colors hover:text-[#94a3b8]"
  >
    <svg
      class="size-3 transition-transform {showAdvanced ? 'rotate-90' : ''}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
    Advanced options
  </button>

  {#if showAdvanced}
    <div class="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-4 sm:grid-cols-3">
      <div class="space-y-1">
        <label class="text-xs font-medium text-[#94a3b8]">Custom slug</label>
        <input
          type="text"
          bind:value={customSlug}
          placeholder="my-link"
          class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]
            px-3 py-2 text-sm text-[#e2e8f0] placeholder-[var(--color-muted)] outline-none
            focus:border-[var(--color-accent)]"
        />
      </div>

      <div class="space-y-1">
        <label class="text-xs font-medium text-[#94a3b8]">Expires</label>
        <select
          bind:value={expiry}
          class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]
            px-3 py-2 text-sm text-[#e2e8f0] outline-none focus:border-[var(--color-accent)]"
        >
          <option value="never">Never</option>
          <option value="1d">24 hours</option>
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-xs font-medium text-[#94a3b8]">Max clicks</label>
        <input
          type="number"
          bind:value={maxClicks}
          placeholder="Unlimited"
          min="1"
          class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]
            px-3 py-2 text-sm text-[#e2e8f0] placeholder-[var(--color-muted)] outline-none
            focus:border-[var(--color-accent)]"
        />
      </div>
    </div>
  {/if}

  {#if error}
    <p class="flex items-center gap-2 text-sm text-[var(--color-danger)]">
      <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      {error}
    </p>
  {/if}
</div>
