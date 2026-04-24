export class RewindBuffer<T> {
  private readonly snapshots: Array<T | null>
  private count = 0
  private writeIndex = 0

  constructor(private readonly maxSnapshots: number = 30) {
    this.snapshots = new Array<T | null>(maxSnapshots).fill(null)
  }

  push(snapshot: T) {
    this.snapshots[this.writeIndex] = snapshot
    this.writeIndex = (this.writeIndex + 1) % this.maxSnapshots
    if (this.count < this.maxSnapshots) {
      this.count++
    }
  }

  pop(): T | null {
    if (this.count === 0) {
      return null
    }

    this.writeIndex = (this.writeIndex - 1 + this.maxSnapshots) % this.maxSnapshots
    this.count--

    const snapshot = this.snapshots[this.writeIndex]
    this.snapshots[this.writeIndex] = null
    return snapshot
  }

  peek(): T | null {
    if (this.count === 0) {
      return null
    }

    const index = (this.writeIndex - 1 + this.maxSnapshots) % this.maxSnapshots
    return this.snapshots[index]
  }

  clear() {
    this.snapshots.fill(null)
    this.count = 0
    this.writeIndex = 0
  }

  getAll(): T[] {
    const result = new Array<T>(this.count)
    const start = (this.writeIndex - this.count + this.maxSnapshots) % this.maxSnapshots
    for (let index = 0; index < this.count; index++) {
      result[index] = this.snapshots[(start + index) % this.maxSnapshots] as T
    }
    return result
  }

  get length(): number {
    return this.count
  }
}