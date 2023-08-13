import { Transform } from 'jscodeshift'

export const httpNamespaceMethods = [
  'all',
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
]

const transformer: Transform = (file, api) => {
  const j = api.jscodeshift
  const root = j(file.source)

  const httpCalls = root.find(j.CallExpression, {
    callee: {
      object: {
        type: 'Identifier',
        name: 'rest',
      },
    },
  })

  httpCalls.forEach((callExpression) => {
    if (
      callExpression.value.callee.type === 'MemberExpression' &&
      callExpression.value.callee.object.type === 'Identifier' &&
      callExpression.value.callee.property.type === 'Identifier' &&
      httpNamespaceMethods.includes(callExpression.value.callee.property.name)
    ) {
      callExpression.value.callee.object.name = 'http'
    }
  })

  return root.toSource()
}

export default transformer
