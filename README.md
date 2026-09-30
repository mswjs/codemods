# Codemods

Official MSW codemods to help users adopt new features and handle breaking changes with ease.

Community contributions are welcome and appreciated! Check open issues for codemods to build, or open a new one if something’s missing. See the [contribution guide](./CONTRIBUTING.md) for details.

## Available codemods

| Codemod | Description |
| --- | --- |
| [`@mswjs/v3`](./codemods/v3) | Migrate from MSW v2 to v3 |
| [`@mswjs/v2`](./codemods/v2) | Migrate from MSW v1 to v2 |

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
npx codemod@latest @mswjs/v3
```

### From source

```bash
npx codemod workflow run -w /path/to/folder/containing/workflow.yaml
```

> \[!NOTE]
> By default, codemods run in the current folder. Add `-t /target/path` to change it.

See the [Codemod docs](https://go.codemod.com/cli-docs) for all CLI commands and options.

## License

MIT
