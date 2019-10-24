import redisLock from "../src/index";
import Redis from "ioredis";
import { assert } from "chai";

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

const rlock = new redisLock({
  client: redis,
  keyPrefix: "mt:",
});

describe("test", function() {
  describe("lock", function() {
    let lockName = "tlock";
    let identifier: string | null = null;
    it("acquireLock", async function() {
      identifier = await rlock.acquireLock(lockName);
      assert.notStrictEqual(identifier, null);
    });
    it("releaseLock", async function() {
      const success = await rlock.releaseLock(lockName, identifier as string);
      assert.strictEqual(success, true);
    });
  });

  describe("acquireSemaphore", function() {
    let sename = "tsename";
    let identifier: string | null = null;
    it("acquireSemaphore", async function() {
      // 第一个可以拿到
      identifier = await rlock.acquireSemaphore(sename, 1);
      assert.notStrictEqual(identifier, null);
      // 第二个拿不到
      const ident = await rlock.acquireSemaphore(sename, 1);
      assert.strictEqual(ident, null);
    });
    it("refreshSemaphore", async function() {
      const success = await rlock.refreshSemaphore(sename, identifier as string);
      assert.strictEqual(success, true);
    });
    it("releaseSemaphore", async function() {
      const success = await rlock.releaseSemaphore(sename, identifier as string);
      assert.strictEqual(success, true);
    });
  });
});
