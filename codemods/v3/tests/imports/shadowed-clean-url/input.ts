import { cleanUrl, matchRequestUrl } from 'msw'

export function normalize(url: string) {
  return cleanUrl(url)
}

function debug(cleanUrl: string) {
  return cleanUrl.trim()
}
