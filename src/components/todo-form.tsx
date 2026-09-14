import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, TextInput, View } from 'react-native';

import { todoSchema } from '@/lib/todo-schema';
import type { TodoInput } from '@/types/todo';

type TodoFormProps = {
  defaultValues?: TodoInput;
  submitLabel: string;
  onSubmit: (data: TodoInput) => Promise<void> | void;
  onCancel?: () => void;
};

export function TodoForm({ defaultValues, submitLabel, onSubmit, onCancel }: TodoFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TodoInput>({
    resolver: yupResolver(todoSchema),
    defaultValues: defaultValues ?? { title: '', description: '' },
  });

  const submit = handleSubmit(async (data) => {
    await onSubmit(data);
    reset({ title: '', description: '' });
  });

  return (
    <View className="gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <View className="gap-1">
        <Controller
          control={control}
          name="title"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              placeholder="Title"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
            />
          )}
        />
        {errors.title ? <Text className="text-sm text-red-600">{errors.title.message}</Text> : null}
      </View>

      <View className="gap-1">
        <Controller
          control={control}
          name="description"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              placeholder="Description (optional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              className="min-h-16 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
            />
          )}
        />
        {errors.description ? (
          <Text className="text-sm text-red-600">{errors.description.message}</Text>
        ) : null}
      </View>

      <View className="flex-row gap-2">
        <Pressable
          disabled={isSubmitting}
          onPress={submit}
          className="flex-1 rounded-lg bg-slate-900 py-2.5 active:opacity-80 disabled:opacity-40">
          <Text className="text-center text-sm font-semibold text-white">
            {isSubmitting ? 'Saving...' : submitLabel}
          </Text>
        </Pressable>

        {onCancel ? (
          <Pressable onPress={onCancel} className="flex-1 rounded-lg border border-slate-300 py-2.5">
            <Text className="text-center text-sm font-semibold text-slate-700">Cancel</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
