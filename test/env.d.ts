declare namespace Cloudflare {
  interface Env {
    LOCAL_D1: Fetcher;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
