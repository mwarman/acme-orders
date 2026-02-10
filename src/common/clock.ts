import { Injectable } from '@nestjs/common';

/** Wall-clock access behind a provider so tests can control time. */
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}
