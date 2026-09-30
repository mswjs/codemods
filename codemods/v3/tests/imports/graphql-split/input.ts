import { http, graphql, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'

export const server = setupServer(
  http.get('/user', async () => {
    await delay()
    return HttpResponse.json({ name: 'John' })
  }),
  graphql.link('https://api.example.com').query('GetUser', () => {
    return HttpResponse.json({ data: { user: { name: 'John' } } })
  }),
)
