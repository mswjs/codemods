import { network } from '@msw/react-native'
import { handlers } from './handlers'

export const server = network
network.configure({ handlers: [...handlers] })

beforeAll(() => {
  server.configure({ onUnhandledRequest: 'error' })
  server.enable()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.disable()
})
