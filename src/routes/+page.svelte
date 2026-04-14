<script lang="ts">
  import ShortenerForm from '$lib/components/ShortenerForm.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import ConvertTool from '$lib/components/ConvertTool.svelte';
  import ResultCard from '$lib/components/ResultCard.svelte';
  import { authStore } from '$lib/stores/auth.svelte';

  type Tab = 'shorten' | 'drop' | 'convert';
  let activeTab = $state<Tab>('shorten');
  let createdSlug = $state<string | null>(null);

  function handleCreated(slug: string) {
    createdSlug = slug;
  }

  function reset() {
    createdSlug = null;
  }

  const tabs: { id: Tab; icon: string; label: string; desc: string }[] = [
    { id: 'shorten', icon: '🔗', label: 'Shorten', desc: 'Turn any URL into a short trackable link' },
    { id: 'drop', icon: '📤', label: 'Drop', desc: 'Upload a file and get a shareable short link' },
    { id: 'convert', icon: '⚡', label: 'Convert', desc: 'Convert files in your browser — images, JSON, Markdown' },
  ];
</script>

<svelte:head>
  <title>Shorty — Shorten, Drop & Convert</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-16">
  <!-- Hero -->
  <div class="mb-10 text-center">
    <h1 class="mb-3 text-4xl font-bold tracking-tight text-[#e2e8f0] sm:text-5xl">
      Shorten. Drop.
      <span class="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-light)] bg-clip-text text-transparent">Convert.</span>
    </h1>
    <p class="text-base text-[var(--color-muted)]">
      Your links, your files, your data — with full analytics.
    </p>
    {#if !authStore.loading && !authStore.user}
      <a
        href="/login"
        class="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5
          text-sm font-medium text-white shadow-lg shadow-[var(--color-accent)]/20
          transition-all hover:opacity-90"
      >
        Get started — it's free
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </a>
    {/if}
  </div>

  <!-- Tab selector -->
  <div class="mb-6 grid grid-cols-3 gap-2">
    {#each tabs as tab}
      <button
        onclick={() => { activeTab = tab.id; createdSlug = null; }}
        class="rounded-xl border p-3 text-left transition-all
          {activeTab === tab.id
          ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]/50'}"
      >
        <span class="text-lg">{tab.icon}</span>
        <p class="mt-1 text-sm font-semibold text-[#e2e8f0]">{tab.label}</p>
        <p class="text-xs leading-snug text-[var(--color-muted)]">{tab.desc}</p>
      </button>
    {/each}
  </div>

  <!-- Tab content -->
  <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
    {#if createdSlug}
      <ResultCard slug={createdSlug} onReset={reset} />
    {:else if activeTab === 'shorten'}
      <ShortenerForm onCreated={handleCreated} />
    {:else if activeTab === 'drop'}
      <FileDropZone onCreated={handleCreated} />
    {:else if activeTab === 'convert'}
      <ConvertTool />
    {/if}
  </div>

  <!-- Feature bullets -->
  <div class="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
    {#each [
      ['📊', 'Click analytics'],
      ['⏱️', 'Expiring links'],
      ['📁', 'File hosting'],
      ['🔄', 'File converter'],
    ] as [icon, label]}
      <div class="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2">
        <span>{icon}</span>
        <span class="text-xs text-[var(--color-muted)]">{label}</span>
      </div>
    {/each}
  </div>
</div>
