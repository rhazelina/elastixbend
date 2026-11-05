type Task = (dt: number, now: number) => boolean;

const tasks = new Set<Task>();
let frame: number | null = null;
let previous = 0;

function loop(now: number): void {
  const raw = previous === 0 ? 0 : (now - previous) / 1000;
  previous = now;

  for (const task of tasks) {
    if (!task(raw, now)) tasks.delete(task);
  }

  if (tasks.size > 0) {
    frame = requestAnimationFrame(loop);
    return;
  }
  frame = null;
  previous = 0;
}

export function schedule(task: Task): void {
  tasks.add(task);
  if (frame !== null) return;
  previous = 0;
  frame = requestAnimationFrame(loop);
}

export function unschedule(task: Task): void {
  tasks.delete(task);
  if (tasks.size > 0 || frame === null) return;
  cancelAnimationFrame(frame);
  frame = null;
  previous = 0;
}

/** Test and teardown hook. Not part of the public API. */
export function stopAllTasks(): void {
  tasks.clear();
  if (frame === null) return;
  cancelAnimationFrame(frame);
  frame = null;
  previous = 0;
}

export function activeTaskCount(): number {
  return tasks.size;
}
