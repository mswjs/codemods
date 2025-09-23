import { bypass, http, HttpResponse } from "msw";

http.get("/user", async ({ request }) => {
  let req = request;
  const originalRequest = await fetch(bypass(req));
  return HttpResponse.json({ firstName: "John" });
});
