
import { useSession } from "@/src/components/session-provider";

export function useAuth() {
  return useSession();
}
