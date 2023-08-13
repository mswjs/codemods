import {
  ASTPath,
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  Transform,
} from 'jscodeshift'

type AnyImportSpecifier =
  | ImportSpecifier
  | ImportDefaultSpecifier
  | ImportNamespaceSpecifier

const transformer: Transform = (file, api) => {
  const j = api.jscodeshift
  const root = j(file.source)

  const rewriteImportSpecifiers = (
    importDeclaration: ASTPath<ImportDeclaration>,
    nextImportSpecifiers: Array<AnyImportSpecifier>,
  ): void => {
    importDeclaration.value.specifiers = nextImportSpecifiers

    if (nextImportSpecifiers.length === 0) {
      j(importDeclaration).remove()
    }
  }

  const mswImportDeclarations = root
    .find(j.ImportDeclaration, {
      source: { value: 'msw' },
    })
    .filter((importDeclaration) => {
      return !!importDeclaration.value.specifiers
    })

  /**
   * Rename `rest` imports to `http`.
   */
  mswImportDeclarations.forEach((importDeclaration) => {
    if (!importDeclaration.value?.specifiers) {
      return
    }

    for (const importSpecifier of importDeclaration.value.specifiers) {
      if (
        isImportSpecifier(importSpecifier) &&
        importSpecifier.imported.name === 'rest'
      ) {
        importSpecifier.imported.name = 'http'
      }
    }
  })

  /**
   * Remove deprecated imports.
   */
  const deprecatedImports = ['response', 'context']

  mswImportDeclarations.forEach((importDeclaration) => {
    if (!importDeclaration.value?.specifiers) {
      return
    }

    const importSpecifiers = importDeclaration.value.specifiers
    const nextSpecifiers = importSpecifiers.filter((importSpecifier) => {
      return (
        isImportSpecifier(importSpecifier) &&
        !deprecatedImports.includes(importSpecifier.imported.name)
      )
    })

    rewriteImportSpecifiers(importDeclaration, nextSpecifiers)
  })

  /**
   * Moves worker imports to "msw/browser".
   */
  const workerImports = [
    'setupWorker',
    'SetupWorker',
    'SetupWorkerApi',
    'StartOptions',
  ]

  mswImportDeclarations.forEach((importDeclaration) => {
    if (!importDeclaration.value?.specifiers) {
      return
    }

    const importSpecifiers = importDeclaration.value.specifiers || []

    const workerImportSpecifiers: Array<ImportSpecifier> = []
    const nextImportSpecifiers: Array<AnyImportSpecifier> = []

    importSpecifiers.forEach((importSpecifier) => {
      if (
        isImportSpecifier(importSpecifier) &&
        workerImports.includes(importSpecifier.imported.name)
      ) {
        return workerImportSpecifiers.push(importSpecifier)
      }

      nextImportSpecifiers.push(importSpecifier)
    })

    rewriteImportSpecifiers(importDeclaration, nextImportSpecifiers)

    if (workerImportSpecifiers.length > 0) {
      const mswBrowserImport = j.importDeclaration(
        workerImportSpecifiers,
        j.literal('msw/browser'),
      )

      j(importDeclaration).insertAfter(mswBrowserImport)
    }
  })

  return root.toSource()
}

function isImportSpecifier(
  value: AnyImportSpecifier,
): value is ImportSpecifier {
  return 'imported' in value
}

export default transformer
