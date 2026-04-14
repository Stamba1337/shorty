<script lang="ts">
  import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
  import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
  import { storage, db } from '$lib/firebase';
  import { authStore } from '$lib/stores/auth.svelte';
  import { generateSlug } from '$lib/utils/slug';

  let { onCreated }: { onCreated: (slug: string) => void } = $props();

  let dragging = $state(false);
  let file = $state<File | null>(null);
  let progress = $state(0);
  let uploading = $state(false);
  let error = $state('');

  const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const dropped = e.dataTransfer?.files[0];
    if (dropped) selectFile(dropped);
  }

  function onFileInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) selectFile(f);
  }

  function selectFile(f: File) {
    error = '';
    if (f.size > MAX_SIZE) { error = 'File too large (max 50 MB)'; return; }
    file = f;
  }

  async function upload() {
    if (!file || !authStore.user) return;
    uploading = true;
    error = '';
    progress = 0;

    const slug = generateSlug();
    const storagePath = `uploads/${authStore.user.uid}/${slug}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      'state_changed',
      (snap) => { progress = (snap.bytesTransferred / snap.totalBytes) * 100; },
      (err) => { error = err.message; uploading = false; },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          await setDoc(doc(db, 'links', slug), {
            uid: authStore.user!.uid,
            type: 'file',
            destination: url,
            title: file!.name,
            createdAt: serverTimestamp(),
            expiresAt: null,
            maxClicks: null,
            clicks: 0,
            storageRef: storagePath,
            fileType: file!.type,
            fileSize: file!.size,
          });
          uploading = false;
          file = null;
          onCreated(slug);
        } catch (e) {
          error = e instanceof Error ? e.message : 'Upload failed';
          uploading = false;
        }
      }
    );
  }
</script>

<div class="space-y-4">
  <!-- Drop zone -->
  <div
    role="button"
    tabindex="0"
    class="relative w-full cursor-pointer rounded-xl border-2 border-dashed p-10 text-center
      transition-all
      {dragging
      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
      : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-muted)]'}"
    ondragover={(e) => { e.preventDefault(); dragging = true; }}
    ondragleave={() => (dragging = false)}
    ondrop={onDrop}
    onclick={() => !file && document.getElementById('file-input')?.click()}
    onkeydown={(e) => e.key === 'Enter' && !file && document.getElementById('file-input')?.click()}
  >
    <input
      id="file-input"
      type="file"
      class="hidden"
      onchange={onFileInput}
    />

    {#if file}
      <div class="flex flex-col items-center gap-2">
        <span class="text-3xl">📄</span>
        <p class="font-medium text-[#e2e8f0]">{file.name}</p>
        <p class="text-sm text-[var(--color-muted)]">{formatSize(file.size)}</p>
        <button
          onclick={(e) => { e.stopPropagation(); file = null; }}
          class="mt-1 text-xs text-[var(--color-danger)] hover:underline"
          type="button"
        >Remove</button>
      </div>
    {:else}
      <div class="flex flex-col items-center gap-2">
        <svg class="size-10 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <p class="font-medium text-[#94a3b8]">Drop a file here or click to browse</p>
        <p class="text-xs text-[var(--color-muted)]">Any file type · Max 50 MB</p>
      </div>
    {/if}
  </div>

  <!-- Progress bar -->
  {#if uploading}
    <div class="space-y-1">
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          class="h-full rounded-full bg-[var(--color-accent)] transition-all"
          style="width: {progress}%"
        ></div>
      </div>
      <p class="text-right text-xs text-[var(--color-muted)]">{progress.toFixed(0)}%</p>
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
    onclick={upload}
    disabled={!file || uploading || !authStore.user}
    class="w-full rounded-xl bg-[var(--color-accent)] py-3 font-medium text-white transition-all
      hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
  >
    {uploading ? 'Uploading...' : 'Upload & Create Short Link'}
  </button>

  {#if !authStore.user && !authStore.loading}
    <p class="text-center text-sm text-[var(--color-muted)]">
      <a href="/login" class="text-[var(--color-accent-light)] hover:underline">Sign in</a> to upload files
    </p>
  {/if}
</div>
