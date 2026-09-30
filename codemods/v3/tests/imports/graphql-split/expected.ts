import { http, HttpResponse } from 'msw/http'
import { graphql } from 'msw/graphql'
import { delay } from 'msw/utils/delay'
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
