import { setupServer } from 'msw/node'

const server = setupServer()
const bus = {
  events: {
    on(_event: string, _listener: () => void) {},
    removeListener(_event: string, _listener: () => void) {},
  },
}

server.events.on('connection', () => {})
bus.events.on('connection', () => {})
bus.events.removeListener('connection', () => {})
