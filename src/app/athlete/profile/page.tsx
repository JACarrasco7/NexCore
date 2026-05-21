'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { SectionIntro } from '@/components/section-intro'
import { PageShell } from '@/components/layout'
import { useToast } from '@/components/ui/toast'
import { ExerciseSearch } from '@/components/exercise-search'
import { FoodSearch, type FoodResult } from '@/components/food-search'
import { Star, X, Plus, Camera } from 'lucide-react'

interface FavoriteExercise {
  id: string
  exerciseName: string
  addedAt: string
}

interface FavoriteFood {
  id: string
  foodName: string
  source: string
  kcal?: number
  proteinG?: number
  addedAt: string
}

export default function AthletProfilePage() {
  const { data: session } = useSession()
  const { pushToast } = useToast()

  const [favExercises, setFavExercises] = useState<FavoriteExercise[]>([])
  const [favFoods, setFavFoods] = useState<FavoriteFood[]>([])
  const [loading, setLoading] = useState(true)
  const [showExerciseSearch, setShowExerciseSearch] = useState(false)
  const [showFoodSearch, setShowFoodSearch] = useState(false)

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const [exRes, foodRes] = await Promise.all([
          fetch('/api/favorites/exercises'),
          fetch('/api/favorites/foods'),
        ])

        if (exRes.ok) {
          const data = await exRes.json()
          setFavExercises(data.favorites || [])
        }
        if (foodRes.ok) {
          const data = await foodRes.json()
          setFavFoods(data.favorites || [])
        }
      } catch (err) {
        console.error('Error fetching favorites:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFavorites()
  }, [])

  const handleAddExercise = async (exerciseName: string) => {
    const exists = favExercises.some((f) => f.exerciseName === exerciseName)
    if (!exists) {
      try {
        const res = await fetch('/api/favorites/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exerciseName }),
        })
        if (!res.ok) {
          pushToast({ title: 'Error al guardar favorito', variant: 'error' })
          return
        }
        const data = await res.json()
        const newFav: FavoriteExercise = {
          id: data.favorite.id,
          exerciseName: data.favorite.exerciseName,
          addedAt: data.favorite.addedAt,
        }
        setFavExercises([newFav, ...favExercises])
        setShowExerciseSearch(false)
        pushToast({ title: `✓ Ejercicio favorito guardado: ${exerciseName}`, variant: 'success' })
      } catch (err) {
        console.error('Error adding exercise:', err)
        pushToast({ title: 'Error de conexión', variant: 'error' })
      }
    }
  }

  const handleAddFood = async (food: FoodResult) => {
    const key = `${food.name}|${food.source}`
    const exists = favFoods.some((f) => `${f.foodName}|${f.source}` === key)
    if (!exists) {
      try {
        const res = await fetch('/api/favorites/foods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            foodName: food.name,
            source: food.source,
            kcal: food.kcal,
            proteinG: food.proteinG,
            carbsG: food.carbsG,
            fatG: food.fatG,
          }),
        })
        if (!res.ok) {
          pushToast({ title: 'Error al guardar favorito', variant: 'error' })
          return
        }
        const data = await res.json()
        const newFav: FavoriteFood = {
          id: data.favorite.id,
          foodName: data.favorite.foodName,
          source: data.favorite.source,
          kcal: data.favorite.kcal,
          proteinG: data.favorite.proteinG,
          addedAt: data.favorite.addedAt,
        }
        setFavFoods([newFav, ...favFoods])
        setShowFoodSearch(false)
        pushToast({ title: `✓ Alimento favorito guardado: ${food.name}`, variant: 'success' })
      } catch (err) {
        console.error('Error adding food:', err)
        pushToast({ title: 'Error de conexión', variant: 'error' })
      }
    }
  }

  const handleRemoveExercise = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/favorites/exercises?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        pushToast({ title: 'Error al eliminar favorito', variant: 'error' })
        return
      }
      setFavExercises(favExercises.filter((f) => f.id !== id))
      pushToast({ title: '✗ Ejercicio removido de favoritos', variant: 'success' })
    } catch (err) {
      console.error('Error removing exercise:', err)
      pushToast({ title: 'Error de conexión', variant: 'error' })
    }
  }

  const handleRemoveFood = async (id: string, name: string, source: string) => {
    try {
      const res = await fetch(
        `/api/favorites/foods?name=${encodeURIComponent(name)}&source=${encodeURIComponent(source)}`,
        {
          method: 'DELETE',
        }
      )
      if (!res.ok) {
        pushToast({ title: 'Error al eliminar favorito', variant: 'error' })
        return
      }
      setFavFoods(favFoods.filter((f) => f.id !== id))
      pushToast({ title: '✗ Alimento removido de favoritos', variant: 'success' })
    } catch (err) {
      console.error('Error removing food:', err)
      pushToast({ title: 'Error de conexión', variant: 'error' })
    }
  }

  return (
    <PageShell>
      <SectionIntro
        eyebrow="PREFERENCIAS"
        title="Mi Perfil"
        description="Gestiona tus preferencias: ejercicios, alimentos y equipamiento"
      />

      <div className="space-y-8">
        {/* 🏋️ EJERCICIOS FAVORITOS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              💪 Ejercicios Favoritos
            </h2>
            <button
              onClick={() => setShowExerciseSearch(!showExerciseSearch)}
              className="bg-accent/10 hover:bg-accent/20 text-accent rounded-lg px-3 py-1.5 text-sm flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              Añadir
            </button>
          </div>

          {showExerciseSearch && (
            <div className="mb-4 p-4 border border-accent/30 rounded-lg bg-accent/5">
              <ExerciseSearch
                onSelect={handleAddExercise}
                showFavorites={false}
              />
            </div>
          )}

          {loading ? (
            <div className="text-foreground/50 text-sm">Cargando...</div>
          ) : favExercises.length === 0 ? (
            <div className="border-line bg-surface rounded-lg border p-6 text-center">
              <div className="text-foreground/50 text-sm">
                Aún no tienes ejercicios favoritos
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {favExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="border-line bg-surface flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="text-foreground font-medium text-sm">
                    {ex.exerciseName}
                  </span>
                  <button
                    onClick={() => handleRemoveExercise(ex.id, ex.exerciseName)}
                    className="text-foreground/50 hover:text-red-400 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 🥗 ALIMENTOS FAVORITOS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              🥗 Alimentos Favoritos
            </h2>
            <button
              onClick={() => setShowFoodSearch(!showFoodSearch)}
              className="bg-accent/10 hover:bg-accent/20 text-accent rounded-lg px-3 py-1.5 text-sm flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              Añadir
            </button>
          </div>

          {showFoodSearch && (
            <div className="mb-4 p-4 border border-accent/30 rounded-lg bg-accent/5">
              <FoodSearch
                onSelect={handleAddFood}
                showFavorites={false}
              />
            </div>
          )}

          {loading ? (
            <div className="text-foreground/50 text-sm">Cargando...</div>
          ) : favFoods.length === 0 ? (
            <div className="border-line bg-surface rounded-lg border p-6 text-center">
              <div className="text-foreground/50 text-sm">
                Aún no tienes alimentos favoritos
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {favFoods.map((food) => (
                <div
                  key={food.id}
                  className="border-line bg-surface flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="text-foreground font-medium text-sm">
                      {food.foodName}
                    </div>
                    <div className="text-foreground/50 text-xs">
                      {food.kcal && `${food.kcal} kcal`}
                      {food.proteinG && ` • ${food.proteinG}g prot`}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleRemoveFood(food.id, food.foodName, food.source)
                    }
                    className="text-foreground/50 hover:text-red-400 transition ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 📝 Nota: Medidas y Fotos de Gym */}
        <section className="border-line bg-surface/50 rounded-lg border p-4">
          <p className="text-sm text-foreground/60">
            <strong>📊 Medidas corporales:</strong> Disponibles en Check-in semanal y Daily Logs
          </p>
          <p className="text-sm text-foreground/60 mt-2">
            <strong>📸 Fotos de progreso:</strong> Carga en la pestaña "Fotos de Progreso"
          </p>
          <p className="text-sm text-foreground/60 mt-2">
            <strong>🏋️ Máquinas del gym:</strong> Configura en tu contexto de atleta
          </p>
        </section>
      </div>
    </PageShell>
  )
}
