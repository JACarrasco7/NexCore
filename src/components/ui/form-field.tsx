'use client'

import { useFormContext, type FieldError, type RegisterOptions } from 'react-hook-form'
import type { ReactNode } from 'react'

type FormFieldProps = {
  name: string
  label?: string
  type?: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'select'
  placeholder?: string
  options?: RegisterOptions
  children?: ReactNode
  className?: string
}

const inputClass =
  'rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm outline-none transition focus:border-accent w-full'
const labelClass = 'text-sm font-medium text-foreground/70'
const errorClass = 'text-xs text-red-500 mt-1'

export function FormField({
  name,
  label,
  type = 'text',
  placeholder,
  options = {},
  children,
  className = '',
}: FormFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  const error = errors[name] as FieldError | undefined

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={name} className={labelClass}>
          {label}
        </label>
      )}

      {type === 'textarea' ? (
        <textarea
          id={name}
          {...register(name, options)}
          placeholder={placeholder}
          className={inputClass + ' min-h-20 resize-y'}
        />
      ) : type === 'select' ? (
        <select id={name} {...register(name, options)} className={inputClass}>
          {children}
        </select>
      ) : (
        <input
          id={name}
          type={type}
          {...register(name, { valueAsNumber: type === 'number', ...options })}
          placeholder={placeholder}
          className={inputClass}
        />
      )}

      {error && <p className={errorClass}>{error.message}</p>}
    </div>
  )
}
