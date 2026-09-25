import { setupWorker } from 'msw/browser'
import { http } from 'msw/http'

const mocks = setupWorker(http.get('/user', () => new Response()))

export function stopMocks() {
  mocks.stop()
}

export function stopSomethingElse() {
  recorder.stop()
}
