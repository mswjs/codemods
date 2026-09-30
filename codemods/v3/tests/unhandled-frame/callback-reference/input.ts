import { setupServer } from "msw/node";

export const server = setupServer();

function handleUnhandled(request, print) {
  console.log(request.url);
  print.warning();
}

function handleBoth(request, print) {
  console.log(request.url);
  print.warning();
}

server.listen({ onUnhandledRequest: handleUnhandled });
server.listen({ onUnhandledRequest: handleBoth });
handleBoth(new Request("https://example.com"), { warning() {} });
