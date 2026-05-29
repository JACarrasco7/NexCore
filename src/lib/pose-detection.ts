import { Pose, Results, POSE_CONNECTIONS } from '@mediapipe/pose'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility: number
}

export interface PoseMetrics {
  hipAngle: number
  kneeAngle: number
  shoulderAngle: number
  rom: { hip: number; knee: number; shoulder: number }
}

export class PoseDetector {
  private pose: Pose

  constructor() {
    this.pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    })
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
  }

  async processFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): Promise<PoseMetrics | null> {
    return new Promise((resolve) => {
      this.pose.onResults((results: Results) => {
        if (!results.poseLandmarks) {
          resolve(null)
          return
        }
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.save()
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS)
          drawLandmarks(ctx, results.poseLandmarks)
          ctx.restore()
        }
        const metrics = this.calculateAngles(results.poseLandmarks as PoseLandmark[])
        resolve(metrics)
      })
      this.pose.send({ image: video })
    })
  }

  private calculateAngles(landmarks: PoseLandmark[]): PoseMetrics {
    const getAngle = (a: number, b: number, c: number) => {
      const la = landmarks[a]
      const lb = landmarks[b]
      const lc = landmarks[c]
      const v1 = { x: la.x - lb.x, y: la.y - lb.y }
      const v2 = { x: lc.x - lb.x, y: lc.y - lb.y }
      const dot = v1.x * v2.x + v1.y * v2.y
      const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2)
      const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2)
      return (Math.acos(dot / (mag1 * mag2)) * 180) / Math.PI
    }

    return {
      hipAngle: getAngle(24, 23, 25),
      kneeAngle: getAngle(23, 25, 27),
      shoulderAngle: getAngle(12, 11, 13),
      rom: {
        hip: getAngle(24, 23, 25),
        knee: getAngle(23, 25, 27),
        shoulder: getAngle(12, 11, 13),
      },
    }
  }
}
