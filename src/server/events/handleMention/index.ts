import { Slack } from '../../../types';
import postMessage from '../../../messages/postMessage';

export default async ({ event: { text, channel } }: Slack.Payloads.Event): Promise<Slack.Responses.PostMessage> => {
  const trimmed = text.trim();
  const message: {channel: string; text?: string; blocks?: Slack.Block[]} = { channel };

  if (/^<@.+?> ping$/.test(trimmed)) {
    message.text = 'pong';
  } else {
    message.text = "I don't know what to do with my hands";
  }

  return postMessage(message as Slack.Requests.PostMessage);
};
