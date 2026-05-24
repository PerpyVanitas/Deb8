import { inngest } from "./client";

export const helloFn = inngest.createFunction(
  { id: "hello-fn" },
  { event: "test/hello" },
  async ({ event }) => {
    console.log("Hello:", event);
    return { message: "Hello from Inngest!" };
  }
);
