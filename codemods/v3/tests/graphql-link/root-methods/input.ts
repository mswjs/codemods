import { graphql as gql, HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'

interface GetUserQuery {
  user: { name: string }
}

export const handlers = [
  gql.query<GetUserQuery, { id: string }>('GetUser', ({ variables }) => {
    return HttpResponse.json({ data: { user: { name: variables.id } } })
  }),
  gql.mutation('DeleteUser', () => {
    return HttpResponse.json({ data: { deleted: true } })
  }),
  graphql.operation(() => {
    return HttpResponse.json({ data: {} })
  }),
]
