import { setupWorker } from 'msw/browser'
import { http } from 'msw/http'

const mocks = setupWorker(http.get('/user', () => new Response()))

export async function stopMocks() {
  await mocks.stop()
}

export function stopSomethingElse() {
  recorder.stop()
}
