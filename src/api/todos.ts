import { apiFetch } from '@/api/client';
import type { Todo, TodoInput } from '@/types/todo';

export function fetchTodos() {
  return apiFetch<Todo[]>('/todos');
}

export function createTodo(input: TodoInput) {
  return apiFetch<Todo>('/todos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTodo(id: string, input: Partial<TodoInput & { completed: boolean }>) {
  return apiFetch<Todo>(`/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteTodo(id: string) {
  return apiFetch<void>(`/todos/${id}`, { method: 'DELETE' });
}
