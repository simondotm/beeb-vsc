declare module 'jsbeeb/scheduler' {
  export class Scheduler {
    static get MaxHeadroom(): number
    epoch: number
    constructor()
    schedule(task: ScheduledTask, delay: number): void
    cancel(task: ScheduledTask): void
    polltime(ticks: number): void
    headroom(): number
    newTask(onExpire: () => void): ScheduledTask
  }

  export class ScheduledTask {
    constructor(scheduler: Scheduler, onExpire: () => void)
    scheduled(): boolean
    schedule(delay: number): void
    reschedule(delay: number): void
    cancel(): void
    ensureScheduled(state: boolean, delay: number): void
  }
}
