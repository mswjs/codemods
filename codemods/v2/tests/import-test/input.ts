import { rest as caller, RestHandler } from "msw";

const handlers: RestHandler[] = [
  caller.get("/user", (req, res, ctx) => {
    return res(ctx.json({ firstName: "John" }));
  }),
];
