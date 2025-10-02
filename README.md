
Official MSW codemods to help users adopt new features and handle breaking changes with ease.

Community contributions are welcome and appreciated! Check open issues for codemods to build, or open a new one if something’s missing. See the [contribution guide](./CONTRIBUTING.md) for details.

## Available Codemods

The MSW v1 to v2 migration consists of multiple individual codemods and a migration workflow that runs them in the correct order.

- **[Migration Workflow](https://app.codemod.com/registry/@mswjs/v2)** - Runs the MSW codemods in sequence
- **[Type Arguments](https://app.codemod.com/registry/msw/2/type-args)** - Updates generic type interface of `rest.method()` calls
- **[Imports](https://app.codemod.com/registry/msw/2/imports)** - Updates import statements to new locations and names
- **[Request Changes](https://app.codemod.com/registry/msw/2/request-changes)** - Modernizes request object usage patterns
- **[Response Usages](https://app.codemod.com/registry/msw/2/response-usages)** - Converts response patterns to new `HttpResponse` API
- **[Callback Signature](https://app.codemod.com/registry/msw/2/callback-signature)** - Updates handler callback signatures
- **[CTX Fetch](https://app.codemod.com/registry/msw/2/ctx-fetch)** - Replaces `ctx.fetch()` with new `fetch(bypass())` pattern
- **[Request Passthrough](https://app.codemod.com/registry/msw/2/req-passthrough)** - Updates passthrough method calls
- **[Lifecycle Signature](https://app.codemod.com/registry/msw/2/lifecycle-signature)** - Modernizes event callback signatures
- **[Print Handler](https://app.codemod.com/registry/msw/2/print-handler)** - Replaces deprecated handler printing methods

## Running codemods
> [!CAUTION]
> Codemods modify code! Run them only on Git-tracked files, and commit or stash changes first.

### From the registry
Recommended for the best UX. This downloads the package from the [Registry](https://app.codemod.com/registry).

```bash
npx codemod@latest <codemod-name>
```

For example:

```bash
npx codemod@latest @mswjs/v2
```

### From source

```bash
npx codemod workflow run -w /path/to/folder/containing/workflow.yaml
```

> [!NOTE]
> By default, codemods run in the current folder. Add `-t /target/path` to change it.

See the [Codemod docs](https://go.codemod.com/cli-docs) for all CLI commands and options.

## License

MIT
