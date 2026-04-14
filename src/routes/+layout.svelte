<script lang="ts">
  import './layout.css';
  import Nav from '$lib/components/Nav.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { auth } from '$lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';

  let { children } = $props();

  $effect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      authStore.user = user;
      authStore.loading = false;
    });
    return unsub;
  });
</script>

<svelte:head>
  <title>Shorty — Shorten, Drop & Convert</title>
  <meta name="description" content="URL shortener with analytics, file hosting, and browser-based file conversion." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<Nav />
<main>
  {@render children()}
</main>
