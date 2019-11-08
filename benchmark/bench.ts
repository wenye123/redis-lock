import Benchmark from "@leizm/benchmark";
import redisLock from "../src/index";
import Redis from "ioredis";

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

const rlock = new redisLock({
  client: redis,
  keyPrefix: "bm:",
});

const report = {
  acquireLockSuccess: 0,
  acquireLockFail: 0,
  acquireSemaphoreSuccess: 0,
  acquireSemaphoreFail: 0,
};

// function sleep(ms: number): Promise<number> {
//   return new Promise(resolve => {
//     setTimeout(resolve, ms);
//   });
// }

const bench = new Benchmark({
  title: "redisLock",
  seconds: 5,
  concurrent: 200,
});

bench
  .addAsync("lock", async () => {
    const lockName = "block";
    const ident = await rlock.acquireLock(lockName);
    if (ident !== null) {
      // await sleep(100); // 模拟100毫秒业务
      await rlock.releaseLock(lockName, ident);
      report.acquireLockSuccess++;
    } else {
      report.acquireLockFail++;
    }
  })
  .addAsync("semaphore", async () => {
    const sename = "bsename";
    const ident = await rlock.acquireSemaphore(sename, 1);
    if (ident !== null) {
      // await sleep(100); // 模拟100毫秒业务
      await rlock.releaseSemaphore(sename, ident);
      report.acquireSemaphoreSuccess++;
    } else {
      report.acquireSemaphoreFail++;
    }
  })
  .run()
  .then(r => {
    bench.print(r);
    console.log(report);
  });
