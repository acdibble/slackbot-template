import { RequestOptions } from 'https';

export enum Command {
  Help = 'help'
}

export interface ExtendedOptions extends RequestOptions {
  handleResponse?: boolean;
  data?: string;
}
