import { type PathParams } from "msw";
import { delay } from "msw/utils/delay";
import { bypass } from "msw/utils/bypass";
import { passthrough } from "msw/utils/passthrough";
import { setupServer } from "msw/node";
import { http } from "msw/http";

export const server = setupServer(
  http.get("/user", async ({ request, params }: { request: Request; params: PathParams }) => {
    await delay();
    return fetch(bypass(request));
  }),
  http.get("/health", () => passthrough()),
);
