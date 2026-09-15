import { useUserStore } from '../store/userStore'

export function useUser() {
  return useUserStore().user
}
