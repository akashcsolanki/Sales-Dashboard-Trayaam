// Half-metre navigation grid for point-and-click walking around furnishings.
export function obstaclesFor(employees, objects, deskPosition) {
  const bounds = [];
  for (const o of objects) {
    const size = {
      desk: [4.2, 2.7],
      sofa: [4.1, 2],
      table: o.id === "table-board" ? [2.8, 8.1] : [2.7, 1.8],
      plant: [1, 1],
      partition: [0.7, 4.6],
      bookshelf: [3.8, 1.2],
      art: [2.4, 1.7],
    }[o.type];
    if (size) {
      const r = o.rotation || 0;
      bounds.push({
        x: o.x,
        z: o.z,
        w: Math.abs(Math.cos(r)) * size[0] + Math.abs(Math.sin(r)) * size[1],
        d: Math.abs(Math.cos(r)) * size[1] + Math.abs(Math.sin(r)) * size[0],
      });
    }
  }
  bounds.push({ x: 9.7, z: -4, w: 0.4, d: 11.7 });
  return bounds;
}
export function canStand(x, z, obstacles) {
  return (
    x >= -16.7 &&
    x <= 16.7 &&
    z >= -11.6 &&
    z <= 12 &&
    obstacles.every(
      (o) =>
        Math.abs(x - o.x) > o.w / 2 + 0.18 ||
        Math.abs(z - o.z) > o.d / 2 + 0.18,
    )
  );
}
export function findPath(start, goal, obstacles) {
  const step = 0.55,
    key = (x, z) => x + "," + z;
  const grid = (p) => ({
      x: Math.round(p.x / step),
      z: Math.round(p.z / step),
    }),
    a = grid(start),
    b = grid(goal);
  if (!canStand(goal.x, goal.z, obstacles)) return [];
  const open = [{ ...a, cost: 0, score: 0 }],
    came = new Map(),
    cost = new Map([[key(a.x, a.z), 0]]),
    closed = new Set();
  let end = null;
  for (let iter = 0; open.length && iter < 6000; iter++) {
    open.sort((a, b) => a.score - b.score);
    const n = open.shift(),
      nk = key(n.x, n.z);
    if (closed.has(nk)) continue;
    closed.add(nk);
    if (Math.abs(n.x - b.x) + Math.abs(n.z - b.z) <= 1) {
      end = n;
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = n.x + dx,
        z = n.z + dz,
        k = key(x, z);
      if (!canStand(x * step, z * step, obstacles) || closed.has(k)) continue;
      const g = n.cost + 1;
      if (g >= (cost.get(k) ?? Infinity)) continue;
      cost.set(k, g);
      came.set(k, n);
      open.push({
        x,
        z,
        cost: g,
        score: g + Math.abs(x - b.x) + Math.abs(z - b.z),
      });
    }
  }
  if (!end) return [];
  const result = [];
  let cursor = end;
  while (cursor && (cursor.x !== a.x || cursor.z !== a.z)) {
    result.push({ x: cursor.x * step, z: cursor.z * step });
    cursor = came.get(key(cursor.x, cursor.z));
  }
  result.reverse();
  result.push(goal);
  return result;
}
