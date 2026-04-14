<script lang="ts">
  let { slug, onReset }: { slug: string; onReset: () => void } = $props();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  let shortUrl = $derived(`${baseUrl}/${slug}`);
  let copied = $state(false);

  async function copy() {
    await navigator.clipboard.writeText(shortUrl);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="relative overflow-hidden rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-surface)] p-5">
  <!-- Glow -->
  <div class="pointer-events-none absolute inset-0 bg-[var(--color-success)]/5"></div>

  <div class="flex items-start justify-between gap-3">
    <div>
      <div class="mb-1 flex items-center gap-2">
        <span class="size-2 animate-pulse rounded-full bg-[var(--color-success)]"></span>
        <p class="text-xs font-medium uppercase tracking-widest text-[var(--color-success)]">Link created</p>
      </div>
      <p class="mt-1 font-mono text-lg font-semibold text-[#e2e8f0]">{shortUrl}</p>
    </div>

    <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
      <button
        onclick={copy}
        class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all
          {copied
          ? 'border-[var(--color-success)]/50 bg-[var(--color-success)]/10 text-[var(--color-success)]'
          : 'border-[var(--color-border)] text-[#94a3b8] hover:border-[var(--color-muted)] hover:text-[#e2e8f0]'}"
      >
        {#if copied}
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Copied!
        {:else}
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy
        {/if}
      </button>

      <a
        href="/dashboard"
        class="flex items-center gap-1.5 rounded-lg border border-[var(--color-accent)]/40
          px-3 py-1.5 text-sm font-medium text-[var(--color-accent-light)]
          transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"></path>
        </svg>
        Analytics
      </a>
    </div>
  </div>

  <button
    onclick={onReset}
    class="mt-3 text-xs text-[var(--color-muted)] underline-offset-2 hover:text-[#94a3b8] hover:underline"
  >
    Create another link
  </button>
</div>
