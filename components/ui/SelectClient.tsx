'use client'

import dynamic from 'next/dynamic'
import { ComponentProps } from 'react'

// Cargamos react-select solo en cliente, sin SSR
const ReactSelect = dynamic(() => import('react-select'), { ssr: false })

// Esto hace que SelectClient acepte TODOS los props de react-select
// styles, options, onChange, isMulti, etc. Todo igual.
export type SelectClientProps = ComponentProps<typeof ReactSelect>

export default function SelectClient(props: SelectClientProps) {
  return <ReactSelect {...props} />
}