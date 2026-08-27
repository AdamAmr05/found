import { createFileRoute } from '@tanstack/react-router'
import { AsciiMaterialLab } from '~/features/materials/ascii/AsciiMaterialLab'

export const Route = createFileRoute('/playground_/materials/ascii')({
  component: AsciiMaterialLab,
})
