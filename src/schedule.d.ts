declare module 'schedule' {

  export interface ScheduleOptions {
      text: string;
      mode?: 'b' | 'd' | 'g' | 'p' | 's' | 't' | 'w' | 'y'
  }

  export function write(options: ScheduleOptions): string;
}