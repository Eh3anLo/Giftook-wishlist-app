"use client"

import { useEffect } from "react"
import confetti from "canvas-confetti"

export default function CelebrationEffect({ active }) {
  useEffect(() => {
    if (!active) return

    const duration = 2200
    const end = Date.now() + duration

    ;(function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
      })

      confetti({
        particleCount: 5,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    })()
    // var duration = 15 * 1000
    // var animationEnd = Date.now() + duration
    // var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    // function randomInRange(min, max) {
    //   return Math.random() * (max - min) + min
    // }

    // var interval = setInterval(function () {
    //   var timeLeft = animationEnd - Date.now()

    //   if (timeLeft <= 0) {
    //     return clearInterval(interval)
    //   }

    //   var particleCount = 50 * (timeLeft / duration)
    //   // since particles fall down, start a bit higher than random
    //   confetti({
    //     ...defaults,
    //     particleCount,
    //     origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    //   })
    //   confetti({
    //     ...defaults,
    //     particleCount,
    //     origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    //   })
    // }, 250)
  }, [active])

  return null
}
