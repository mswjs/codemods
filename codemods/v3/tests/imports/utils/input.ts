import { delay, bypass, passthrough, type PathParams } from "msw";
import { setupServer } from "msw/node";
import { http } from "msw/http";

export const server = setupServer(
  http.get("/user", async ({ request, params }: { request: Request; params: PathParams }) => {
    await delay();
    return fetch(bypass(request));
  }),
  http.get("/health", () => passthrough()),
);
