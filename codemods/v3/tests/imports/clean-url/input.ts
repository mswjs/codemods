import { cleanUrl, matchRequestUrl } from 'msw'

export function normalize(url: string) {
  const cleanUrlString = cleanUrl(url)
  return matchRequestUrl(new URL(cleanUrlString), '/user/:id')
}
