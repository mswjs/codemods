import { setupServer } from "msw/node";

export const server = setupServer();

server.listen({
  onUnhandledRequest(request, print) {
    if (request.url.includes("/health")) {
      return;
    }

    console.log(`Oops, unhandled ${request.method} ${request.url}`);
    print.warning();
  },
});
