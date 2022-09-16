import should = require('should');
import Omnesiac = require('./index');
import * as sinon from 'sinon';
import { before } from 'mocha';

function wait(ms: number, result?: unknown, error?: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (error) reject(new Error(error));
      resolve(result);
    }, ms);
  });
}

interface AsyncTestResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  seq: number;
}

class Counter {
  private count = 0;
  get next(): number {
    return ++this.count;
  }
  reset() {
    this.count = 0;
  }
}

describe('Omnesiac', () => {
  let clock: sinon.SinonFakeTimers;
  const counter = new Counter();

  before(() => {
    clock = sinon.useFakeTimers();
  });

  after(() => {
    clock.restore();
    counter.reset();
  });

  describe('blocking = false', () => {
    it('should only process one request at a time, concurrent requests should not be blocked by in-flight', async () => {
      const fn = sinon.spy(wait);
      const omnesized = Omnesiac(fn, { blocking: false });

      const wrapper = async (val: unknown = 'Unspecified Value'): Promise<AsyncTestResult> => {
        const result = await omnesized('key', 50, val);
        return { result, seq: counter.next };
      };

      const resultPromises = Promise.all([wrapper(), wrapper(), wrapper()]);
      await clock.runAllAsync();
      const [{ result: result1, seq: seq1 }, { result: result2, seq: seq2 }, { result: result3, seq: seq3 }] =
        await resultPromises;

      seq1.should.be.a.Number().greaterThan(seq2);
      seq1.should.be.a.Number().greaterThan(seq3);

      should(result1).be.ok();
      should(result2).not.be.ok();
      should(result3).not.be.ok();

      fn.calledOnce.should.be.true;
    });
  });

  describe('blocking = true', () => {
    it('should only process one request at a time, concurrent requests should block during in-flight and return result', async () => {
      const fn = sinon.spy(wait);
      const omnesized = Omnesiac(fn, { blocking: true });

      const wrapper = async (val: unknown = 'Unspecified Value'): Promise<AsyncTestResult> => {
        const result = await omnesized('key', 100, val);
        return { result, seq: counter.next };
      };

      const resultPromises = Promise.all([wrapper(1), wrapper(2), wrapper(3)]);
      await clock.runAllAsync();
      const [{ result: result1, seq: seq1 }, { result: result2, seq: seq2 }, { result: result3, seq: seq3 }] =
        await resultPromises;

      result1.should.be.a.Number().eql(1);
      result2.should.be.a.Number().eql(result1);
      result3.should.be.a.Number().eql(result1);

      seq1.should.be.a.Number().lessThan(seq2);
      seq2.should.be.a.Number().lessThan(seq3);

      fn.calledOnce.should.be.true;
    });
    describe('Exceptions', () => {
      it('should throw an exception', async () => {
        const fn = sinon.spy(wait);
        const omnesized = Omnesiac(fn, { blocking: true });

        const wrapper = async (val: unknown = 'Unspecified Value', error?: string): Promise<AsyncTestResult> => {
          const result = await omnesized('key', 100, val, error);
          return { result, seq: counter.next };
        };

        const pOne = wrapper(1, 'You Been Errored');
        const pTwo = wrapper(2);
        const pThree = wrapper(3);
        clock.runAll();
        await pOne.should.be.rejectedWith('You Been Errored');
        await clock.runAllAsync();
        await pTwo.should.not.be.rejected();
        await pThree.should.not.be.rejected();
        const { result: result2, seq: seq2 } = await pTwo;
        const { result: result3, seq: seq3 } = await pThree;

        result2.should.be.a.Number().eql(2);
        result3.should.be.a.Number().eql(result2);

        seq2.should.be.a.Number().greaterThan(1);
        seq2.should.be.a.Number().lessThan(seq3);

        fn.calledOnce.should.be.true;
      });
    });
  });

  describe('ttl = ?', () => {
    it('should memoize the results of the function until the ttl has expired', async () => {
      const fn = sinon.spy(wait);
      const omnesized = Omnesiac(fn, { blocking: true, ttl: 200 });

      const wrapper = async (val: unknown = 'Unspecified Value'): Promise<AsyncTestResult> => {
        const result = await omnesized('key', 100, val);
        return { result, seq: counter.next };
      };

      let resultPromises = Promise.all([wrapper(1), wrapper(2), wrapper(3)]);
      await clock.tickAsync(100);
      const [{ result: result1 }, { result: result2 }, { result: result3 }] = await resultPromises;

      should(result1).be.ok();
      should(result2).be.ok();
      should(result3).be.ok();

      result1.should.be.a.Number().eql(1);
      result2.should.be.a.Number().eql(result1);
      result3.should.be.a.Number().eql(result1);

      fn.callCount.should.be.a.Number().eql(1);

      await clock.tickAsync(50);

      resultPromises = Promise.all([wrapper(4), wrapper(5), wrapper(6)]);
      await clock.tickAsync(50);
      const [{ result: result4 }, { result: result5 }, { result: result6 }] = await resultPromises;

      should(result4).be.ok();
      should(result5).be.ok();
      should(result6).be.ok();

      result4.should.be.a.Number().eql(result1);
      result5.should.be.a.Number().eql(result1);
      result6.should.be.a.Number().eql(result1);

      fn.callCount.should.be.a.Number().eql(1);

      await clock.tickAsync(100);

      resultPromises = Promise.all([wrapper(7), wrapper(8), wrapper(9)]);
      await clock.runAllAsync();
      const [{ result: result7 }, { result: result8 }, { result: result9 }] = await resultPromises;

      should(result7).be.ok();
      should(result8).be.ok();
      should(result9).be.ok();

      result7.should.be.a.Number().eql(7);
      result8.should.be.a.Number().eql(result7);
      result9.should.be.a.Number().eql(result7);

      fn.callCount.should.be.a.Number().eql(2);
    });
    it('should cache forever if ttl = 0 (default)', async () => {
      const fn = sinon.spy(wait);
      const omnesized = Omnesiac(fn, { blocking: true });

      const wrapper = async (val: unknown = 'Unspecified Value'): Promise<AsyncTestResult> => {
        const result = await omnesized('key', 100, val);
        return { result, seq: counter.next };
      };

      let resultPromises = Promise.all([wrapper(1), wrapper(2), wrapper(3)]);
      await clock.tickAsync(100);
      const [{ result: result1 }, { result: result2 }, { result: result3 }] = await resultPromises;

      should(result1).be.ok();
      should(result2).be.ok();
      should(result3).be.ok();

      result1.should.be.a.Number().eql(1);
      result2.should.be.a.Number().eql(result1);
      result3.should.be.a.Number().eql(result1);

      fn.callCount.should.be.a.Number().eql(1);

      await clock.tickAsync(1e9);

      resultPromises = Promise.all([wrapper(4), wrapper(5), wrapper(6)]);
      await clock.runAllAsync();
      const [{ result: result4 }, { result: result5 }, { result: result6 }] = await resultPromises;

      should(result4).be.ok();
      should(result5).be.ok();
      should(result6).be.ok();

      result4.should.be.a.Number().eql(result1);
      result5.should.be.a.Number().eql(result1);
      result6.should.be.a.Number().eql(result1);

      fn.callCount.should.be.a.Number().eql(1);
    });
  });
});
