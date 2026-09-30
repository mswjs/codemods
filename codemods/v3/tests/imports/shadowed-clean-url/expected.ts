import { matchRequestUrl } from 'msw'
import { getCleanUrlString } from 'msw/utils/get-clean-url-string'

export function normalize(url: string) {
  return getCleanUrlString(url)
}

function debug(cleanUrl: string) {
  return cleanUrl.trim()
}
