import should = require('should');
import Omnesiac = require('./index');
import * as sinon from 'sinon';

function wait(ms: number, result?: unknown): Promise<unknown> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), ms);
  });
}

interface AsyncTestResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  time: number;
}

interface Outcome {
  status: 'resolved' | 'rejected' | 'pending';
  value?: unknown;
  error?: unknown;
}

// Reports how a promise settled, or 'pending' if it hasn't within `ms`, so a hang fails the test instead of stalling it
function settleWithin(promise: Promise<unknown>, ms = 250): Promise<Outcome> {
  return Promise.race([
    promise.then(
      (value): Outcome => ({ status: 'resolved', value }),
      (error): Outcome => ({ status: 'rejected', error }),
    ),
    wait(ms, { status: 'pending' }) as Promise<Outcome>,
  ]);
}

describe('Omnesiac', () => {
  describe('blocking = false', () => {
    it('should only process one request at a time, concurrent requests should not be blocked by in-flight', async () => {
      const fn = sinon.spy(wait);
      const omnesized = Omnesiac(fn, { blocking: false });

      const wrapper = async (): Promise<AsyncTestResult> => {
        const result = await omnesized('key', 50, 'waited for 50');
        return { result, time: Date.now() };
      };

      const [{ result: result1, time: time1 }, { result: result2, time: time2 }, { result: result3, time: time3 }] =
        await Promise.all([wrapper(), wrapper(), wrapper()]);

      time1.should.be.a.Number().greaterThan(time2);
      time1.should.be.a.Number().greaterThan(time3);

      should(result1).be.ok();
      should(result2).not.be.ok();
      should(result3).not.be.ok();

      fn.calledOnce.should.be.true();
    });
  });
  describe('blocking = true', () => {
    it('should only process one request at a time, concurrent requests should block during in-flight and return result', async () => {
      const fn = sinon.spy(wait);
      const omnesized = Omnesiac(fn, { blocking: true });

      let counter = 1;
      const wrapper = async (): Promise<AsyncTestResult> => {
        const result = await omnesized('key', 100, counter++);
        return { result, time: Date.now() };
      };

      const [{ result: result1, time: time1 }, { result: result2, time: time2 }, { result: result3, time: time3 }] =
        await Promise.all([wrapper(), wrapper(), wrapper()]);

      time1.should.be.a.Number().lessThanOrEqual(time2);
      time1.should.be.a.Number().lessThanOrEqual(time3);

      should(result1).be.ok();
      should(result2).be.ok();
      should(result3).be.ok();

      result1.should.be.a.Number().eql(1);
      result2.should.be.a.Number().eql(result1);
      result3.should.be.a.Number().eql(result1);

      fn.calledOnce.should.be.true();
    });
  });
  describe('ttl = ?', () => {
    it('should memoize the results of the function until the ttl has expired', async () => {
      const fn = sinon.spy(wait);
      const omnesized = Omnesiac(fn, { blocking: true, ttl: 75 });

      let counter = 1;
      const wrapper = async (): Promise<AsyncTestResult> => {
        const result = await omnesized('key', 50, counter++);
        return { result, time: Date.now() };
      };

      const [{ result: result1, time: time1 }, { result: result2, time: time2 }, { result: result3, time: time3 }] =
        await Promise.all([wrapper(), wrapper(), wrapper()]);

      time1.should.be.a.Number().lessThanOrEqual(time2);
      time1.should.be.a.Number().lessThanOrEqual(time3);

      should(result1).be.ok();
      should(result2).be.ok();
      should(result3).be.ok();

      result1.should.be.a.Number().eql(1);
      result2.should.be.a.Number().eql(result1);
      result3.should.be.a.Number().eql(result1);

      fn.callCount.should.be.a.Number().eql(1);

      await wait(100);

      const [{ result: result4, time: time4 }, { result: result5, time: time5 }, { result: result6, time: time6 }] =
        await Promise.all([wrapper(), wrapper(), wrapper()]);

      time4.should.be.a.Number().greaterThan(time1);
      time4.should.be.a.Number().greaterThan(time2);
      time4.should.be.a.Number().greaterThan(time3);
      time4.should.be.a.Number().lessThanOrEqual(time5);
      time4.should.be.a.Number().lessThanOrEqual(time6);

      should(result4).be.ok();
      should(result5).be.ok();
      should(result6).be.ok();

      result4.should.be.a.Number().eql(4);
      result5.should.be.a.Number().eql(result4);
      result6.should.be.a.Number().eql(result4);

      fn.callCount.should.be.a.Number().eql(2);
    });
  });
  describe('fn fails', () => {
    const error = new Error('db timeout');

    // Rejects with `error` on the first call, and resolves with `result` after that
    const failOnce = () => {
      let calls = 0;
      return sinon.spy(async (ms: number, result?: unknown) => {
        calls++;
        await wait(ms);
        if (calls === 1) throw error;
        return result;
      });
    };

    // Throws `error` synchronously on the first call, and resolves with `result` after that
    const throwOnce = () => {
      let calls = 0;
      return sinon.spy((ms: number, result?: unknown) => {
        calls++;
        if (calls === 1) throw error;
        return wait(ms, result);
      });
    };

    it('should reject concurrent blocking callers with the same error', async () => {
      const fn = failOnce();
      const omnesized = Omnesiac(fn, { blocking: true, ttl: 1000 });
      const call = () => settleWithin(omnesized('key', 20, 'ok'));

      const outcomes = await Promise.all([call(), call(), call()]);

      outcomes.map(({ status }) => status).should.eql(['rejected', 'rejected', 'rejected']);
      outcomes.forEach((outcome) => should(outcome.error).equal(error));
      fn.calledOnce.should.be.true();
    });

    it('should run fn again on the next blocking call after a rejection', async () => {
      const fn = failOnce();
      const omnesized = Omnesiac(fn, { blocking: true, ttl: 1000 });
      const call = () => settleWithin(omnesized('key', 20, 'ok'));

      (await call()).should.eql({ status: 'rejected', error });
      (await call()).should.eql({ status: 'resolved', value: 'ok' });
      fn.callCount.should.be.a.Number().eql(2);
    });

    it('should return undefined to concurrent non-blocking callers, and run fn again on the next call', async () => {
      const fn = failOnce();
      const omnesized = Omnesiac(fn, { blocking: false, ttl: 1000 });
      const call = () => settleWithin(omnesized('key', 20, 'ok'));

      const outcomes = await Promise.all([call(), call(), call()]);

      outcomes.map(({ status }) => status).should.eql(['rejected', 'resolved', 'resolved']);
      should(outcomes[0].error).equal(error);
      should(outcomes[1].value).be.undefined();
      should(outcomes[2].value).be.undefined();
      fn.calledOnce.should.be.true();

      (await call()).should.eql({ status: 'resolved', value: 'ok' });
      fn.callCount.should.be.a.Number().eql(2);
    });

    [true, false].forEach((blocking) => {
      it(`should treat a synchronous throw like a rejection (blocking = ${blocking})`, async () => {
        const fn = throwOnce();
        const omnesized = Omnesiac(fn, { blocking, ttl: 1000 });
        const call = () => settleWithin(omnesized('key', 20, 'ok'));

        const [first, ...others] = await Promise.all([call(), call(), call()]);

        first.status.should.eql('rejected');
        should(first.error).equal(error);
        others.forEach((outcome) => {
          if (blocking) {
            outcome.status.should.eql('rejected');
            should(outcome.error).equal(error);
          } else {
            outcome.should.eql({ status: 'resolved', value: undefined });
          }
        });
        fn.calledOnce.should.be.true();

        (await call()).should.eql({ status: 'resolved', value: 'ok' });
        fn.callCount.should.be.a.Number().eql(2);
      });

      it(`should cache a success for the TTL after an earlier failure (blocking = ${blocking})`, async () => {
        const ttl = 100;
        const fn = failOnce();
        const omnesized = Omnesiac(fn, { blocking, ttl });
        const call = (result: string) => settleWithin(omnesized('key', 20, result));

        (await call('first')).status.should.eql('rejected');
        fn.callCount.should.be.a.Number().eql(1);

        const burst = await Promise.all([call('second'), call('second'), call('second')]);
        const waiterValue = blocking ? 'second' : undefined;
        burst.should.eql([
          { status: 'resolved', value: 'second' },
          { status: 'resolved', value: waiterValue },
          { status: 'resolved', value: waiterValue },
        ]);
        fn.callCount.should.be.a.Number().eql(2);

        (await call('third')).should.eql({ status: 'resolved', value: 'second' });
        fn.callCount.should.be.a.Number().eql(2);

        await wait(ttl + 50);

        (await call('fourth')).should.eql({ status: 'resolved', value: 'fourth' });
        fn.callCount.should.be.a.Number().eql(3);
      });
    });
  });
});
