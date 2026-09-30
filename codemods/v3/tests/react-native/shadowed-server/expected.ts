import { network } from '@msw/react-native'

const server = network

const network = createNetwork()
network.close()

function startDevServer() {
  const server = app.listen(3000)
  server.close()
}

server.configure({ onUnhandledRequest: 'bypass' })
server.enable()
