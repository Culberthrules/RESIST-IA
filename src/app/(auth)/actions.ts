'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { loginSchema, registerSchema } from '@/lib/validation/schemas';
import { firstZodIssueMessage } from '@/lib/validation/zod-utils';

export interface AuthState {
  error?: string;
  success?: string;
}

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: firstZodIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function registerAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    fullName: formData.get('fullName') as string,
    laboratoryCode: formData.get('laboratoryCode') as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: firstZodIssueMessage(parsed.error) };
  }

  const supabase = await createClient();

  const { data: laboratoryId, error: labError } = await supabase.rpc(
    'get_laboratory_id_by_code',
    { lab_code: parsed.data.laboratoryCode }
  );

  if (labError || !laboratoryId) {
    return { error: 'Laboratory code not found. Contact your administrator.' };
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        laboratory_id: laboratoryId,
        role: 'technician',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Account created! Check your email to confirm, then sign in.' };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
