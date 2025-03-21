/*
 * @FilePath: /chrome-favorite-expand/interface.d.ts
 * @Description: 
 */
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;