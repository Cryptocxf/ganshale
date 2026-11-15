/** Bound and validate the PNG before handing it to Electron's image decoder. */
function validateBrickClipboardPng(dataUrl) {
  if(typeof dataUrl!=='string'||dataUrl.length>32*1024*1024||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl))throw new Error('仅支持复制本页生成的 PNG 图片')
  const bytes=Buffer.from(dataUrl.slice('data:image/png;base64,'.length),'base64')
  if(bytes.length<33||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.toString('ascii',12,16)!=='IHDR')throw new Error('PNG 图片格式无效')
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20)
  if(!((width===1920&&height===1080)||(width===1080&&height===1920)))throw new Error('不支持的图片尺寸')
  return {bytes,width,height}
}
async function writeBrickClipboardPng(api,dataUrl){
  const {bytes,width,height}=validateBrickClipboardPng(dataUrl)
  const image=api.nativeImage.createFromBuffer(bytes)
  if(image.isEmpty()||image.getSize().width!==width||image.getSize().height!==height)throw new Error('无法读取图片')
  if(typeof api.ClipboardItem==='function'&&typeof api.clipboard.write==='function'){
    await api.clipboard.write([new api.ClipboardItem({'image/png':new Blob([new Uint8Array(image.toPNG())],{type:'image/png'})})])
  }else if(typeof api.clipboard.writeImage==='function'){
    api.clipboard.writeImage(image)
  }else throw new Error('当前客户端不支持图片剪贴板')
}
function createBrickClipboardHandler(api,getMainWindow,onError=()=>{}){
  return async(event,dataUrl)=>{
    try{
      const win=getMainWindow()
      if(!win||win.isDestroyed()||event.sender!==win.webContents||event.senderFrame!==event.sender.mainFrame)throw new Error('不允许复制此窗口的图片')
      await writeBrickClipboardPng(api,dataUrl)
      return {ok:true}
    }catch(error){onError(error);return {ok:false,error:'复制图片失败，请重试或使用下载图片'}}
  }
}
module.exports={validateBrickClipboardPng,writeBrickClipboardPng,createBrickClipboardHandler}
