import { getCleanUrlString, matchRequestUrl } from 'msw'

export function normalize(url: string) {
  const cleanUrlString = getCleanUrlString(url)
  return matchRequestUrl(new URL(cleanUrlString), '/user/:id')
}
