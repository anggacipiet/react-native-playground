import { http, HttpResponse } from 'msw';

import { API_URL } from '@/api/client';
import type { Todo } from '@/types/todo';

let todos: Todo[] = [
  { id: '1', title: 'Buy groceries', description: 'Milk, eggs, bread', completed: false },
  { id: '2', title: 'Read a book', description: '30 minutes before bed', completed: true },
];

export const handlers = [
  http.get(`${API_URL}/todos`, () => {
    return HttpResponse.json(todos);
  }),

  http.post(`${API_URL}/todos`, async ({ request }) => {
    const body = (await request.json()) as { title: string; description: string };
    const todo: Todo = {
      id: Date.now().toString(),
      title: body.title,
      description: body.description,
      completed: false,
    };
    todos = [...todos, todo];
    return HttpResponse.json(todo, { status: 201 });
  }),

  http.patch(`${API_URL}/todos/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<Todo>;
    let updated: Todo | undefined;

    todos = todos.map((todo) => {
      if (todo.id !== params.id) return todo;
      updated = { ...todo, ...body };
      return updated;
    });

    if (!updated) {
      return HttpResponse.json({ message: 'Todo not found' }, { status: 404 });
    }

    return HttpResponse.json(updated);
  }),

  http.delete(`${API_URL}/todos/:id`, ({ params }) => {
    const exists = todos.some((todo) => todo.id === params.id);
    if (!exists) {
      return HttpResponse.json({ message: 'Todo not found' }, { status: 404 });
    }

    todos = todos.filter((todo) => todo.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
