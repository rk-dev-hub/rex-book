import { BOOKING_STEPS, type BookingStep } from '@/lib/booking'

/** 現在のステップを、色だけでなく番号・文字・aria-current でも示す。 */
export function Stepper({ current }: { current: BookingStep }) {
  const currentIndex = BOOKING_STEPS.findIndex((step) => step.key === current)

  return (
    <ol className="mb-6 grid grid-cols-3 gap-1" aria-label="予約の手順">
      {BOOKING_STEPS.map((step, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        return (
          <li
            key={step.key}
            aria-current={active ? 'step' : undefined}
            className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-xs ${
              active ? 'bg-wine-50 font-bold text-wine-900' : 'text-stone-500'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                active
                  ? 'border-wine-700 wine-gradient text-white'
                  : done
                    ? 'border-wine-700 bg-white text-wine-700'
                    : 'border-stone-300 bg-white text-stone-400'
              }`}
            >
              {done ? '✓' : index + 1}
            </span>
            <span>
              <span className="sr-only">{done ? '完了: ' : active ? '現在: ' : ''}</span>
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
