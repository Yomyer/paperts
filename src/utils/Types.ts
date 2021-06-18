export type ConstructorParameters<T> = T extends {
    new (...args: infer A1): void
    new (...args: infer A2): void
    new (...args: infer A3): void
    new (...args: infer A4): void
}
    ? A1 | A2 | A3 | A4
    : T extends {
          new (...args: infer A1): void
          new (...args: infer A2): void
          new (...args: infer A3): void
      }
    ? A1 | A2 | A3
    : T extends {
          new (...args: infer A1): void
          new (...args: infer A2): void
      }
    ? A1 | A2
    : T extends {
          new (...args: infer A1): void
      }
    ? A1
    : never
