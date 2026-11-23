import { AuthTabs } from "@/features/auth/auth-tabs"
import { LoginForm } from "@/features/auth/login-form"

export const metadata = { title: "Ingresar" }

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return (
    <>
      <AuthTabs active="ingresar" next={next} />
      <LoginForm next={next} />
    </>
  )
}
