import { setupServer } from 'msw/node'

export const server = setupServer()

beforeAll(() => server.listen())
afterAll(() => server.close())
