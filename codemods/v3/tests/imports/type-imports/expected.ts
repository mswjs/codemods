import type { HttpHandler } from "msw/http";
import type { GraphQLQuery, GraphQLLink } from "msw/graphql";
import { HttpResponse } from "msw/http";
import { graphql, type GraphQLVariables } from "msw/graphql";

export function createApi(url: string): GraphQLLink {
  return graphql.link(url);
}

export const handlers: Array<HttpHandler> = [];

export function mock<Query extends GraphQLQuery, Variables extends GraphQLVariables>(
  api: GraphQLLink,
) {
  return api.query<Query, Variables>("GetUser", () => {
    return HttpResponse.json({ data: {} });
  });
}
