import { v4 as uuidv4 } from 'uuid';
import { Storage } from './storage/memory.js';
import { Tools } from './tools/index.js';
import type { Task, ToolCall } from './types.js';

export async function enqueueTask(title: string, steps: ToolCall[]): Promise<Task> {
  const task: Task = {
    id: uuidv4(),
    title,
    createdAt: new Date().toISOString(),
    status: 'queued',
    steps,
    currentStep: 0,
    logs: [],
  };
  Storage.addTask(task);
  void runTask(task.id);
  return task;
}

export async function runTask(taskId: string): Promise<void> {
  const task = Storage.getTask(taskId);
  if (!task) return;
  if (task.status === 'done' || task.status === 'failed') return;

  task.status = 'running';
  Storage.updateTask(task);

  while (task.currentStep < task.steps.length) {
    const idx = task.currentStep;
    const step = task.steps[idx];
    const tool = Tools[step.tool];
    if (!tool) {
      const error = `Tool not found: ${step.tool}`;
      const entry = {
        time: new Date().toISOString(),
        taskId: task.id,
        stepIndex: idx,
        tool: step.tool,
        input: step.params,
        error,
        status: 'error',
      } as const;
      task.logs.push(entry);
      Storage.addLog(entry);
      task.status = 'failed';
      Storage.updateTask(task);
      return;
    }

    const needsApproval = step.requiresApproval || tool.approvalRequired?.(step.params) === true;
    if (needsApproval) {
      task.status = 'waiting_approval';
      const entry = {
        time: new Date().toISOString(),
        taskId: task.id,
        stepIndex: idx,
        tool: step.tool,
        input: step.params,
        status: 'waiting_approval',
      } as const;
      task.logs.push(entry);
      Storage.addLog(entry);
      Storage.updateTask(task);
      return;
    }

    try {
      const output = await tool.run(step.params);
      const entry = {
        time: new Date().toISOString(),
        taskId: task.id,
        stepIndex: idx,
        tool: step.tool,
        input: step.params,
        output,
        status: 'success',
      } as const;
      task.logs.push(entry);
      Storage.addLog(entry);
      task.currentStep += 1;
      Storage.updateTask(task);
    } catch (e: any) {
      const entry = {
        time: new Date().toISOString(),
        taskId: task.id,
        stepIndex: idx,
        tool: step.tool,
        input: step.params,
        error: String(e?.message ?? e),
        status: 'error',
      } as const;
      task.logs.push(entry);
      Storage.addLog(entry);
      task.status = 'failed';
      Storage.updateTask(task);
      return;
    }
  }

  task.status = 'done';
  Storage.updateTask(task);
}

export async function approveAndContinue(taskId: string): Promise<Task | undefined> {
  const task = Storage.getTask(taskId);
  if (!task) return;
  if (task.status !== 'waiting_approval') return task;

  const idx = task.currentStep;
  const step = task.steps[idx];
  const tool = Tools[step.tool];
  if (!tool) {
    task.status = 'failed';
    Storage.updateTask(task);
    return task;
  }

  try {
    const output = await tool.run(step.params);
    const entry = {
      time: new Date().toISOString(),
      taskId: task.id,
      stepIndex: idx,
      tool: step.tool,
      input: step.params,
      output,
      status: 'success',
    } as const;
    task.logs.push(entry);
    Storage.addLog(entry);
    task.currentStep += 1;
    task.status = 'running';
    Storage.updateTask(task);
    await runTask(task.id);
  } catch (e: any) {
    const entry = {
      time: new Date().toISOString(),
      taskId: task.id,
      stepIndex: idx,
      tool: step.tool,
      input: step.params,
      error: String(e?.message ?? e),
      status: 'error',
    } as const;
    task.logs.push(entry);
    Storage.addLog(entry);
    task.status = 'failed';
    Storage.updateTask(task);
  }
  return task;
}
