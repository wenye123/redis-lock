import { hello } from "../src/index";
import { assert } from "chai";

describe("test", function() {
  it("index", function() {
    const ret = hello();
    assert.equal(ret, "hello world!");
  });
});
