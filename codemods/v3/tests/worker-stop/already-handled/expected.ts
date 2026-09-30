import { worker } from './mocks/browser'

afterAll(() => worker.stop())
afterAll(async () => {
  await worker.stop()
})
afterAll(() => {
  return worker.stop()
})
afterAll(() => {
  void worker.stop()
})
const stopped = worker.stop()
worker.stop().then(() => {})
function* generate() {
  worker.stop()
}
