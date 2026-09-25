import { http, HttpResponse, ws, sse } from "msw";
import { setupWorker } from "msw/browser";
import { graphql } from "graphql";

export const worker = setupWorker(
  http.get("/user", () => {
    return HttpResponse.json({ name: "John" });
  }),
);
