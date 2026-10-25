// 炉火色粒子：挂在一个 canvas 上，emit() 在指定点喷出火星，受重力下坠并熄灭。
const COLORS = ['#fcd34d', '#fb923c', '#f9a8d4', '#fdba74']

export function createSparks(canvas) {
  const ctx = canvas.getContext('2d')
  const parts = []
  let frame = 0

  const resize = () => {
    const ratio = window.devicePixelRatio || 1
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  }

  const tick = () => {
    const { width, height } = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, width, height)
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.09
      p.vx *= 0.98
      p.life -= p.decay
      if (p.life <= 0) { parts.splice(i, 1); continue }
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * p.life + 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    frame = parts.length > 0 ? requestAnimationFrame(tick) : 0
  }

  resize()
  return {
    /**
     * @param x - canvas 坐标
     * @param y - canvas 坐标
     * @param count - 粒子数
     * @param power - 初速度倍率
     * @param spread - 向上张开的角度（弧度）
     */
    emit(x, y, count, power = 1, spread = Math.PI * 0.7) {
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread
        const speed = (0.8 + Math.random() * 1.8) * power
        parts.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.02 + Math.random() * 0.025,
          r: 0.8 + Math.random() * 1.6,
          color: COLORS[(Math.random() * COLORS.length) | 0],
        })
      }
      if (frame === 0) frame = requestAnimationFrame(tick)
    },
    resize,
    dispose() { cancelAnimationFrame(frame); parts.length = 0 },
  }
}
