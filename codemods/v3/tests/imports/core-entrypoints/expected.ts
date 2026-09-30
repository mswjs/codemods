import { http, HttpResponse } from 'msw/http'
import { ws } from "msw/ws"
import { graphql, type GraphQLLink as Link } from 'msw/graphql'
import 'msw/http'

export const api: Link = graphql.link('*')
export const chat = ws.link('wss://chat.example.com')
export const user = http.get('/user', () => HttpResponse.json({}))
