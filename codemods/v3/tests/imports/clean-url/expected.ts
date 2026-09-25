import { matchRequestUrl } from 'msw'
import { getCleanUrlString } from 'msw/utils/get-clean-url-string'

export function normalize(url: string) {
  const cleanUrlString = getCleanUrlString(url)
  return matchRequestUrl(new URL(cleanUrlString), '/user/:id')
}
