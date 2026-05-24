import { OfficeDurationHmsDisplay } from './OfficeDurationHmsDisplay'

/** 本周总工作时长主数字（精确到秒） */
export function WeeklyWorkDurationDisplay({
  totalSec,
  live = false,
}: {
  totalSec: number
  live?: boolean
}) {
  return <OfficeDurationHmsDisplay totalSec={totalSec} live={live} />
}
