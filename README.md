# redis-lock

[![Build Status](https://travis-ci.org/wenye123/redis-lock.svg?branch=master)](https://travis-ci.org/wenye123/redis-lock)

简单的 redis 分布式锁

## 安装

```bash
npm i -S @wenye123/redis-lock
```

## 使用例子

```javascript
import redisLock from "@wenye123/redis-lock";
import Redis from "ioredis";

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

const rlock = new redisLock({
  client: redis,
  keyPrefix: "bm:",
});

const lockName = "tlock";
// 获取锁标志，null则表示获取失败
const identifier = await rlock.acquireLock(lockName);
// 释放锁
await rlock.releaseLock(lockName, identifier as string);

const sename = "tsename";
// 获取信号量
const identifier = await rlock.acquireSemaphore(sename, 1);
// 刷新信号量
await rlock.refreshSemaphore(sename, identifier as string);
// 释放信号量
await rlock.releaseSemaphore(sename, identifier as string);

```
