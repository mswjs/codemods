import { setupWorker } from 'msw/browser'

const mocks = setupWorker()
const worker = new Worker('./sw.js')

export function stopAll() {
  mocks.stop()
  worker.stop()
}
