import should = require('should');
import Omnesiac = require('./index');
import * as sinon from 'sinon';

const wait = (ms: number, ...args: any[]): Promise<any[]> =>
  new Promise(resolve => {
    setTimeout(() => resolve(...args), ms);
  });

interface AsyncTestResult {
  result?: any;
  time: number;
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

      const [
        { result: result1, time: time1 },
        { result: result2, time: time2 },
        { result: result3, time: time3 },
      ] = await Promise.all([wrapper(), wrapper(), wrapper()]);

      time1.should.be.a.Number().greaterThan(time2);
      time1.should.be.a.Number().greaterThan(time3);

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

      let counter = 1;
      const wrapper = async (): Promise<AsyncTestResult> => {
        const result = await omnesized('key', 100, counter++);
        return { result, time: Date.now() };
      };

      const [
        { result: result1, time: time1 },
        { result: result2, time: time2 },
        { result: result3, time: time3 },
      ] = await Promise.all([wrapper(), wrapper(), wrapper()]);

      time1.should.be.a.Number().lessThanOrEqual(time2);
      time1.should.be.a.Number().lessThanOrEqual(time3);

      should(result1).be.ok();
      should(result2).be.ok();
      should(result3).be.ok();

      result1.should.be.a.Number().eql(1);
      result2.should.be.a.Number().eql(result1);
      result3.should.be.a.Number().eql(result1);

      fn.calledOnce.should.be.true;
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

      const [
        { result: result1, time: time1 },
        { result: result2, time: time2 },
        { result: result3, time: time3 },
      ] = await Promise.all([wrapper(), wrapper(), wrapper()]);

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

      const [
        { result: result4, time: time4 },
        { result: result5, time: time5 },
        { result: result6, time: time6 },
      ] = await Promise.all([wrapper(), wrapper(), wrapper()]);

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
});
