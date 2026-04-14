<script lang="ts">
  import { auth } from '$lib/firebase';
  import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';

  let loading = $state(false);
  let error = $state('');

  // Redirect if already logged in
  $effect(() => {
    if (!authStore.loading && authStore.user) {
      goto('/dashboard');
    }
  });

  async function loginWithGoogle() {
    loading = true;
    error = '';
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      goto('/dashboard');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Sign in failed';
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign in — Shorty</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-65px)] items-center justify-center px-4">
  <div class="w-full max-w-sm">
    <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
      <div class="mb-6">
        <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--color-accent)]/20">
          <span class="text-2xl font-bold text-[var(--color-accent-light)]">S</span>
        </div>
        <h1 class="text-xl font-bold text-[#e2e8f0]">Welcome to Shorty</h1>
        <p class="mt-1 text-sm text-[var(--color-muted)]">
          Sign in to create links, upload files, and view your analytics.
        </p>
      </div>

      <button
        onclick={loginWithGoogle}
        disabled={loading}
        class="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border)]
          bg-[var(--color-surface-2)] px-4 py-3 text-sm font-medium text-[#e2e8f0]
          transition-all hover:border-[var(--color-muted)] hover:bg-[var(--color-surface-2)]
          disabled:cursor-not-allowed disabled:opacity-50"
      >
        {#if loading}
          <svg class="size-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Signing in...
        {:else}
          <svg viewBox="0 0 24 24" class="size-5" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        {/if}
      </button>

      {#if error}
        <p class="mt-4 text-sm text-[var(--color-danger)]">{error}</p>
      {/if}

      <p class="mt-6 text-xs text-[var(--color-muted)]">
        Free to use. No credit card required.
      </p>
    </div>
  </div>
</div>
