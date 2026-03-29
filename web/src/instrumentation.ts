export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAllWorkers } = await import("./workers/index");
    await startAllWorkers();
  }
}
