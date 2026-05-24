/** 与「正在记录」一致的指示灯（扩散 + 呼吸） */
export function StatusPulseDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
      {active ? (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ganshale-mint opacity-40" />
      ) : null}
      <span
        className={[
          'relative inline-flex h-2 w-2 rounded-full',
          active ? 'bg-ganshale-mint gs-collection-dot-live' : 'bg-ganshale-track',
        ].join(' ')}
      />
    </span>
  )
}
