import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';

export function useCanCreateTaskUI() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['canCreateTaskUI'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.canCreateTaskUI();
    },
    enabled: !!actor && !isFetching,
  });
}
