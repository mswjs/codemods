import { graphql } from 'msw'

export const handlers = [
  graphql.link('*').query('GetUser', () => new Response()),
]

function load(graphql: { query(source: string): unknown }) {
  return graphql.query(source)
}
