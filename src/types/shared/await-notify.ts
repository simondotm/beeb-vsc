declare module 'await-notify' {
  export class Subject {
    constructor()
    public wait(timeout?: number): Promise<void>
    public notify(): Promise<void>
    public notifyAll(): Promise<void>
  }
}
