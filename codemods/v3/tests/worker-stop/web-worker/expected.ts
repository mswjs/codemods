import { setupWorker } from 'msw/browser'

const mocks = setupWorker()
const worker = new Worker('./sw.js')

export async function stopAll() {
  await mocks.stop()
  worker.stop()
}
