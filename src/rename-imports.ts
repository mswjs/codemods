import type { Transform } from 'jscodeshift'

const transformer: Transform = (file, api) => {
  const j = api.jscodeshift
  const root = j(file.source)

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
    for (const importSpecifier of importDeclaration.value.specifiers!) {
      if (
        'imported' in importSpecifier &&
        importSpecifier.imported.name === 'rest'
      ) {
        importSpecifier.imported.name = 'http'
      }
    }
  })

  return root.toSource()
}

export default transformer
