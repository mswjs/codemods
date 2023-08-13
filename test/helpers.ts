import type { Transform } from 'jscodeshift'
import { applyTransform } from 'jscodeshift/src/testUtils'

export function transform(module: Transform, options = {}) {
  return (source: string): string => {
    return applyTransform(module, options, { source })
  }
}
