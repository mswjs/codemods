import renameRestNamespace, {
  httpNamespaceMethods,
} from '../src/rename-rest-namespace'
import { transform } from './helpers'

const t = transform(renameRestNamespace, {})

it.each(httpNamespaceMethods)(`renames "rest.%s" method call`, (method) => {
  expect(t(`rest.${method}('/resource', (req, res, ctx) => {})`)).toBe(
    `http.${method}('/resource', (req, res, ctx) => {})`,
  )
})
