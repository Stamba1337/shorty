<script lang="ts">
  import {
    convertImage,
    jsonToCsv,
    csvToJson,
    markdownToHtml,
    svgToPng,
    downloadBlob,
    downloadText,
    type ImageFormat,
  } from '$lib/utils/convert';

  type Mode = 'image' | 'data' | 'markdown';
  type DataMode = 'json-to-csv' | 'csv-to-json';

  let mode = $state<Mode>('image');
  let dataMode = $state<DataMode>('json-to-csv');
  let imageTarget = $state<ImageFormat>('image/webp');
  let file = $state<File | null>(null);
  let textInput = $state('');
  let converting = $state(false);
  let result = $state<{ blob?: Blob; text?: string; ext: string; name: string } | null>(null);
  let error = $state('');
  let previewHtml = $state('');

  const imageFormats: { label: string; value: ImageFormat }[] = [
    { label: 'WebP', value: 'image/webp' },
    { label: 'JPEG', value: 'image/jpeg' },
    { label: 'PNG', value: 'image/png' },
  ];

  function reset() {
    file = null;
    textInput = '';
    result = null;
    error = '';
    previewHtml = '';
  }

  $effect(() => { mode; reset(); });

  async function convert() {
    error = '';
    result = null;
    converting = true;

    try {
      if (mode === 'image') {
        if (!file) { error = 'Please select an image file'; return; }

        const isSvg = file.type === 'image/svg+xml';
        let converted: { blob: Blob; ext: string };

        if (isSvg) {
          converted = await svgToPng(await file.text());
        } else {
          converted = await convertImage(file, imageTarget);
        }

        const baseName = file.name.replace(/\.[^.]+$/, '');
        result = { blob: converted.blob, ext: converted.ext, name: `${baseName}.${converted.ext}` };

      } else if (mode === 'data') {
        const input = textInput || (file ? await file.text() : '');
        if (!input.trim()) { error = 'Please paste or select a file to convert'; return; }

        if (dataMode === 'json-to-csv') {
          const csv = jsonToCsv(input);
          const baseName = file?.name.replace(/\.[^.]+$/, '') ?? 'converted';
          result = { text: csv, ext: 'csv', name: `${baseName}.csv` };
        } else {
          const json = csvToJson(input);
          const baseName = file?.name.replace(/\.[^.]+$/, '') ?? 'converted';
          result = { text: json, ext: 'json', name: `${baseName}.json` };
        }

      } else if (mode === 'markdown') {
        const input = textInput || (file ? await file.text() : '');
        if (!input.trim()) { error = 'Please paste or select a Markdown file'; return; }
        const html = markdownToHtml(input);
        previewHtml = html;
        result = { text: html, ext: 'html', name: 'converted.html' };
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Conversion failed';
    } finally {
      converting = false;
    }
  }

  function download() {
    if (!result) return;
    if (result.blob) downloadBlob(result.blob, result.name);
    else if (result.text) downloadText(result.text, result.name);
  }

  function onFileInput(e: Event) {
    file = (e.target as HTMLInputElement).files?.[0] ?? null;
  }
</script>

<!-- Mode tabs -->
<div class="mb-5 flex gap-1 rounded-xl bg-[var(--color-surface-2)] p-1">
  {#each ([['image', '🖼️ Image'], ['data', '📊 JSON/CSV'], ['markdown', '📝 Markdown']] as const) as [m, label]}
    <button
      onclick={() => (mode = m)}
      class="flex-1 rounded-lg py-2 text-sm font-medium transition-all
        {mode === m
        ? 'bg-[var(--color-surface)] text-[#e2e8f0] shadow-sm'
        : 'text-[var(--color-muted)] hover:text-[#94a3b8]'}"
    >
      {label}
    </button>
  {/each}
</div>

<div class="space-y-4">
  {#if mode === 'image'}
    <div class="flex items-end gap-3">
      <div class="flex-1 space-y-1">
        <label class="text-xs font-medium text-[#94a3b8]">Select image (PNG, JPG, WebP, SVG)</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onchange={onFileInput}
          class="w-full cursor-pointer rounded-lg border border-[var(--color-border)]
            bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[#94a3b8]
            file:mr-3 file:rounded file:border-0 file:bg-[var(--color-accent)]/20
            file:px-3 file:py-1 file:text-xs file:text-[var(--color-accent-light)]
            hover:file:bg-[var(--color-accent)]/30"
        />
      </div>
      {#if file?.type !== 'image/svg+xml'}
        <div class="space-y-1">
          <label class="text-xs font-medium text-[#94a3b8]">Convert to</label>
          <select
            bind:value={imageTarget}
            class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]
              px-3 py-2 text-sm text-[#e2e8f0] outline-none focus:border-[var(--color-accent)]"
          >
            {#each imageFormats as fmt}
              <option value={fmt.value}>{fmt.label}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>
    {#if file}
      <p class="text-xs text-[var(--color-muted)]">
        {file.name} · {(file.size / 1024).toFixed(1)} KB
        {#if file.type === 'image/svg+xml'} → PNG{/if}
      </p>
    {/if}

  {:else if mode === 'data'}
    <div class="flex gap-2">
      {#each ([['json-to-csv', 'JSON → CSV'], ['csv-to-json', 'CSV → JSON']] as const) as [dm, label]}
        <button
          onclick={() => (dataMode = dm)}
          class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-all
            {dataMode === dm
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent-light)]'
            : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[#94a3b8]'}"
        >
          {label}
        </button>
      {/each}
    </div>

    <div class="space-y-2">
      <input
        type="file"
        accept={dataMode === 'json-to-csv' ? '.json,application/json' : '.csv,text/csv'}
        onchange={onFileInput}
        class="w-full cursor-pointer rounded-lg border border-[var(--color-border)]
          bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[#94a3b8]
          file:mr-3 file:rounded file:border-0 file:bg-[var(--color-accent)]/20
          file:px-3 file:py-1 file:text-xs file:text-[var(--color-accent-light)]"
      />
      <p class="text-xs text-[var(--color-muted)]">Or paste your content below:</p>
      <textarea
        bind:value={textInput}
        rows="5"
        placeholder={dataMode === 'json-to-csv' ? '[{"name":"Alice","age":30},...]' : 'name,age\nAlice,30\n...'}
        class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]
          px-3 py-2 font-mono text-xs text-[#e2e8f0] placeholder-[var(--color-muted)] outline-none
          focus:border-[var(--color-accent)]"
      ></textarea>
    </div>

  {:else if mode === 'markdown'}
    <div class="space-y-2">
      <input
        type="file"
        accept=".md,.markdown,text/markdown"
        onchange={onFileInput}
        class="w-full cursor-pointer rounded-lg border border-[var(--color-border)]
          bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[#94a3b8]
          file:mr-3 file:rounded file:border-0 file:bg-[var(--color-accent)]/20
          file:px-3 file:py-1 file:text-xs file:text-[var(--color-accent-light)]"
      />
      <p class="text-xs text-[var(--color-muted)]">Or paste Markdown below:</p>
      <textarea
        bind:value={textInput}
        rows="6"
        placeholder="# Hello World&#10;&#10;**Bold**, *italic*, `code`..."
        class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]
          px-3 py-2 font-mono text-xs text-[#e2e8f0] placeholder-[var(--color-muted)] outline-none
          focus:border-[var(--color-accent)]"
      ></textarea>
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

  <button
    onclick={convert}
    disabled={converting}
    class="w-full rounded-xl bg-[var(--color-accent)] py-3 font-medium text-white
      transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {#if converting}
      <svg class="mx-auto size-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    {:else}
      Convert
    {/if}
  </button>

  {#if result}
    <div class="rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-4">
      <p class="mb-3 text-sm font-medium text-[var(--color-success)]">✓ Conversion complete</p>

      {#if previewHtml && mode === 'markdown'}
        <div
          class="prose prose-invert mb-3 max-h-48 overflow-y-auto rounded-lg bg-[var(--color-surface-2)] p-3 text-xs"
        >
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html previewHtml}
        </div>
      {/if}

      {#if result.text && mode !== 'markdown'}
        <pre class="mb-3 max-h-36 overflow-auto rounded-lg bg-[var(--color-surface-2)] p-3 text-xs text-[#94a3b8]">{result.text.slice(0, 500)}{result.text.length > 500 ? '\n...' : ''}</pre>
      {/if}

      <button
        onclick={download}
        class="flex items-center gap-2 rounded-lg border border-[var(--color-success)]/40
          px-4 py-2 text-sm font-medium text-[var(--color-success)]
          transition-all hover:bg-[var(--color-success)]/10"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download {result.name}
      </button>
    </div>
  {/if}
</div>
