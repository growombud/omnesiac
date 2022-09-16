import should = require('should');
import OmnesiacCache from './OmnesiacCache';
import * as sinon from 'sinon';

describe('OmnesiacCache', () => {
  let clock: sinon.SinonFakeTimers;

  before(() => {
    clock = sinon.useFakeTimers();
  });

  after(() => {
    clock.restore();
  });
  describe('set()', () => {
    it('should cache a value, and remove after TTL has expired', async () => {
      const cache = new OmnesiacCache();
      const removeSpy = sinon.spy(cache, 'remove');
      const key = 'key';
      const otherKey = 'key2';
      const ttl = 100;
      cache.set(key, { ttl });
      cache.set(otherKey, { ttl: 0 });

      await clock.tickAsync(ttl / 2);
      cache.get(key).should.be.an.Object().with.property('ttl').eql(ttl);

      removeSpy.calledOnceWith(key).should.be.false();
      await clock.tickAsync(ttl / 2);
      removeSpy.calledOnceWith(key).should.be.true();

      should(cache.get(key)).not.be.ok();
    });
  });
  describe('clear()', () => {
    it('should remove all cached values, and clear timeouts', async () => {
      const cache = new OmnesiacCache();
      const removeSpy = sinon.spy(cache, 'remove');
      const key = 'key';
      const otherKey = 'key2';
      const ttl = 999999999;
      cache.set(key, { ttl });
      cache.set(otherKey, { ttl: 0 });

      await clock.tickAsync(50);

      cache.get(key).should.be.an.Object().with.property('ttl').eql(ttl);

      removeSpy.calledOnce.should.be.false();

      cache.clear();

      removeSpy.calledTwice.should.be.true();

      should(cache.get(key)).not.be.ok();
      should(cache.get(otherKey)).not.be.ok();
    });
  });
});
