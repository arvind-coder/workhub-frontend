"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, describedBy } from "@/components/shared/field";
import { FormError } from "@/components/shared/form-error";
import { ApiError, getErrorMessage } from "@/lib/api/errors";
import { registerSchema, type RegisterValues } from "@/lib/validations/schemas";
import { useLogin, useRegister } from "./hooks";

export function RegisterForm() {
  const router = useRouter();
  const registerUser = useRegister();
  const login = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const pending = registerUser.isPending || login.isPending;

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    registerUser.mutate(values, {
      onSuccess: () => {
        // Registration does not issue tokens, so sign in with the same credentials.
        login.mutate(
          { email: values.email, password: values.password },
          {
            onSuccess: () => {
              toast.success("Welcome to WorkHub!");
              router.replace("/overview");
            },
            onError: () => {
              toast.success("Account created. Please sign in.");
              router.replace("/login");
            },
          },
        );
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          setError("email", { message: "An account with this email already exists" });
          return;
        }
        setServerError(getErrorMessage(error));
      },
    });
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Start organising your team&apos;s work in minutes.</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <FormError message={serverError} />
        <Field id="name" label="Full name" required error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Priya Sharma"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy("name", errors.name?.message)}
            {...register("name")}
          />
        </Field>
        <Field id="email" label="Work email" required error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy("email", errors.email?.message)}
            {...register("email")}
          />
        </Field>
        <Field
          id="password"
          label="Password"
          required
          error={errors.password?.message}
          hint="6–72 characters."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={describedBy("password", errors.password?.message, "6–72 characters.")}
            {...register("password")}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 aria-hidden className="animate-spin" />}
          {pending ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-xs text-muted-foreground">
          New accounts start with the Member role. Project managers and admins are assigned by your organisation.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
