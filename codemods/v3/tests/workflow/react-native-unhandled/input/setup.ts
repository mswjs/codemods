import { setupServer } from "msw/native";

const server = setupServer();

beforeAll(() => {
  server.listen({
    onUnhandledRequest(request, print) {
      console.log(request.url);
      print.warning();
    },
  });
});
