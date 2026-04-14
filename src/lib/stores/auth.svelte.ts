import type { User } from 'firebase/auth';

export const authStore = $state<{
  user: User | null;
  loading: boolean;
}>({
  user: null,
  loading: true,
});
