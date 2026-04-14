<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { auth } from '$lib/firebase';
  import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  async function login() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    goto('/dashboard');
  }

  async function logout() {
    await signOut(auth);
    goto('/');
  }
</script>

<nav class="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
  <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
    <a href="/" class="flex items-center gap-2 text-xl font-bold tracking-tight">
      <span class="rounded-lg bg-[var(--color-accent)] px-2 py-0.5 text-white">S</span>
      <span class="text-[#e2e8f0]">horty</span>
    </a>

    <div class="flex items-center gap-4">
      {#if !authStore.loading}
        {#if authStore.user}
          <a
            href="/dashboard"
            class="text-sm font-medium text-[#94a3b8] transition-colors hover:text-[#e2e8f0]
              {page.url.pathname === '/dashboard' ? 'text-[var(--color-accent-light)]' : ''}"
          >
            Dashboard
          </a>
          {#if authStore.user.uid === import.meta.env.VITE_ADMIN_UID}
            <a
              href="/admin"
              class="text-sm font-medium text-[#94a3b8] transition-colors hover:text-[var(--color-accent-light)]
                {page.url.pathname === '/admin' ? 'text-[var(--color-accent-light)]' : ''}"
            >
              Admin
            </a>
          {/if}
          <button
            onclick={logout}
            class="flex items-center gap-2 rounded-lg border border-[var(--color-border)]
              px-3 py-1.5 text-sm text-[#94a3b8] transition-all hover:border-[var(--color-muted)]
              hover:text-[#e2e8f0]"
          >
            <img
              src={authStore.user.photoURL ?? ''}
              alt="avatar"
              class="size-5 rounded-full"
              onerror={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
            Sign out
          </button>
        {:else}
          <button
            onclick={login}
            class="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-1.5
              text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <svg viewBox="0 0 24 24" class="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        {/if}
      {/if}
    </div>
  </div>
</nav>
