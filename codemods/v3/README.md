This codemod migrates your project from MSW v2 to v3, handling the following breaking changes:

1. Moves the protocol-specific imports from `msw` to the recommended entrypoints: `msw/http`, `msw/graphql`, `msw/ws`, and `msw/sse`
2. Moves the utilities (`delay`, `bypass`, `passthrough`, `isCommonAssetRequest`, `getCleanUrlString`) from `msw` to their `msw/utils/*` entrypoints
3. Rewrites the `msw/core/*` entrypoints to `msw/http`, `msw/graphql`, and `msw/ws`
4. Renames `GraphQLLinkHandlers` to `GraphQLLink` and `cleanUrl` to `getCleanUrlString`
5. Replaces the root-level `graphql.query()`, `graphql.mutation()`, and `graphql.operation()` with `graphql.link('*')`
6. Renames the `onUnhandledRequest` option to `onUnhandledFrame` and migrates custom callbacks to the `{ frame, defaults }` signature
7. Renames the `connection` life-cycle event to `websocket:connection`
8. Replaces `msw/native` with `@msw/react-native` (`setupServer()` becomes the `network` object)
9. Awaits `worker.stop()` and makes the enclosing function `async` if needed

### Example

```ts
// Before
import { http, graphql, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('/user', async () => {
    await delay()
    return HttpResponse.json({ name: 'John' })
  }),
  graphql.query('GetUser', () => HttpResponse.json({ data: {} })),
)

server.listen({
  onUnhandledRequest(request, print) {
    console.log(request.url)
    print.warning()
  },
})
```

```ts
// After
import { http, HttpResponse } from 'msw/http'
import { graphql } from 'msw/graphql'
import { delay } from 'msw/utils/delay'
import { setupServer } from 'msw/node'
import { HttpNetworkFrame } from 'msw/experimental'

const server = setupServer(
  http.get('/user', async () => {
    await delay()
    return HttpResponse.json({ name: 'John' })
  }),
  graphql.link('*').query('GetUser', () => HttpResponse.json({ data: {} })),
)

server.listen({
  onUnhandledFrame({ frame, defaults }) {
    if (!(frame instanceof HttpNetworkFrame)) {
      return
    }

    const request = frame.data.request
    console.log(request.url)
    defaults.warn()
  },
})
```

### Important Notes

⚠️ **Unhandled WebSocket connections**: The migrated `onUnhandledFrame` callback only handles HTTP frames. In v2, the callback received a synthetic `Request` for unhandled WebSocket connections. Extend the `frame instanceof HttpNetworkFrame` check if you need to react to WebSocket frames.

⚠️ **Custom `onUnhandledRequest` values**: The codemod migrates inline callbacks only. If you pass a callback reference (e.g. `onUnhandledRequest: handleUnhandled`), update that function to the new `({ frame, defaults }) => void` signature manually.

⚠️ **React Native**: The `msw/native` migration rewrites `server.listen()` and `server.close()` only in the file that calls `setupServer()`. Update the usages in other files manually: `server.listen(options)` becomes `server.configure(options)` followed by `server.enable()`, and `server.close()` becomes `server.disable()`. Install `@msw/react-native` and import it before `msw`.

⚠️ **`worker.stop()`**: The codemod awaits the `worker.stop()` statements for the worker created via `setupWorker()` in the same file or named `worker`. Statements that already return or await the call are left as they are. Update the other worker names manually.

⚠️ **`graphql` peer dependency**: `graphql` is now an optional peer dependency. Install it if you use `msw/graphql`.

### Manual Migration

The following changes cannot be safely automated. Review them after running the codemod:

- MSW v3 is ESM-only and requires Node.js 22+ and TypeScript 5.9+.
- Run `npx msw init` to (re)generate the worker script. The `postinstall` hook is removed.
- `handleRequest()` is removed. Use the `defineNetwork()` API from `msw/experimental` instead.
- `onUnhandledRequest()`, `UnhandledRequestStrategy`, `UnhandledRequestCallback`, `LifeCycleEventsMap`, `SetupApi`, and `StrictResponse` are no longer exported.
- `request.headers.get('cookie')` returns `null` in the handlers. Use the `cookies` resolver argument instead.
- Cookies are no longer managed in Node.js. The default behavior of your environment applies.
- `bypass()` removes the `Content-Length` request header.
- `setTimeout` is no longer patched. Advance fake timers for delayed mocked responses to resolve.
- `file://` requests and HTTP-to-WebSocket upgrade requests via `fetch()` throw in Node.js.

### Resources

- [MSW v3 release pull request](https://github.com/mswjs/msw/pull/2692)
- [MSW Migrations](https://mswjs.io/docs/migrations)

### License

MIT
