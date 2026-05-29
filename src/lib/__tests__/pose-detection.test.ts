import { describe, it, expect, vi } from 'vitest'
import { PoseDetector } from '../pose-detection'

describe('PoseDetector', () => {
  it('calculates angles correctly', () => {
    const detector = new PoseDetector()
    const mockLandmarks = [
      { x: 0, y: 0, z: 0, visibility: 1 },
      { x: 0, y: 1, z: 0, visibility: 1 },
      { x: 1, y: 1, z: 0, visibility: 1 },
    ]
    const angle = (detector as any).calculateAngle(0, 1, 2, mockLandmarks)
    expect(angle).toBeCloseTo(90, 0)
  })
})
