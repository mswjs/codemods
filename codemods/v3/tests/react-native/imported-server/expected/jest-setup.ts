import { server } from './setup'

beforeAll(() => {
  server.configure({ onUnhandledRequest: 'error' })
  server.enable()
})

afterAll(() => {
  server.disable()
})
