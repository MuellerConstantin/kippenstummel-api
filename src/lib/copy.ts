/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
export function deepCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepCopy(item)) as T;
  }

  const proto = Object.getPrototypeOf(obj);
  const copy = Object.create(proto);

  for (const key of Object.keys(obj)) {
    copy[key] = deepCopy((obj as any)[key]);
  }

  return copy as T;
}
