export function createState<T>(stateValue: T): {
    value: T
} {
  let state = $state({
    value: stateValue
  });
  return state
}