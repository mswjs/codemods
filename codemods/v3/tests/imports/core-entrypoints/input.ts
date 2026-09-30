import { http, HttpResponse } from 'msw/core/http'
import { ws } from "msw/core/ws"
import { graphql, type GraphQLLinkHandlers as Link } from 'msw/core/graphql'
import 'msw/core/http'

export const api: Link = graphql.link('*')
export const chat = ws.link('wss://chat.example.com')
export const user = http.get('/user', () => HttpResponse.json({}))
