import chai, { assert } from 'chai';
import { createHmac } from 'crypto';
import nock from 'nock';
import server from '.';
import { Slack, SlackBot } from '../types';
import Queue from '../Queue';

import chaiHTTP = require('chai-http');

chai.use(chaiHTTP);

const coerce = <T>(obj: any): T => obj as T;

const authHeaders = (body: Record<string, any>, otherHeaders?: Record<string, string>): Record<string, string> => {
  const timestamp = Math.floor(Date.now() / 1000);
  const headers: Record<string, string> = {
    ...otherHeaders,
    'x-slack-request-timestamp': timestamp.toString(),
    'content-type': 'application/json',
  };

  const signature = createHmac('sha256', process.env.SLACK_SIGNING_SECRET as string)
    .update(`v0:${timestamp}:${JSON.stringify(body)}`)
    .digest('hex');

  headers['x-slack-signature'] = `v0=${signature}`;
  return headers;
};

describe('Server', () => {
  let events: Queue;

  before(async () => {
    ({ events } = await import('./events'));
  });

  it('pongs', async () => {
    const res = await chai.request(server)
      .get('/ping');

    assert.equal(res.status, 200);
    assert.equal(res.text, 'pong');
  });

  it('handles 404s', async () => {
    const res = await chai.request(server)
      .get('/something');

    assert.equal(res.status, 404);
  });

  describe('authenticated endpoints', () => {
    const oldEnv = process.env;

    before(() => {
      nock.enableNetConnect('127.0.0.1');
      nock.cleanAll();
      process.env.SLACK_SIGNING_SECRET = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      process.env.SLACK_OAUTH_TOKEN = 'xoxb-000000000000-1111111111111-ABCDABCDABCDABCDABCDABCD';
    });

    after(() => {
      nock.enableNetConnect();
      process.env = oldEnv;
    });

    describe('commands', () => {
      beforeEach(() => {
        nock.cleanAll();
      });

      const responseUrl = 'https://dibble.codes/test/thing/';
      ['', 'help'].forEach((commandText) => {
        it(`handles help request (${commandText})`, async () => {
          const body = coerce<Slack.Payloads.Command>({
            text: commandText,
            response_url: responseUrl,
          });

          const text = ['Available commands:', ...Object.values(SlackBot.Command)].join('\n');
          const scope = nock(responseUrl)
            .post('/', { text, response_type: 'ephemeral' })
            .reply(200);

          const res = await chai.request(server)
            .post('/commands')
            .set(authHeaders(body))
            .send(body);
          assert.equal(res.status, 200);
          scope.done();
        });
      });
    });

    describe('events', () => {
      const codeBro = 'C0D3BR0';
      const channel = 'ABCDEF';
      const team = 'TESTTEAM';

      beforeEach(() => {
        nock.cleanAll();
      });

      it('handles challenges', async () => {
        const res = await chai.request(server)
          .post('/events')
          .send({ challenge: 'abcdef' });

        assert.deepEqual(res.body, { challenge: 'abcdef' });
      });

      it('handles errors', async () => {
        const body = {
          event: {
            channel,
            team,
            type: 'app_mention',
            user: 'Q1W2E3R4',
            text: `<@${codeBro}> wassup`,
          },
        };

        const scope = nock('https://slack.com/api')
          .post('/chat.postMessage', { channel, text: "I don't know what to do with my hands" })
          .reply(500, { ok: false });

        const res = await chai.request(server)
          .post('/events')
          .set(authHeaders(body))
          .send(body);

        assert.equal(res.status, 200);
        await events.ready();
        scope.done();
      });

      describe('app_mention', () => {
        beforeEach(() => {
          nock.cleanAll();
        });

        it('pongs', async () => {
          const body = {
            event: {
              channel,
              team,
              type: 'app_mention',
              user: 'Q1W2E3R4',
              text: `<@${codeBro}> ping`,
            },
          };

          const scope = nock('https://slack.com/api')
            .post('/chat.postMessage', { channel, text: 'pong' })
            .reply(200, { ok: true });

          const res = await chai.request(server)
            .post('/events')
            .set(authHeaders(body))
            .send(body);

          assert.equal(res.status, 200);
          await events.ready();
          scope.done();
        });

        it('handles unrecognized events', async () => {
          const body = {
            event: {
              channel,
              team,
              type: 'app_mention',
              user: 'Q1W2E3R4',
              text: `<@${codeBro}> wassup`,
            },
          };

          const scope = nock('https://slack.com/api')
            .post('/chat.postMessage', { channel, text: "I don't know what to do with my hands" })
            .reply(200, { ok: true });

          const res = await chai.request(server)
            .post('/events')
            .set(authHeaders(body))
            .send(body);

          assert.equal(res.status, 200);
          await events.ready();
          scope.done();
        });
      });
    });
  });
});
