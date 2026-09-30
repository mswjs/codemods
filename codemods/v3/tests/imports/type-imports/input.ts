import type { GraphQLQuery, GraphQLLinkHandlers, HttpHandler } from "msw";
import { graphql, type GraphQLVariables, HttpResponse } from "msw";

export function createApi(url: string): GraphQLLinkHandlers {
  return graphql.link(url);
}

export const handlers: Array<HttpHandler> = [];

export function mock<Query extends GraphQLQuery, Variables extends GraphQLVariables>(
  api: GraphQLLinkHandlers,
) {
  return api.query<Query, Variables>("GetUser", () => {
    return HttpResponse.json({ data: {} });
  });
}
