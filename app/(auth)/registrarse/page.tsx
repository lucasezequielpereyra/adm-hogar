import { AuthTabs } from "@/features/auth/auth-tabs"
import { SignupForm } from "@/features/auth/signup-form"

export const metadata = { title: "Crear cuenta" }

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return (
    <>
      <AuthTabs active="registrarse" next={next} />
      <SignupForm next={next} />
    </>
  )
}
