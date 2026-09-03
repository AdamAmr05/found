import { createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { api } from '../convex/_generated/api'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL
  if (!convexUrl) {
    throw new Error('VITE_CONVEX_URL is required')
  }
  const convexQueryClient = new ConvexQueryClient(convexUrl)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        gcTime: 5000,
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: (err) => <p>{err.error.stack}</p>,
    defaultNotFoundComponent: () => <p>not found</p>,
    Wrap: ({ children }) => (
      <ConvexAuthProvider
        api={{
          refreshSession: api.auth.refreshSession,
          signOut: api.auth.signOut,
        }}
        client={convexQueryClient.convexClient}
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ConvexAuthProvider>
    ),
  })

  return router
}
