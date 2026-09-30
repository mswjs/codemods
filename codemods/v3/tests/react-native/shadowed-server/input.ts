import { setupServer } from 'msw/native'

const server = setupServer()

const network = createNetwork()
network.close()

function startDevServer() {
  const server = app.listen(3000)
  server.close()
}

server.listen({ onUnhandledRequest: 'bypass' })
