import { http as caller, HttpHandler, HttpResponse } from "msw";

const handlers: HttpHandler[] = [
  caller.get("/user", () => {
    return HttpResponse.json({ firstName: "John" });
  }),
];
