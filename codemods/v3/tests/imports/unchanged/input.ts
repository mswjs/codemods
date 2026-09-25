import { matchRequestUrl, RequestHandler, type PathParams, type SharedOptions } from "msw";
import { http } from "msw/http";
import { delay, type DelayMode } from "msw/utils/delay";
import { setupServer } from "msw/node";

export const options: SharedOptions = { onUnhandledFrame: "bypass" };
export const server = setupServer(http.get("/user", () => new Response()));
