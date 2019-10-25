import { Redis } from "ioredis";

export interface IOptions {
  /** ioredis实例 */
  client: Redis;
  /** 键前缀 */
  keyPrefix: string;
}

export default class {
  private keyPrefix: string;
  private redis: Redis;

  constructor(options: IOptions) {
    this.redis = options.client;
    this.keyPrefix = options.keyPrefix;
    // 初始化lua脚本
    this.initLua();
  }

  private getKeyName(lockNmae: string) {
    return `${this.keyPrefix}${lockNmae}`;
  }

  private getIdentifier() {
    return Math.random()
      .toString(16)
      .split(".")[1];
  }

  private sleep(ms: number): Promise<number> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  private initLua() {
    // 释放锁
    this.redis.defineCommand("releaseLock", {
      numberOfKeys: 1,
      lua: `
        if (redis.call("get", KEYS[1]) == ARGV[1])
        then
          return redis.call("del", KEYS[1]);
        end
      `,
    });
    // 获取信号量
    this.redis.defineCommand("acquireSemaphore", {
      numberOfKeys: 1,
      lua: `
        redis.call("zremrangebyscore", KEYS[1], "-inf", ARGV[1]);
        if (redis.call("zcard", KEYS[1]) < tonumber(ARGV[2]))
        then
          redis.call("zadd", KEYS[1], ARGV[3], ARGV[4]);
          return ARGV[4];
        end
      `,
    });
    // 释放信号量
    this.redis.defineCommand("refreshSemaphore", {
      numberOfKeys: 1,
      lua: `
        if redis.call("zscore", KEYS[1], ARGV[1])
        then
          return redis.call("zadd", KEYS[1], ARGV[2], ARGV[1]);
        end
      `,
    });
  }

  /**
   * 请求一个锁标志
   * @param lockName 锁名字
   * @param acquireTimeout 请求超时毫秒数，默认3000
   * @param lockTimeout 锁过期毫秒数，默认5000
   */
  async acquireLock(lockName: string, acquireTimeout: number = 3000, lockTimeout: number = 5000) {
    lockName = this.getKeyName(lockName);
    lockTimeout = Math.ceil(lockTimeout); // 超时时间都是整数
    const identifier = this.getIdentifier();
    const end = Date.now() + acquireTimeout;
    while (Date.now() < end) {
      // 设置锁且包含过期时间
      const ret = await this.redis.set(lockName, identifier, "PX", lockTimeout, "NX");
      if (ret === "OK") return identifier;
      await this.sleep(20);
    }
    return null;
  }

  /**
   * 释放锁
   * @param lockName 锁名字
   * @param identifier 锁标志
   */
  async releaseLock(lockName: string, identifier: string) {
    lockName = this.getKeyName(lockName);
    const ret = await (this.redis as any).releaseLock(lockName, identifier);
    return ret === 1;
  }

  /**
   * 获取信号量
   * @param sename 信号量名字
   * @param limit 限制数
   * @param timeout 信号量过期毫秒数，默认3000
   */
  async acquireSemaphore(sename: string, limit: number, timeout: number = 3000) {
    sename = this.getKeyName(sename);
    const identifier = this.getIdentifier();
    const now = Date.now();
    const ident = await (this.redis as any).acquireSemaphore(sename, now - timeout, limit, now, identifier);
    return ident as string | null;
  }

  /**
   * 释放信号量
   * @param sename 信号量名字
   * @param identifier 信号量标识
   */
  async releaseSemaphore(sename: string, identifier: string) {
    sename = this.getKeyName(sename);
    // 正确释放返回true 否则就是该信号量已过期
    const ret = await this.redis.zrem(sename, identifier);
    return Boolean(ret);
  }

  /**
   * 刷新信号量
   * @param sename 信号量名字
   * @param identifier 信号量标识符
   */
  async refreshSemaphore(sename: string, identifier: string) {
    sename = this.getKeyName(sename);
    const now = Date.now();
    const ret = await (this.redis as any).refreshSemaphore(sename, identifier, now);
    return ret === 0;
  }
}
