import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { DeepPartial, useForm } from "react-hook-form";
import { Schema } from "zod";

export const useEntityAwareForm = <T>(
  formDefaults: DeepPartial<T>,
  zodValidator: Schema<T>
) => {
  const form = useForm<T>({
    resolver: zodResolver(zodValidator),
    defaultValues: formDefaults,
  });
  const stableFormReset = useMemo(() => {
    return form.reset;
  }, [form.reset]);

  useEffect(() => {
    stableFormReset(formDefaults);
  }, [stableFormReset, formDefaults]);

  return form;
};
