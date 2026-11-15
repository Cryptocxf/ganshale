import { WeeklyHoursMinutesDisplay } from './WeeklyHoursMinutesDisplay'

/** 本周总工作时长主数字（精确到秒） */
export function WeeklyWorkDurationDisplay({
  totalSec,
}: {
  totalSec: number
  live?: boolean
}) {
  return <WeeklyHoursMinutesDisplay totalSec={totalSec} size="md" />
}
