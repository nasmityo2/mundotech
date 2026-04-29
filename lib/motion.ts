import type { Variants, Transition } from "framer-motion"

/**
 * Easing curva tipo "out-expo" muy usada en productos premium (Apple, Linear).
 */
export const easeOutExpo = [0.22, 1, 0.36, 1] as const

/**
 * Transition base para entradas suaves.
 */
export const baseTransition: Transition = {
  duration: 0.45,
  ease: easeOutExpo,
}

/**
 * Aparece desde abajo con opacidad. Ideal para hero copy y secciones destacadas.
 */
export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
}

/**
 * Versión más sutil — para badges, microcopy y elementos secundarios.
 */
export const fadeUpSm: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOutExpo } },
}

/**
 * Aparece desde la izquierda. Útil para columnas en split layouts.
 */
export const fadeLeft: Variants = {
  hidden:  { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: baseTransition },
}

/**
 * Aparece desde la derecha.
 */
export const fadeRight: Variants = {
  hidden:  { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: baseTransition },
}

/**
 * Stagger contenedor — anima los hijos con delay incremental.
 */
export const staggerContainer = (stagger = 0.06, delayChildren = 0): Variants => ({
  hidden:  {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
})

/**
 * Pop suave para botones primarios al hover (úsalo con whileHover).
 */
export const popHover = {
  scale: 1.02,
  transition: { duration: 0.2, ease: easeOutExpo },
}

/**
 * Lift para cards interactivas (úsalo con whileHover).
 */
export const liftHover = {
  y: -4,
  transition: { duration: 0.25, ease: easeOutExpo },
}

/**
 * Slide horizontal usado entre pasos de checkout u onboarding.
 */
export const slideX = {
  enter:  (dir: 1 | -1) => ({ opacity: 0, x: dir * 32 }),
  center: { opacity: 1, x: 0, transition: baseTransition },
  exit:   (dir: 1 | -1) => ({
    opacity: 0,
    x: dir * -32,
    transition: { duration: 0.3, ease: easeOutExpo },
  }),
}
