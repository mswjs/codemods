import { graphql, HttpResponse } from "msw/graphql";

const github = graphql.link("https://api.github.com/graphql");
const anyApi = graphql.link("*");

export const handlers = [
  github.query("GetRepo", () => HttpResponse.json({ data: {} })),
  anyApi.mutation("Login", () => HttpResponse.json({ data: {} })),
  graphql.link("*").operation(() => HttpResponse.json({ data: {} })),
];
