(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const f of o.addedNodes)f.tagName==="LINK"&&f.rel==="modulepreload"&&i(f)}).observe(document,{childList:!0,subtree:!0});function t(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(s){if(s.ep)return;s.ep=!0;const o=t(s);fetch(s.href,o)}})();const P="[BarcodeScanner]";function m(r,e,...t){(console[r]??console.log)(`${P} ${e}`,...t)}const d={debug:(r,...e)=>m("debug",r,...e),info:(r,...e)=>m("info",r,...e),warn:(r,...e)=>m("warn",r,...e),error:(r,...e)=>m("error",r,...e)};class c{stream=null;videoTrack=null;state="idle";currentDeviceId=null;handlers={statechange:new Set,error:new Set,trackended:new Set};get mediaStream(){return this.stream}get track(){return this.videoTrack}get currentState(){return this.state}get activeDeviceId(){return this.currentDeviceId}on(e,t){return this.handlers[e].add(t),()=>this.handlers[e].delete(t)}emit(e,...t){for(const i of this.handlers[e])try{i(...t)}catch(s){d.error("Event handler error",s)}}setState(e){this.state!==e&&(this.state=e,this.emit("statechange",e))}static isSupported(){if(typeof navigator>"u")return!1;if(navigator.mediaDevices&&typeof navigator.mediaDevices.getUserMedia=="function")return!0;const e=navigator;return typeof e.getUserMedia=="function"||typeof e.webkitGetUserMedia=="function"||typeof e.mozGetUserMedia=="function"}static isSecureContext(){if(typeof window>"u")return!1;if(typeof window.isSecureContext=="boolean")return window.isSecureContext;const e=window.location?.protocol,t=window.location?.hostname;return e==="https:"||t==="localhost"||t==="127.0.0.1"||t==="[::1]"}static getEnvironmentInfo(){const e=!!(typeof navigator<"u"&&navigator.mediaDevices),t=!!(e&&typeof navigator.mediaDevices.getUserMedia=="function");return{supported:c.isSupported(),secureContext:c.isSecureContext(),hasMediaDevices:e,hasGetUserMedia:t,protocol:typeof location<"u"?location.protocol:"",hostname:typeof location<"u"?location.hostname:"",userAgent:typeof navigator<"u"?navigator.userAgent:""}}static buildUnavailableError(){const e=c.getEnvironmentInfo();return e.secureContext?!e.hasMediaDevices||!e.hasGetUserMedia?{code:"NotFoundError",message:`getUserMedia is not available in this browser/context. UA: ${e.userAgent.slice(0,80)}…`}:{code:"NotFoundError",message:"Camera API is not available"}:{code:"SecurityError",message:`Camera requires a secure context (HTTPS or localhost). Current origin is ${e.protocol}//${e.hostname}. On Samsung Internet / Chrome, navigator.mediaDevices is hidden on insecure pages. Serve the app over HTTPS or open it from localhost.`}}async listDevices(){if(!c.isSupported())throw c.buildUnavailableError();return(await navigator.mediaDevices.enumerateDevices()).filter(i=>i.kind==="videoinput").map(i=>{const s=this.inferFacingMode(i.label,i.deviceId);return{deviceId:i.deviceId,label:i.label||`Camera ${i.deviceId.slice(0,8)}`,facingMode:s,groupId:i.groupId}})}inferFacingMode(e,t){const i=e.toLowerCase();if(i.includes("back")||i.includes("rear")||i.includes("environment")||i.includes("world"))return"environment";if(i.includes("front")||i.includes("user")||i.includes("face")||i.includes("selfie"))return"user"}async start(e={}){if(!c.isSecureContext()||!c.isSupported()){const i=c.buildUnavailableError();throw this.setState("error"),this.emit("error",i),i}await this.stop(),this.setState("requesting");const t=this.buildMediaConstraints(e);try{d.info("Requesting camera with constraints",t);const i=await navigator.mediaDevices.getUserMedia(t);this.stream=i;const s=i.getVideoTracks();if(this.videoTrack=s[0]??null,!this.videoTrack)throw i.getTracks().forEach(o=>o.stop()),this.stream=null,this.makeError("NotFoundError","No video track in the obtained stream");return this.currentDeviceId=this.videoTrack.getSettings().deviceId??null,this.videoTrack.addEventListener("ended",this.handleTrackEnded),this.setState("active"),d.info("Camera started",{deviceId:this.currentDeviceId,settings:this.videoTrack.getSettings()}),i}catch(i){const s=this.normalizeError(i);throw this.setState("error"),this.emit("error",s),d.error("Camera start failed",s),s}}async stop(){this.videoTrack&&(this.videoTrack.removeEventListener("ended",this.handleTrackEnded),this.videoTrack.stop(),this.videoTrack=null),this.stream&&(this.stream.getTracks().forEach(e=>e.stop()),this.stream=null),this.currentDeviceId=null,this.state!=="idle"&&this.state!=="stopped"&&this.setState("stopped"),d.info("Camera stopped")}handleTrackEnded=()=>{d.warn("Video track ended unexpectedly"),this.videoTrack=null,this.stream=null,this.currentDeviceId=null,this.setState("stopped"),this.emit("trackended")};async switchDevice(e,t){const i=this.videoTrack?.getSettings()??{},s={deviceId:e,width:i.width,height:i.height,frameRate:i.frameRate,...t};return this.start(s)}async startBackCamera(e){return this.start({facingMode:"environment",width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30},...e})}async startFrontCamera(e){return this.start({facingMode:"user",width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30},...e})}getSettings(){return this.videoTrack?.getSettings()??null}getResolution(){const e=this.getSettings();return!e||e.width==null||e.height==null?null:{width:e.width,height:e.height}}async getCapabilities(e){if(e&&e!==this.currentDeviceId){let t=null;try{t=await navigator.mediaDevices.getUserMedia({video:{deviceId:{exact:e}},audio:!1});const i=t.getVideoTracks()[0];return i?this.extractCapabilities(i):null}catch{return null}finally{t?.getTracks().forEach(i=>i.stop())}}return this.videoTrack?this.extractCapabilities(this.videoTrack):null}extractCapabilities(e){const t=e.getCapabilities?.()??{},i=e.getSettings();return{deviceId:i.deviceId??e.id,label:e.label,facingMode:Array.isArray(t.facingMode)?t.facingMode[0]:i.facingMode,width:t.width?{min:t.width.min,max:t.width.max,step:t.width.step}:void 0,height:t.height?{min:t.height.min,max:t.height.max,step:t.height.step}:void 0,frameRate:t.frameRate?{min:t.frameRate.min,max:t.frameRate.max,step:t.frameRate.step}:void 0,torch:"torch"in t?!!t.torch:void 0,zoom:"zoom"in t&&t.zoom?{min:t.zoom.min,max:t.zoom.max,step:t.zoom.step}:void 0,focusMode:Array.isArray(t.focusMode)?t.focusMode:void 0,exposureMode:Array.isArray(t.exposureMode)?t.exposureMode:void 0,raw:t}}buildMediaConstraints(e){const t={};return e.deviceId?t.deviceId={exact:e.deviceId}:e.facingMode?t.facingMode={ideal:e.facingMode}:t.facingMode={ideal:"environment"},e.width!==void 0&&(t.width=typeof e.width=="number"?{ideal:e.width}:e.width),e.height!==void 0&&(t.height=typeof e.height=="number"?{ideal:e.height}:e.height),e.frameRate!==void 0&&(t.frameRate=typeof e.frameRate=="number"?{ideal:e.frameRate}:e.frameRate),{video:t,audio:!1}}makeError(e,t,i){return{code:e,message:t,original:i}}normalizeError(e){if(e&&typeof e=="object"&&"name"in e){const t=String(e.name),i=String(e.message||t);if(["NotAllowedError","NotFoundError","NotReadableError","OverconstrainedError","SecurityError","AbortError","TypeError"].includes(t))return this.makeError(t,i,e)}return this.makeError("UnknownError",e instanceof Error?e.message:"Unknown camera error",e)}}const R=1,L="0.2.3-phase1";function A(r){const e=new c;r.innerHTML=`
    <div class="app-shell">
      <header class="app-header">
        <div class="logo">
          <span class="logo-icon" aria-hidden="true">▣</span>
          <h1>Barcode Scanner</h1>
        </div>
        <span class="phase-badge">Phase ${R}</span>
      </header>

      <main class="app-main">
        <section class="video-section">
          <div class="video-wrapper">
            <video id="camera-preview" playsinline muted autoplay></video>
            <div id="video-placeholder" class="video-placeholder">
              <p>Camera preview</p>
              <p class="hint">Press Start Camera</p>
            </div>
          </div>
          <div id="status-bar" class="status-bar" data-state="idle">
            <span id="state-label">idle</span>
          </div>
        </section>

        <section class="controls-card">
          <h3>Camera Controls</h3>
          <div class="btn-row">
            <button id="btn-start" class="btn btn-primary" type="button">Start Camera</button>
            <button id="btn-stop" class="btn btn-secondary" type="button" disabled>Stop</button>
          </div>
          <div class="btn-row">
            <button id="btn-back" class="btn" type="button">Back Camera</button>
            <button id="btn-front" class="btn" type="button">Front Camera</button>
          </div>
          <div class="field">
            <label for="device-select">Select device</label>
            <select id="device-select" disabled>
              <option value="">— list devices after permission —</option>
            </select>
          </div>
          <div class="btn-row">
            <button id="btn-refresh-devices" class="btn btn-ghost" type="button">Refresh devices</button>
          </div>
        </section>

        <section class="info-card">
          <h3>Current Info</h3>
          <dl id="info-list" class="info-list">
            <div><dt>State</dt><dd id="info-state">idle</dd></div>
            <div><dt>Device</dt><dd id="info-device">—</dd></div>
            <div><dt>Resolution</dt><dd id="info-resolution">—</dd></div>
            <div><dt>Frame rate</dt><dd id="info-fps">—</dd></div>
            <div><dt>Facing</dt><dd id="info-facing">—</dd></div>
          </dl>
        </section>

        <section class="info-card" id="error-card" hidden>
          <h3>Error</h3>
          <pre id="error-message" class="error-box"></pre>
        </section>

        <section class="info-card">
          <h3>Phase 1 Checklist</h3>
          <ul class="status-list">
            <li class="status-item done"><span class="status-icon">✓</span> getUserMedia</li>
            <li class="status-item done"><span class="status-icon">✓</span> Permission handling</li>
            <li class="status-item done"><span class="status-icon">✓</span> Back / Front preference</li>
            <li class="status-item done"><span class="status-icon">✓</span> Device selection</li>
            <li class="status-item done"><span class="status-icon">✓</span> Resolution & frame-rate info</li>
            <li class="status-item done"><span class="status-icon">✓</span> Capability detection</li>
            <li class="status-item done"><span class="status-icon">✓</span> Error handling</li>
            <li class="status-item pending"><span class="status-icon">○</span> Frame processing (Phase 2)</li>
          </ul>
        </section>
      </main>

      <footer class="app-footer">
        <p>Offline-first • Client-side only</p>
        <p class="version">${L}</p>
      </footer>
    </div>
  `;const t=r.querySelector("#camera-preview"),i=r.querySelector("#video-placeholder"),s=r.querySelector("#state-label"),o=r.querySelector("#status-bar"),f=r.querySelector("#btn-start"),y=r.querySelector("#btn-stop"),S=r.querySelector("#btn-back"),w=r.querySelector("#btn-front"),U=r.querySelector("#btn-refresh-devices"),h=r.querySelector("#device-select"),C=r.querySelector("#error-card"),k=r.querySelector("#error-message"),$=r.querySelector("#info-state"),E=r.querySelector("#info-device"),M=r.querySelector("#info-resolution"),x=r.querySelector("#info-fps"),I=r.querySelector("#info-facing");function T(n){s.textContent=n,o.dataset.state=n,$.textContent=n;const a=n==="active",l=n==="requesting";f.disabled=a||l,y.disabled=!a&&n!=="error",S.disabled=l,w.disabled=l,h.disabled=l,a?(i.hidden=!0,t.hidden=!1):(t.hidden=!0,i.hidden=!1)}function g(n){C.hidden=!1,k.textContent=`${n.code}
${n.message}`}function v(){C.hidden=!0,k.textContent=""}function b(){const n=e.getSettings();if(!n){E.textContent="—",M.textContent="—",x.textContent="—",I.textContent="—";return}E.textContent=n.deviceId?`${n.deviceId.slice(0,12)}…`:e.activeDeviceId??"—",M.textContent=n.width&&n.height?`${n.width} × ${n.height}`:"—",x.textContent=n.frameRate!=null?`${Math.round(n.frameRate)} fps`:"—",I.textContent=n.facingMode||"—"}async function D(){try{const n=await e.listDevices();if(h.innerHTML="",n.length===0){const a=document.createElement("option");a.value="",a.textContent="No cameras found",h.appendChild(a);return}for(const a of n){const l=document.createElement("option");l.value=a.deviceId;const F=a.facingMode?` [${a.facingMode}]`:"";l.textContent=`${a.label}${F}`,a.deviceId===e.activeDeviceId&&(l.selected=!0),h.appendChild(l)}h.disabled=!1}catch(n){d.warn("Could not list devices",n)}}async function p(n){t.srcObject=n;try{await t.play()}catch(a){d.warn("video.play() failed",a)}b(),await D()}e.on("statechange",n=>T(n)),e.on("error",n=>g(n)),e.on("trackended",()=>{t.srcObject=null,b()}),f.addEventListener("click",async()=>{v();try{const n=await e.startBackCamera();await p(n)}catch{}}),y.addEventListener("click",async()=>{v(),await e.stop(),t.srcObject=null,b()}),S.addEventListener("click",async()=>{v();try{const n=await e.startBackCamera();await p(n)}catch{}}),w.addEventListener("click",async()=>{v();try{const n=await e.startFrontCamera();await p(n)}catch{}}),h.addEventListener("change",async()=>{const n=h.value;if(n){v();try{const a=await e.switchDevice(n);await p(a)}catch{}}}),U.addEventListener("click",()=>D()),T("idle");const u=c.getEnvironmentInfo();d.info("Camera environment",u),(!u.secureContext||!u.supported)&&(u.secureContext?g({code:"NotFoundError",message:`getUserMedia is not available in this browser/context.
hasMediaDevices=${u.hasMediaDevices}, hasGetUserMedia=${u.hasGetUserMedia}`}):g({code:"SecurityError",message:`Camera requires a secure context (HTTPS or localhost).
Current: ${u.protocol}//${u.hostname}
On Samsung Internet / Chrome, navigator.mediaDevices is hidden on insecure pages.
Fix: serve over HTTPS, use localhost, or a tunnel (e.g. vite --host + HTTPS).`})),d.info(`UI ready — Phase ${R}`)}const q=document.querySelector("#app");if(!q)throw new Error("Root element #app not found");A(q);console.info("[Offline Barcode Scanner] Phase 1 — Camera Engine loaded");
//# sourceMappingURL=index-D298l29B.js.map
