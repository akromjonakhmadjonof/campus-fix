"use client";

// Imports
import { Slot } from "radix-ui";
import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Types
type FormFieldContextValueType<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  name: TName;
};

type FormItemContextValueType = {
  id: string;
};

// Constants
const Form = FormProvider;

const FormFieldContext = React.createContext<FormFieldContextValueType<
  FieldValues,
  FieldPath<FieldValues>
> | null>(null);

const FormItemContext = React.createContext<FormItemContextValueType | null>(null);

// Hooks
function useFormField() {
  // Hooks
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const form = useFormContext();
  const fieldState = useFormState({ name: fieldContext?.name });
  if (!fieldContext || !itemContext || !form) {
    throw new Error("Form controls require Form, FormField and FormItem");
  }
  const { getFieldState } = form;

  // Constants
  const state = getFieldState(fieldContext.name, fieldState);

  // Logic

  const { id } = itemContext;

  // Return
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...state,
  };
}

// Components
function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  // Render
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

function FormItem(props: React.ComponentProps<"div">) {
  // Props
  const { className, ...restProps } = props;

  // Hooks
  const id = React.useId();

  // Render
  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn("grid gap-2", className)} {...restProps} />
    </FormItemContext.Provider>
  );
}

function FormLabel(props: React.ComponentProps<typeof Label>) {
  // Props
  const { className, ...restProps } = props;

  // Hooks
  const { error, formItemId } = useFormField();

  // Render
  return (
    <Label
      data-slot="form-label"
      data-error={Boolean(error)}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...restProps}
    />
  );
}

function FormControl(props: React.ComponentProps<typeof Slot.Root>) {
  // Props
  const { ...restProps } = props;

  // Hooks
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  // Render
  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={Boolean(error)}
      {...restProps}
    />
  );
}

function FormDescription(props: React.ComponentProps<"p">) {
  // Props
  const { className, ...restProps } = props;

  // Hooks
  const { formDescriptionId } = useFormField();

  // Render
  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...restProps}
    />
  );
}

function FormMessage(props: React.ComponentProps<"p">) {
  // Props
  const { className, children, ...restProps } = props;

  // Hooks
  const { error, formMessageId } = useFormField();

  // Constants
  const body = error ? String(error.message ?? "") : children;

  // Logic
  if (!body) {
    return null;
  }

  // Render
  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      role="alert"
      className={cn("text-sm text-destructive", className)}
      {...restProps}
    >
      {body}
    </p>
  );
}

// Exports
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
};
