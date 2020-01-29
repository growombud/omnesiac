import * as should from 'should';
import Omnesiac from './index';

const wait = (ms: number, ...args: any[]): Promise<any[]> =>
  new Promise(resolve => {
    setTimeout(() => resolve(...args), ms);
  });

interface AsyncTestResult {
  result?: any;
  time: number;
}

describe('Omnesiac', () => {
  describe('Concurrency', () => {
    describe('passThrough = true', () => {
      it('should only process one request at a time, concurrent requests should pass through, without executing function', async () => {
        const omnesized = Omnesiac(wait, { passThrough: true });

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
      });
    });
    describe('passThrough = false', () => {
      it('should only process one request at a time, concurrent requests should wait until in-flight is finished executing and return result', async () => {
        const omnesized = Omnesiac(wait, { passThrough: false });

        const wrapper = async (): Promise<AsyncTestResult> => {
          const result = await omnesized('key', 50, 'waited for 50');
          return { result, time: Date.now() };
        };

        const [
          { result: result1, time: time1 },
          { result: result2, time: time2 },
          { result: result3, time: time3 },
        ] = await Promise.all([wrapper(), wrapper(), wrapper()]);

        time1.should.be.a.Number().lessThan(time2);
        time1.should.be.a.Number().lessThan(time3);
        time2.should.be.a.Number().lessThanOrEqual(time3);

        should(result1).be.ok();
        should(result2).be.ok();
        should(result3).be.ok();
      });
    });
  });
});
