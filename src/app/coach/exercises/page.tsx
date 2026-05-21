import { redirect } from 'next/navigation'

// Coaches ven la misma biblioteca de ejercicios que los atletas
export default function CoachExercisesPage() {
  redirect('/athlete/exercises')
}
