import { graphql } from 'graphql-tag'
import { http } from 'msw'

export const query = graphql.query('GetUser')
export const handler = http.get('/user', () => new Response())
