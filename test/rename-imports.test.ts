import renameImports from '../src/rename-imports'
import { transform } from './helpers'

const t = transform(renameImports, {})

describe('renames the "rest" import to "http"', () => {
  it('renames a single "rest" import', () => {
    expect(t(`import { rest } from 'msw'`)).toBe(`import { http } from 'msw'`)
  })

  it('renames "rest" among other imports', () => {
    expect(t(`import { rest, foo } from 'msw'`)).toBe(
      `import { http, foo } from 'msw'`,
    )

    expect(t(`import { foo, rest } from 'msw'`)).toBe(
      `import { foo, http } from 'msw'`,
    )
  })

  it('ignores "rest" imports from irrelevant sources', () => {
    expect(t(`import { rest } from 'other'`)).toBe(
      `import { rest } from 'other'`,
    )
  })
})

describe('removes deprecated imports', () => {
  it('removes the entire import if only deprecated imports are present', () => {
    expect(t(`import { response } from 'msw'`)).toBe(``)
    expect(t(`import { context } from 'msw'`)).toBe(``)
    expect(t(`import { response, context } from 'msw'`)).toBe(``)
  })

  it('removes "response" import', () => {
    expect(t(`import { foo, response } from 'msw'`)).toBe(
      `import { foo } from 'msw';`,
    )
    expect(t(`import { foo, response, bar } from 'msw'`)).toBe(
      `import { foo, bar } from 'msw';`,
    )
  })

  it('removes "context" import', () => {
    expect(t(`import { foo, context } from 'msw'`)).toBe(
      `import { foo } from 'msw';`,
    )
    expect(t(`import { foo, context, bar } from 'msw'`)).toBe(
      `import { foo, bar } from 'msw';`,
    )
  })
})

describe('adds "msw/browser" import', () => {
  it('moves "setupWorker" import to "msw/browser"', () => {
    expect(t(`import { setupWorker, rest } from 'msw'`)).toBe(
      `\
import { http } from 'msw';
import { setupWorker } from "msw/browser";`,
    )
  })

  it('moves worker types import to "msw/browser"', () => {
    expect(
      t(
        `import { SetupWorker, rest, SetupWorkerApi, StartOptions } from 'msw'`,
      ),
    ).toBe(
      `\
import { http } from 'msw';
import { SetupWorker, SetupWorkerApi, StartOptions } from "msw/browser";`,
    )
  })
})
