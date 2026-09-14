import { Pressable, Text, View } from 'react-native';

import type { Todo } from '@/types/todo';

type TodoItemProps = {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
};

export function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <Pressable
        onPress={() => onToggle(todo)}
        className={`h-6 w-6 items-center justify-center rounded-full border ${
          todo.completed ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
        }`}>
        {todo.completed ? <Text className="text-xs text-white">✓</Text> : null}
      </Pressable>

      <View className="flex-1">
        <Text
          className={`text-base font-medium ${
            todo.completed ? 'text-slate-400 line-through' : 'text-slate-900'
          }`}>
          {todo.title}
        </Text>
        {todo.description ? (
          <Text className="text-sm text-slate-500">{todo.description}</Text>
        ) : null}
      </View>

      <Pressable onPress={() => onEdit(todo)} className="px-2 py-1">
        <Text className="text-sm font-medium text-blue-600">Edit</Text>
      </Pressable>

      <Pressable onPress={() => onDelete(todo)} className="px-2 py-1">
        <Text className="text-sm font-medium text-red-600">Delete</Text>
      </Pressable>
    </View>
  );
}
