import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TodoForm } from '@/components/todo-form';
import { TodoItem } from '@/components/todo-item';
import { useTodos } from '@/hooks/use-todos';
import type { Todo, TodoInput } from '@/types/todo';

export default function Todos() {
  const { todos, isLoading, error, add, edit, toggle, remove } = useTodos();
  const [editing, setEditing] = useState<Todo | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleCreate = async (input: TodoInput) => {
    await add(input);
    setIsFormOpen(false);
  };

  const handleUpdate = async (input: TodoInput) => {
    if (!editing) return;
    await edit(editing.id, input);
    setEditing(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="flex-1 gap-4 px-4 py-4">
        {editing ? (
          <TodoForm
            key={editing.id}
            submitLabel="Save changes"
            defaultValues={{ title: editing.title, description: editing.description }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        ) : isFormOpen ? (
          <TodoForm submitLabel="Add todo" onSubmit={handleCreate} onCancel={() => setIsFormOpen(false)} />
        ) : (
          <Pressable
            onPress={() => setIsFormOpen(true)}
            className="rounded-xl bg-slate-900 py-3 active:opacity-80">
            <Text className="text-center text-base font-semibold text-white">+ New todo</Text>
          </Pressable>
        )}

        {isLoading ? (
          <ActivityIndicator className="mt-8" />
        ) : error ? (
          <Text className="text-center text-red-600">{error}</Text>
        ) : (
          <FlatList
            data={todos}
            keyExtractor={(todo) => todo.id}
            contentContainerClassName="gap-2"
            ListEmptyComponent={
              <Text className="mt-8 text-center text-slate-400">No todos yet. Add one above.</Text>
            }
            renderItem={({ item }) => (
              <TodoItem
                todo={item}
                onToggle={toggle}
                onEdit={(todo) => {
                  setIsFormOpen(false);
                  setEditing(todo);
                }}
                onDelete={(todo) => remove(todo.id)}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
