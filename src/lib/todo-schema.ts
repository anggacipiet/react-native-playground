import * as yup from 'yup';

import type { TodoInput } from '@/types/todo';

export const todoSchema: yup.ObjectSchema<TodoInput> = yup.object({
  title: yup.string().trim().min(3, 'Title must be at least 3 characters').required('Title is required'),
  description: yup.string().trim().max(200, 'Description must be 200 characters or less').default(''),
});
