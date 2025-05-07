import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 1000 * 60 * 10, // 10 minutes
      staleTime: 1000 * 60 * 5, // 5 minutes
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
    },
  },
});

interface IQueriesProvider {
  children: React.ReactNode;
}

export function QueriesProvider({ children }: IQueriesProvider) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
