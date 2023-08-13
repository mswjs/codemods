import { applyTransform } from 'jscodeshift/src/testUtils'
import renameImports from '../src/rename-imports'

function transform(source: string): string {
  return applyTransform(renameImports, {}, { source })
}

describe('renames the "rest" import to "http"', () => {
  it('renames a single "rest" import', () => {
    expect(transform(`import { rest } from 'msw'`)).toBe(
      `import { http } from 'msw'`,
    )
  })

  it('renames "rest" among other imports', () => {
    expect(transform(`import { rest, foo } from 'msw'`)).toBe(
      `import { http, foo } from 'msw'`,
    )

    expect(transform(`import { foo, rest } from 'msw'`)).toBe(
      `import { foo, http } from 'msw'`,
    )
  })

  it('ignores "rest" imports from irrelevant sources', () => {
    expect(transform(`import { rest } from 'other'`)).toBe(
      `import { rest } from 'other'`,
    )
  })
})

describe('removes deprecated imports', () => {
  it('removes the entire import if only deprecated imports are present', () => {
    expect(transform(`import { response } from 'msw'`)).toBe(``)
    expect(transform(`import { context } from 'msw'`)).toBe(``)
    expect(transform(`import { response, context } from 'msw'`)).toBe(``)
  })

  it('removes "response" import', () => {
    expect(transform(`import { foo, response } from 'msw'`)).toBe(
      `import { foo } from 'msw';`,
    )
    expect(transform(`import { foo, response, bar } from 'msw'`)).toBe(
      `import { foo, bar } from 'msw';`,
    )
  })

  it('removes "context" import', () => {
    expect(transform(`import { foo, context } from 'msw'`)).toBe(
      `import { foo } from 'msw';`,
    )
    expect(transform(`import { foo, context, bar } from 'msw'`)).toBe(
      `import { foo, bar } from 'msw';`,
    )
  })
})

describe('adds "msw/browser" import', () => {
  it('moves "setupWorker" import to "msw/browser"', () => {
    expect(transform(`import { setupWorker, rest } from 'msw'`)).toBe(
      `\
import { http } from 'msw';
import { setupWorker } from "msw/browser";`,
    )
  })

  it('moves worker types import to "msw/browser"', () => {
    expect(
      transform(
        `import { SetupWorker, rest, SetupWorkerApi, StartOptions } from 'msw'`,
      ),
    ).toBe(
      `\
import { http } from 'msw';
import { SetupWorker, SetupWorkerApi, StartOptions } from "msw/browser";`,
    )
  })
})
