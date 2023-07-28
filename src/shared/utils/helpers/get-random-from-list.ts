export default function getRandomFromList<T>(list: T[]): T | undefined {
  return list.length === 0
    ? undefined
    : list.at(Math.floor(Math.random() * list.length));
}
