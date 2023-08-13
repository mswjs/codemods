import { applyTransform } from 'jscodeshift/src/testUtils'
import renameImports from '../src/rename-imports'

describe('rename "rest" import', () => {
  function transform(source: string): string {
    return applyTransform(renameImports, {}, { source })
  }

  it('renames a single "rest" import to "http"', () => {
    expect(transform(`import { rest } from 'msw'`)).toBe(
      `import { http } from 'msw'`,
    )
  })

  it('renames "rest" to "http" in multiple imports', () => {
    expect(transform(`import { rest, context } from 'msw'`)).toBe(
      `import { http, context } from 'msw'`,
    )

    expect(transform(`import { context, rest } from 'msw'`)).toBe(
      `import { context, http } from 'msw'`,
    )
  })

  it('ignores "rest" imports from irrelevant sources', () => {
    expect(transform(`import { rest } from 'other'`)).toBe(
      `import { rest } from 'other'`,
    )
  })
})
