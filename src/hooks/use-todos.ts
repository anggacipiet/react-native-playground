import { useCallback, useEffect, useState } from 'react';

import * as todosApi from '@/api/todos';
import type { Todo, TodoInput } from '@/types/todo';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await todosApi.fetchTodos();
      setTodos(data);
      setError(null);
    } catch (err) {
      console.error('[useTodos] load failed', err);
      setError('Failed to load todos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching data on mount is a valid effect (react.dev/learn/you-might-not-need-an-effect);
    // the rule can't see that `load`'s setState calls only happen after the awaited fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const add = useCallback(async (input: TodoInput) => {
    const created = await todosApi.createTodo(input);
    setTodos((prev) => [...prev, created]);
  }, []);

  const edit = useCallback(async (id: string, input: TodoInput) => {
    const updated = await todosApi.updateTodo(id, input);
    setTodos((prev) => prev.map((todo) => (todo.id === id ? updated : todo)));
  }, []);

  const toggle = useCallback(async (todo: Todo) => {
    const updated = await todosApi.updateTodo(todo.id, { completed: !todo.completed });
    setTodos((prev) => prev.map((item) => (item.id === todo.id ? updated : item)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await todosApi.deleteTodo(id);
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }, []);

  return { todos, isLoading, error, reload: load, add, edit, toggle, remove };
}
