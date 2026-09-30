import { http, HttpResponse } from "msw/http";
import { ws } from "msw/ws";
import { sse } from "msw/sse";
import { setupWorker } from "msw/browser";
import { graphql } from "graphql";

export const worker = setupWorker(
  http.get("/user", () => {
    return HttpResponse.json({ name: "John" });
  }),
);
