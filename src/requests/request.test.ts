import { assert } from 'chai';
import nock from 'nock';
import request from './request';

describe('request', () => {
  before(() => {
    nock.disableNetConnect();
  });

  after(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  it('rejects errors on response', async () => {
    const scope = nock('https://www.example.com')
      .get('/')
      .replyWithError('err');

    await assert.isRejected(request('https://www.example.com', { method: 'GET', handleResponse: true }));
    scope.done();
  });

  it('returns the request body if it is not JSON', async () => {
    const scope = nock('https://www.example.com')
      .get('/')
      .reply(200, 'this is the body');

    await assert.eventually.equal(
      request('https://www.example.com', { method: 'GET', handleResponse: true }),
      'this is the body',
    );
    scope.done();
  });
});
