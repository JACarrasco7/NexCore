'use client'

interface VideoPlayerProps {
  uri: string
}

export default function VideoPlayer({ uri }: VideoPlayerProps) {
  return (
    <video controls className="w-full rounded-lg" src={uri}>
      Tu navegador no soporta videos.
    </video>
  )
}
