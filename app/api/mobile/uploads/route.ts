// The same upload endpoint as /api/uploads, re-exported under /api/mobile so
// it picks up the CORS handling in proxy.ts — which is scoped to
// /api/mobile/** and nothing else. The handler already accepts a Bearer token
// as well as a session cookie, so there is nothing to duplicate here.
export { POST } from "@/app/api/uploads/route";
