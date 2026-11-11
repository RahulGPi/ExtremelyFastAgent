import {accessSync, constants} from 'node:fs';
import {join, delimiter} from 'node:path';
import {spawn} from 'node:child_process';

export function browserCandidates(platform=process.platform, env=process.env) {
 const explicit=env.SOLO_BROWSER ? [env.SOLO_BROWSER] : [];
 if(platform==='darwin') return [...explicit,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge','/Applications/Chromium.app/Contents/MacOS/Chromium'];
 if(platform==='win32') return [...explicit,...[env.PROGRAMFILES,env['PROGRAMFILES(X86)'],env.LOCALAPPDATA].filter(Boolean).flatMap(root=>[join(root,'Google','Chrome','Application','chrome.exe'),join(root,'Microsoft','Edge','Application','msedge.exe')])];
 return [...explicit,...(env.PATH||'').split(delimiter).filter(Boolean).flatMap(dir=>['google-chrome','google-chrome-stable','chromium','chromium-browser','microsoft-edge'].map(name=>join(dir,name)))];
}
export function openWindow(url) {
 if(process.env.SOLO_NO_WINDOW==='1') return;
 const browser=browserCandidates().find(path=>{try{accessSync(path,constants.X_OK);return true}catch{return false}});
 if(!browser){console.log(`No supported app-mode browser found. Open ${url} manually, or set SOLO_BROWSER to a Chrome/Chromium/Edge executable.`);return;}
 const child=spawn(browser,[`--app=${url}`,'--window-size=460,720','--new-window'],{detached:true,stdio:'ignore'});
 child.on('error',()=>console.error(`Could not open SOLO's window. Open ${url} manually.`));
 child.unref();
}
