import { z } from "zod";

/**
 * Schema walidacji dla logowania
 */
export const LoginSchema = z.object({
  email: z.string().email("Nieprawidłowy format emaila"),
  password: z.string().min(10, "Hasło musi mieć co najmniej 10 znaków"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Schema walidacji dla rejestracji
 */
export const RegisterSchema = z
  .object({
    email: z.string().email("Nieprawidłowy format emaila"),
    password: z
      .string()
      .min(10, "Hasło musi mieć co najmniej 10 znaków")
      .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
      .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
      .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Schema walidacji dla żądania resetu hasła
 */
export const ForgotPasswordSchema = z.object({
  email: z.string().email("Nieprawidłowy format emaila"),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/**
 * Schema walidacji dla resetu hasła
 */
export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, "Hasło musi mieć co najmniej 10 znaków")
      .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
      .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
      .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
