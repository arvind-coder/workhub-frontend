"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, describedBy } from "@/components/shared/field";
import { FormError } from "@/components/shared/form-error";
import { getErrorMessage } from "@/lib/api/errors";
import { loginSchema, type LoginValues } from "@/lib/validations/schemas";
import { safeNextPath } from "@/lib/utils/navigation";
import { useLogin } from "./hooks";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);
  const expired = params.get("expired") === "1";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    login.mutate(values, {
      onSuccess: () => router.replace(safeNextPath(params.get("next"))),
      onError: (error) => setServerError(getErrorMessage(error)),
    });
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to your workspace.</p>

      {expired && !serverError && (
        <p role="status" className="mt-5 rounded-lg border bg-muted/60 p-3 text-sm">
          Your session expired. Please sign in again.
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <FormError message={serverError} />
        <Field id="email" label="Email" required error={errors.email?.message}>
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
        <Field id="password" label="Password" required error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={describedBy("password", errors.password?.message)}
            {...register("password")}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
          {login.isPending && <Loader2 aria-hidden className="animate-spin" />}
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to WorkHub?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
