# 🎨 Form Patterns & Input Standardization — NEXUM Frontend

## Overview

Este documento estandariza todos los elementos de formulario en NEXUM. Asegura consistencia visual y UX en toda la aplicación.

**Tech Stack:**

- React 18 + TypeScript
- Tailwind CSS (dark mode only)
- Custom form components

---

## 1. Input Base Pattern

### 1.1 Text Input (default)

```tsx
<input
  type="text"
  placeholder="Nombre de atleta"
  className="border-line bg-surface-strong focus:border-accent rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
/>
```

**CSS Class Breakdown:**

- `rounded-2xl` — Border radius (32px)
- `border border-line` — 1px border using line color token
- `bg-surface-strong` — Background in dark mode
- `px-4 py-2.5` — Padding (horizontal 16px, vertical 10px)
- `text-sm` — Font size 14px
- `outline-none` — Remove browser default outline
- `transition` — Smooth color transition on focus
- `focus:border-accent` — Border turns accent (#7c3aed) on focus

**Responsive:** Same on all sizes (inputs don't scale)

### 1.2 Text Input with Icon

```tsx
<div className="relative">
  <input
    type="email"
    placeholder="correo@ejemplo.com"
    className="border-line bg-surface-strong focus:border-accent rounded-2xl border py-2.5 pr-4 pl-10 text-sm transition outline-none"
  />
  <span className="text-foreground/50 absolute top-1/2 left-3 -translate-y-1/2">📧</span>
</div>
```

### 1.3 Disabled Input

```tsx
<input
  type="text"
  value="Valor fijo"
  disabled
  className="border-line bg-surface-strong cursor-not-allowed rounded-2xl border px-4 py-2.5 text-sm opacity-50 transition outline-none"
/>
```

### 1.4 Input with Error State

```tsx
<div className="flex flex-col gap-1.5">
  <input
    type="text"
    className="bg-surface-strong rounded-2xl border border-red-600 px-4 py-2.5 text-sm transition outline-none focus:border-red-500"
  />
  <span className="text-xs text-red-500">Este campo es obligatorio</span>
</div>
```

---

## 2. Label Pattern

### 2.1 Standard Label

```tsx
<label className="text-foreground/70 text-sm font-medium">Nombre completo</label>
```

**CSS Class Breakdown:**

- `text-sm` — Font size 14px
- `font-medium` — Font weight 500
- `text-foreground/70` — Color with 70% opacity (muted)

### 2.2 Label with Required Indicator

```tsx
<label className="text-foreground/70 text-sm font-medium">
  Nombre completo
  <span className="ml-1 text-red-500">*</span>
</label>
```

### 2.3 Label with Helper Text

```tsx
<div className="flex flex-col gap-2">
  <label className="text-foreground/70 text-sm font-medium">Peso corporal (kg)</label>
  <input
    type="number"
    placeholder="Ej: 75.5"
    className="border-line bg-surface-strong focus:border-accent rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
  />
  <span className="text-foreground/50 text-xs">
    Ingresa tu peso actual sin incluir equipamiento
  </span>
</div>
```

---

## 3. Textarea Pattern

### 3.1 Standard Textarea

```tsx
<textarea
  placeholder="Escribe tus notas aquí..."
  rows={4}
  className="border-line bg-surface-strong focus:border-accent resize-none rounded-2xl border px-4 py-3 text-sm transition outline-none"
/>
```

**CSS Class Breakdown:**

- `py-3` — Slightly more vertical padding than input
- `resize-none` — Disable manual resizing (use `rows` prop)

### 3.2 Textarea with Character Counter

```tsx
const [count, setCount] = useState(0)
const max = 500

;<div className="flex flex-col gap-2">
  <textarea
    maxLength={max}
    value={text}
    onChange={(e) => setCount(e.target.value.length)}
    className="border-line bg-surface-strong focus:border-accent rounded-2xl border px-4 py-3 text-sm transition outline-none"
  />
  <div className="flex justify-between">
    <span className="text-foreground/50 text-xs"></span>
    <span className={`text-xs ${count > max * 0.9 ? 'text-amber-500' : 'text-foreground/50'}`}>
      {count} / {max}
    </span>
  </div>
</div>
```

---

## 4. Select / Dropdown Pattern

### 4.1 Standard Select

```tsx
<select className="border-line bg-surface-strong focus:border-accent rounded-2xl border px-4 py-2.5 text-sm transition outline-none">
  <option value="">Selecciona una opción</option>
  <option value="volumen">Volumen (ganancia muscular)</option>
  <option value="definicion">Definición (pérdida de grasa)</option>
  <option value="mantenimiento">Mantenimiento</option>
</select>
```

### 4.2 Select with Icon (Custom Component Recommended)

Para selects complejos, usar librerías como `@headlessui/react` o component personalizado:

```tsx
// src/components/ui/select.tsx
import { ChevronDownIcon } from '@heroicons/react/24/solid'

export function CustomSelect({ options, value, onChange, label, ...props }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="border-line bg-surface-strong focus:border-accent appearance-none rounded-2xl border px-4 py-2.5 pr-10 text-sm transition outline-none"
        {...props}
      >
        <option value="">Selecciona...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="text-foreground/50 pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
    </div>
  )
}
```

---

## 5. Checkbox Pattern

### 5.1 Standard Checkbox

```tsx
<div className="flex items-center gap-3">
  <input
    type="checkbox"
    id="agree"
    className="border-line bg-surface-strong accent-accent h-4 w-4 cursor-pointer rounded border"
  />
  <label htmlFor="agree" className="text-foreground/70 cursor-pointer text-sm font-medium">
    Acepto los términos y condiciones
  </label>
</div>
```

### 5.2 Checkbox Group

```tsx
const [selected, setSelected] = useState<string[]>([])

;<div className="flex flex-col gap-3">
  <label className="text-foreground/70 text-sm font-medium">Servicios incluidos</label>
  {[
    { id: 'nutrition', label: 'Plan nutricional' },
    { id: 'training', label: 'Plan de entrenamiento' },
    { id: 'coaching', label: 'Coaching personalizado' },
  ].map((item) => (
    <div key={item.id} className="flex items-center gap-3">
      <input
        type="checkbox"
        id={item.id}
        checked={selected.includes(item.id)}
        onChange={(e) =>
          setSelected(
            e.target.checked ? [...selected, item.id] : selected.filter((x) => x !== item.id)
          )
        }
        className="border-line bg-surface-strong accent-accent h-4 w-4 cursor-pointer rounded border"
      />
      <label htmlFor={item.id} className="text-foreground/70 cursor-pointer text-sm">
        {item.label}
      </label>
    </div>
  ))}
</div>
```

---

## 6. Radio Button Pattern

### 6.1 Standard Radio

```tsx
const [selected, setSelected] = useState('volumen')

;<div className="flex flex-col gap-3">
  <label className="text-foreground/70 text-sm font-medium">Objetivo principal</label>
  {[
    { value: 'volumen', label: 'Volumen (ganancia muscular)' },
    { value: 'definicion', label: 'Definición (pérdida de grasa)' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
  ].map((option) => (
    <div key={option.value} className="flex items-center gap-3">
      <input
        type="radio"
        id={option.value}
        name="objetivo"
        value={option.value}
        checked={selected === option.value}
        onChange={(e) => setSelected(e.target.value)}
        className="border-line bg-surface-strong accent-accent h-4 w-4 cursor-pointer border"
      />
      <label htmlFor={option.value} className="text-foreground/70 cursor-pointer text-sm">
        {option.label}
      </label>
    </div>
  ))}
</div>
```

---

## 7. Number Input Pattern

### 7.1 Basic Number Input

```tsx
<input
  type="number"
  min="0"
  max="300"
  step="0.1"
  placeholder="Ej: 75.5"
  className="border-line bg-surface-strong focus:border-accent rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
/>
```

### 7.2 Number Input with Spinner Controls

```tsx
const [value, setValue] = useState(75.5)

;<div className="border-line bg-surface-strong flex items-center gap-2 rounded-2xl border px-4 py-2.5">
  <button
    onClick={() => setValue((v) => Math.max(0, v - 0.5))}
    className="text-foreground/50 hover:text-foreground transition"
  >
    −
  </button>
  <input
    type="number"
    value={value}
    onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
    className="flex-1 bg-transparent text-center text-sm outline-none"
  />
  <button
    onClick={() => setValue((v) => v + 0.5)}
    className="text-foreground/50 hover:text-foreground transition"
  >
    +
  </button>
</div>
```

---

## 8. Date Input Pattern

### 8.1 Standard Date Input

```tsx
<input
  type="date"
  className="border-line bg-surface-strong focus:border-accent rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
/>
```

### 8.2 Date Range Input

```tsx
const [dateRange, setDateRange] = useState({ from: '', to: '' })

;<div className="flex gap-4">
  <div className="flex flex-1 flex-col gap-2">
    <label className="text-foreground/70 text-sm font-medium">Desde</label>
    <input
      type="date"
      value={dateRange.from}
      onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
      className="border-line bg-surface-strong focus:border-accent rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
    />
  </div>
  <div className="flex flex-1 flex-col gap-2">
    <label className="text-foreground/70 text-sm font-medium">Hasta</label>
    <input
      type="date"
      value={dateRange.to}
      onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
      className="border-line bg-surface-strong focus:border-accent rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
    />
  </div>
</div>
```

---

## 9. Form Layout Patterns

### 9.1 Single Column Form

```tsx
<form className="flex flex-col gap-6">
  <div className="flex flex-col gap-2">
    <label className="text-foreground/70 text-sm font-medium">Nombre completo</label>
    <input type="text" placeholder="..." className="..." />
  </div>

  <div className="flex flex-col gap-2">
    <label className="text-foreground/70 text-sm font-medium">Email</label>
    <input type="email" placeholder="..." className="..." />
  </div>

  <button className="bg-accent hover:bg-accent/90 rounded-2xl px-6 py-2.5 text-sm font-medium text-white transition">
    Guardar
  </button>
</form>
```

### 9.2 Two Column Form (Responsive)

```tsx
<form className="flex flex-col gap-6">
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
    <div className="flex flex-col gap-2">
      <label className="text-foreground/70 text-sm font-medium">Nombre</label>
      <input type="text" className="..." />
    </div>

    <div className="flex flex-col gap-2">
      <label className="text-foreground/70 text-sm font-medium">Apellido</label>
      <input type="text" className="..." />
    </div>
  </div>

  <div className="flex flex-col gap-2">
    <label className="text-foreground/70 text-sm font-medium">Email</label>
    <input type="email" className="..." />
  </div>
</form>
```

### 9.3 Form with Sections

```tsx
<form className="flex flex-col gap-8">
  {/* Section 1 */}
  <div className="space-y-4">
    <h3 className="text-foreground text-lg font-semibold">Información Personal</h3>
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-foreground/70 text-sm font-medium">Nombre</label>
        <input type="text" className="..." />
      </div>
    </div>
  </div>

  {/* Section 2 */}
  <div className="space-y-4">
    <h3 className="text-foreground text-lg font-semibold">Objetivos</h3>
    <div className="flex flex-col gap-4">{/* ... more fields */}</div>
  </div>

  {/* Actions */}
  <div className="border-line flex gap-3 border-t pt-4">
    <button className="border-line hover:bg-surface-strong rounded-2xl border px-6 py-2.5 text-sm font-medium transition">
      Cancelar
    </button>
    <button className="bg-accent hover:bg-accent/90 rounded-2xl px-6 py-2.5 text-sm font-medium text-white transition">
      Guardar cambios
    </button>
  </div>
</form>
```

---

## 10. Button Patterns

### 10.1 Primary Button

```tsx
<button className="bg-accent hover:bg-accent/90 rounded-2xl px-6 py-2.5 text-sm font-medium text-white transition active:scale-95">
  Guardar
</button>
```

### 10.2 Secondary Button

```tsx
<button className="border-line text-foreground hover:bg-surface-strong rounded-2xl border px-6 py-2.5 text-sm font-medium transition">
  Cancelar
</button>
```

### 10.3 Destructive Button

```tsx
<button className="rounded-2xl bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 active:scale-95">
  Eliminar
</button>
```

### 10.4 Button with Loading State

```tsx
const [isLoading, setIsLoading] = useState(false)

;<button
  onClick={handleSubmit}
  disabled={isLoading}
  className="bg-accent hover:bg-accent/90 rounded-2xl px-6 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
>
  {isLoading ? (
    <span className="flex items-center gap-2">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Guardando...
    </span>
  ) : (
    'Guardar'
  )}
</button>
```

---

## 11. Validation & Error Display

### 11.1 Inline Validation

```tsx
import { useState } from 'react'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

export function LoginForm() {
  const [data, setData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = schema.safeParse(data)

    if (!parsed.success) {
      const formatted = parsed.error.flatten().fieldErrors
      setErrors(
        Object.fromEntries(Object.entries(formatted).map(([k, v]) => [k, (v as string[])[0]]))
      )
      return
    }

    // Submit...
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-foreground/70 text-sm font-medium">Email</label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          className={`rounded-2xl border ${
            errors.email ? 'border-red-600' : 'border-line'
          } bg-surface-strong focus:border-accent px-4 py-2.5 text-sm transition outline-none`}
        />
        {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-foreground/70 text-sm font-medium">Contraseña</label>
        <input
          type="password"
          value={data.password}
          onChange={(e) => setData({ ...data, password: e.target.value })}
          className={`rounded-2xl border ${
            errors.password ? 'border-red-600' : 'border-line'
          } bg-surface-strong focus:border-accent px-4 py-2.5 text-sm transition outline-none`}
        />
        {errors.password && <span className="text-xs text-red-500">{errors.password}</span>}
      </div>

      <button
        type="submit"
        className="bg-accent rounded-2xl px-6 py-2.5 text-sm font-medium text-white"
      >
        Ingresar
      </button>
    </form>
  )
}
```

---

## 12. Component Examples (Reusable)

### 12.1 FormField Component

```tsx
// src/components/ui/form-field.tsx
interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  helperText?: string
  children: React.ReactNode
}

export function FormField({ label, error, required, helperText, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-foreground/70 text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
      {helperText && <span className="text-foreground/50 text-xs">{helperText}</span>}
    </div>
  )
}

// Usage:
;<FormField label="Peso corporal" required error={errors.weight} helperText="En kilogramos">
  <input type="number" className="..." />
</FormField>
```

### 12.2 TextInput Component

```tsx
// src/components/ui/text-input.tsx
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

export function TextInput({ label, error, helperText, icon, ...props }: TextInputProps) {
  return (
    <FormField label={label} error={error} helperText={helperText}>
      <div className="relative">
        <input
          {...props}
          className={`rounded-2xl border ${
            error ? 'border-red-600' : 'border-line'
          } bg-surface-strong px-4 py-2.5 ${icon ? 'pl-10' : ''} focus:border-accent text-sm transition outline-none`}
        />
        {icon && <div className="absolute top-1/2 left-3 -translate-y-1/2">{icon}</div>}
      </div>
    </FormField>
  )
}

// Usage:
;<TextInput type="email" label="Correo electrónico" placeholder="correo@ejemplo.com" icon="📧" />
```

---

## 13. Dark Mode Support

Todos los inputs ya están optimizados para dark mode (único modo soportado):

```tsx
// Color tokens para dark mode:
// bg-surface-strong → #222428 (fondo de inputs)
// border-line → #444856 (bordes)
// text-foreground → #F5F5F5 (texto)
// text-foreground/70 → #F5F5F5 con 70% opacidad (texto muted)
// focus:border-accent → #7c3aed (morado)
```

---

## 14. Best Practices Checklist

✅ **Do:**

- Use consistent class names for inputs
- Always include labels for accessibility
- Validate on both client and server
- Show error messages inline
- Use rounded-2xl for consistency
- Provide helper text for complex fields
- Test keyboard navigation

❌ **Don't:**

- Use outline input style (use border instead)
- Mix rounded-xl and rounded-2xl
- Create custom inputs when standard ones work
- Forget error states
- Use placeholder as label
- Disable inputs without explanation
- Forget accessibility attributes (id, for, etc.)

---

**Last Updated:** 9 de mayo 2026
**Version:** 1.0
