import nock from 'nock';
import chai, { assert } from 'chai';
import slackRequest from '.';
import { Slack } from '../../types';
import HTTPError from '../../HTTPError';

import chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

describe('slackRequest', () => {
  before(() => {
    nock.disableNetConnect();
    nock.cleanAll();
  });

  after(() => {
    nock.enableNetConnect();
  });

  it('does not stringify the params if not falsy', async () => {
    const scope = nock('https://slack.com/api')
      .post('/auth.test')
      .reply(200, { ok: true });

    await assert.eventually.deepEqual(slackRequest(Slack.Method.AuthTest), { ok: true });
    scope.done();
  });

  it('handles errors', async () => {
    nock('https://slack.com/api')
      .post('/chat.postMessage')
      .reply(500, 'whoops');

    const response = slackRequest(Slack.Method.PostMessage, { text: 'test', channel: 'test' });

    await assert.isRejected(response, HTTPError, 'whoops');
  });

  it('rejects responses without ok=true in the body', async () => {
    nock('https://slack.com/api')
      .post('/chat.postMessage')
      .reply(200, { ok: false, error: 'this is an error' });

    const response = slackRequest(Slack.Method.PostMessage, { text: 'test', channel: 'test' });

    await assert.isRejected(response, Error, 'this is an error');
  });
});
