// Pure read-only-demo guard (no Next imports, so it's unit-testable under node:test).
// Re-exported from @/lib/auth for the mutating server actions.
import type { Account } from "@/lib/auth";

/** Thrown when a read-only demo session attempts a write. */
export class ReadOnlyDemoError extends Error {
  constructor() {
    super("This is a read-only demo. Request full access to make changes.");
    this.name = "ReadOnlyDemoError";
  }
}

/** Guard for mutating server actions: throws on a demo or absent session.
 *  Narrows `account` to a writable Account on success. */
export function assertWritable(account: Account | null): asserts account is Account {
  if (!account || account.demo) throw new ReadOnlyDemoError();
}
