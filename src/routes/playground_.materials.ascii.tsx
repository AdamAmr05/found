import { createFileRoute, notFound } from '@tanstack/react-router'
import { AsciiMaterialLab } from '~/features/materials/ascii/AsciiMaterialLab'

export const Route = createFileRoute('/playground_/materials/ascii')({
  beforeLoad: () => {
    if (import.meta.env.PROD) throw notFound()
  },
  component: AsciiMaterialLab,
})
