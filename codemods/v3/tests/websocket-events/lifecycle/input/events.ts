import { ws } from 'msw'
import { server } from './server'
import { worker } from "./worker"

const chat = ws.link('wss://chat.example.com')

chat.addEventListener('connection', ({ client }) => {
  client.send('hello')
})

server.events.on('connection', ({ client }) => {
  console.log('connected', client.url)
})
worker.events.on("connection", () => {})
server.events.removeListener('connection', listener)
server.events.on('request:start', ({ request }) => {
  console.log(request.method, request.url)
})
emitter.on('connection', () => {})
