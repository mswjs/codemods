# @codemod/msw-v2

This codemod migrates your project from MSW v1 to v2, handling the breaking changes:

1- Updates import statements to new locations and names
2- Fixes generic type arguments order
3- Modernizes request object usage patterns
4- Replaces `ctx.fetch()` with new `fetch(bypass())` pattern
5- Updates passthrough method calls
6- Converts response patterns to new `HttpResponse` API
7- Updates handler callback signatures
8- Modernizes event callback signatures
9- Replaces deprecated handler printing methods


## Important Notes

⚠️ **Custom Factory Functions**: This codemod does not change signatures of MSW handlers when called through custom factory functions. You'll need to update these manually.

⚠️ **Request Body Usage**: If you were using `req.body`, the codemod assumes you want `await request.json()`. You may need to adjust for other body types manually.

⚠️ **Complete Migration**: This codemod performs all necessary transformations in the correct order to ensure your code properly migrates to MSW v2.


## Resources

- [MSW v2 Migration Guide](https://mswjs.io/docs/migrations/1.x-to-2.x)

## License

MIT
