import { mocks } from './browser'

export async function stopMocks() {
  await mocks.stop()
}
