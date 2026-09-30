import { setupServer } from "msw/node";

export const server = setupServer();

server.listen({
  onUnhandledRequest: (request, print) => {
    const config = { onUnhandledRequest: "ignore" };
    console.log(request.url, config);
    print.warning();
  },
  nested: {
    onUnhandledRequest: "error",
  },
});
