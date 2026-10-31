import { useNavigate } from 'react-router-dom'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
        Welcome to tpTwo
      </h1>
      <InteractiveHoverButton
        text="Enter"
        className="w-40 p-3 text-lg"
        onClick={() => navigate('/home')}
      />
    </div>
  )
}
