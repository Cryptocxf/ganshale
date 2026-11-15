/** Monthly effort bands; annual bands scale by twelve for a comparable pace. */
export const BRICK_SPEECH_BANDS = [
  { hours:0, text:'先搬一块，\n慢慢找状态。' },
  { hours:8, text:'开工啦，\n今天稳稳来。' },
  { hours:24, text:'砖不算多，\n每块都算数。' },
  { hours:48, text:'小有规模，\n继续稳稳盖。' },
  { hours:72, text:'这几块砖，\n可没少费劲。' },
  { hours:96, text:'忙得挺充实，\n记得喝口水。' },
  { hours:120, text:'砖越搬越多，\n肩膀也要歇歇。' },
  { hours:144, text:'这座小金字塔，\n都是认真攒的。' },
  { hours:176, text:'投入已经很多，\n也要照顾自己。' },
  { hours:208, text:'砖可以明天搬，\n今晚先好好休息。' },
] as const

export function brickCharacterSpeech(seconds:number,mode:'month'|'year'){
  const hours=(Number.isFinite(seconds)?Math.max(0,seconds):0)/3600/(mode==='year'?12:1)
  return [...BRICK_SPEECH_BANDS].reverse().find(band=>hours>=band.hours)!.text
}
