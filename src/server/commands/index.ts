import { Router } from 'express';
import { Slack, SlackBot } from '../../types';
import help from './help';
import Queue from '../../Queue';

interface CommandEvent {
  command: string | undefined;
  requestBody: Slack.Payloads.Command;
}

const commands = new Queue<CommandEvent>();

export default Router()
  .post('/', async (req: Slack.IncomingRequest<Slack.Payloads.Command>, res) => {
    res.end();
    const command = req.body.text.match(/^\w+/)?.[0].toLowerCase();
    commands.enqueue({ command, requestBody: req.body });
  });

(async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  for await (const { command, requestBody } of commands) {
    switch (command) {
      case SlackBot.Command.Help:
      default:
        await help(requestBody.response_url);
    }
  }
})();
