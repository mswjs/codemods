import { HttpResponse, delay } from 'msw'
import { http } from 'msw/http'
import type { GraphQLQuery } from 'msw'
import { type GraphQLVariables, graphql } from 'msw/graphql'

export const handler = http.get('/user', async () => {
  await delay()
  return HttpResponse.json({ name: 'John' })
})

export const api = graphql.link('*')
export type Query = GraphQLQuery
export type Variables = GraphQLVariables
