import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';

// Placeholder hook - backend method not yet implemented
export function useCanCreateTaskUI() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['canCreateTaskUI'],
    queryFn: async () => {
      if (!actor) return false;
      // Backend method canCreateTaskUI() not yet implemented
      return false;
    },
    enabled: !!actor && !isFetching,
  });
}
