/** The native bridge is preferred; web clipboard is a fallback for an old main process. */
export async function copyBrickCanvas(image:HTMLCanvasElement){
  if(window.ganshaleDesktop?.copyBrickImage){
    try{
      const result=await window.ganshaleDesktop.copyBrickImage(image.toDataURL('image/png'))
      if(result.ok)return
    }catch{/* Try the renderer clipboard instead of failing on an old bridge. */}
  }
  if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw new Error('图片剪贴板不可用')
  const blob=await new Promise<Blob>((resolve,reject)=>image.toBlob(value=>value?resolve(value):reject(new Error('无法生成图片')),'image/png'))
  await navigator.clipboard.write([new ClipboardItem({'image/png':blob})])
}
