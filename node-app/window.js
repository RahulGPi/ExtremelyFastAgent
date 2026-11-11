import {spawn} from 'node:child_process';

function openExternal(value) {
 let url;
 try { url=new URL(value); } catch { return; }
 if(!['http:','https:'].includes(url.protocol)) return;
 const command=process.platform==='darwin'?'open':process.platform==='win32'?'rundll32':'xdg-open';
 const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url.href]:[url.href];
 const child=spawn(command,args,{detached:true,stdio:'ignore'});
 child.on('error',()=>console.error('Could not open the source link in your browser.'));
 child.unref();
}

export async function openWindow(url, onClose) {
 if(process.env.SOLO_NO_WINDOW==='1') return;
 try {
  const {Application}=await import('@webviewjs/webview');
  const app=new Application();
  const win=app.createBrowserWindow({title:'SOLO',width:460,height:720,logical:true,decorations:false,resizable:true});
  const origin=new URL(url).origin;
  const view=win.createWebview({
   url:`${url}/?desktop=1`,
   navigationHandler:target=>{try{return new URL(target).origin===origin}catch{return false}},
   newWindowHandler:event=>{if(event.url) openExternal(event.url);return false;}
  });
  let collapsed=false;
  const toggle=()=>{collapsed=!collapsed;view.evaluateScript(`window.setSoloCollapsed(${collapsed})`);win.setSize(collapsed?100:460,collapsed?52:720,true);win.setAlwaysOnTop(collapsed);win.show();win.focus();};
  let closing=false;
  const close=()=>{if(closing)return;closing=true;app.exit();onClose();};
  app.on('application-close-requested',close);
  app.run();
  return {toggle,close};
 } catch(error) {
  console.error(`Could not open SOLO's native window: ${error.message}`);
  console.error(`Check the Node and system dependencies in README.md, or open ${url} in a browser.`);
 }
}
