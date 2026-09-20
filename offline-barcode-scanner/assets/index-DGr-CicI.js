(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))i(a);new MutationObserver(a=>{for(const o of a)if(o.type==="childList")for(const p of o.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&i(p)}).observe(document,{childList:!0,subtree:!0});function t(a){const o={};return a.integrity&&(o.integrity=a.integrity),a.referrerPolicy&&(o.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?o.credentials="include":a.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(a){if(a.ep)return;a.ep=!0;const o=t(a);fetch(a.href,o)}})();const $="[BarcodeScanner]";function g(n,e,...t){(console[n]??console.log)(`${$} ${e}`,...t)}const c={debug:(n,...e)=>g("debug",n,...e),info:(n,...e)=>g("info",n,...e),warn:(n,...e)=>g("warn",n,...e),error:(n,...e)=>g("error",n,...e)};class u{stream=null;videoTrack=null;state="idle";currentDeviceId=null;handlers={statechange:new Set,error:new Set,trackended:new Set};get mediaStream(){return this.stream}get track(){return this.videoTrack}get currentState(){return this.state}get activeDeviceId(){return this.currentDeviceId}on(e,t){return this.handlers[e].add(t),()=>this.handlers[e].delete(t)}emit(e,...t){for(const i of this.handlers[e])try{i(...t)}catch(a){c.error("Event handler error",a)}}setState(e){this.state!==e&&(this.state=e,this.emit("statechange",e))}static isSupported(){if(typeof navigator>"u")return!1;if(navigator.mediaDevices&&typeof navigator.mediaDevices.getUserMedia=="function")return!0;const e=navigator;return typeof e.getUserMedia=="function"||typeof e.webkitGetUserMedia=="function"||typeof e.mozGetUserMedia=="function"}static isSecureContext(){if(typeof window>"u")return!1;if(typeof window.isSecureContext=="boolean")return window.isSecureContext;const e=window.location?.protocol,t=window.location?.hostname;return e==="https:"||t==="localhost"||t==="127.0.0.1"||t==="[::1]"}static getEnvironmentInfo(){const e=!!(typeof navigator<"u"&&navigator.mediaDevices),t=!!(e&&typeof navigator.mediaDevices.getUserMedia=="function");return{supported:u.isSupported(),secureContext:u.isSecureContext(),hasMediaDevices:e,hasGetUserMedia:t,protocol:typeof location<"u"?location.protocol:"",hostname:typeof location<"u"?location.hostname:"",userAgent:typeof navigator<"u"?navigator.userAgent:""}}static buildUnavailableError(){const e=u.getEnvironmentInfo();return e.secureContext?!e.hasMediaDevices||!e.hasGetUserMedia?{code:"NotFoundError",message:`getUserMedia is not available in this browser/context. UA: ${e.userAgent.slice(0,80)}…`}:{code:"NotFoundError",message:"Camera API is not available"}:{code:"SecurityError",message:`Camera requires a secure context (HTTPS or localhost). Current origin is ${e.protocol}//${e.hostname}. On Samsung Internet / Chrome, navigator.mediaDevices is hidden on insecure pages. Serve the app over HTTPS or open it from localhost.`}}async listDevices(){if(!u.isSupported())throw u.buildUnavailableError();return(await navigator.mediaDevices.enumerateDevices()).filter(i=>i.kind==="videoinput").map(i=>{const a=this.inferFacingMode(i.label,i.deviceId);return{deviceId:i.deviceId,label:i.label||`Camera ${i.deviceId.slice(0,8)}`,facingMode:a,groupId:i.groupId}})}inferFacingMode(e,t){const i=e.toLowerCase();if(i.includes("back")||i.includes("rear")||i.includes("environment")||i.includes("world"))return"environment";if(i.includes("front")||i.includes("user")||i.includes("face")||i.includes("selfie"))return"user"}async start(e={}){if(!u.isSecureContext()||!u.isSupported()){const i=u.buildUnavailableError();throw this.setState("error"),this.emit("error",i),i}await this.stop(),this.setState("requesting");const t=this.buildMediaConstraints(e);try{c.info("Requesting camera with constraints",t);const i=await navigator.mediaDevices.getUserMedia(t);this.stream=i;const a=i.getVideoTracks();if(this.videoTrack=a[0]??null,!this.videoTrack)throw i.getTracks().forEach(o=>o.stop()),this.stream=null,this.makeError("NotFoundError","No video track in the obtained stream");return this.currentDeviceId=this.videoTrack.getSettings().deviceId??null,this.videoTrack.addEventListener("ended",this.handleTrackEnded),this.setState("active"),c.info("Camera started",{deviceId:this.currentDeviceId,settings:this.videoTrack.getSettings()}),i}catch(i){const a=this.normalizeError(i);throw this.setState("error"),this.emit("error",a),c.error("Camera start failed",a),a}}async stop(){this.videoTrack&&(this.videoTrack.removeEventListener("ended",this.handleTrackEnded),this.videoTrack.stop(),this.videoTrack=null),this.stream&&(this.stream.getTracks().forEach(e=>e.stop()),this.stream=null),this.currentDeviceId=null,this.state!=="idle"&&this.state!=="stopped"&&this.setState("stopped"),c.info("Camera stopped")}handleTrackEnded=()=>{c.warn("Video track ended unexpectedly"),this.videoTrack=null,this.stream=null,this.currentDeviceId=null,this.setState("stopped"),this.emit("trackended")};async switchDevice(e,t){const i=this.videoTrack?.getSettings()??{},a={deviceId:e,width:i.width,height:i.height,frameRate:i.frameRate,...t};return this.start(a)}async startBackCamera(e){return this.start({facingMode:"environment",width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30},...e})}async startFrontCamera(e){return this.start({facingMode:"user",width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30},...e})}getSettings(){return this.videoTrack?.getSettings()??null}getResolution(){const e=this.getSettings();return!e||e.width==null||e.height==null?null:{width:e.width,height:e.height}}async getCapabilities(e){if(e&&e!==this.currentDeviceId){let t=null;try{t=await navigator.mediaDevices.getUserMedia({video:{deviceId:{exact:e}},audio:!1});const i=t.getVideoTracks()[0];return i?this.extractCapabilities(i):null}catch{return null}finally{t?.getTracks().forEach(i=>i.stop())}}return this.videoTrack?this.extractCapabilities(this.videoTrack):null}extractCapabilities(e){const t=e.getCapabilities?.()??{},i=e.getSettings();return{deviceId:i.deviceId??e.id,label:e.label,facingMode:Array.isArray(t.facingMode)?t.facingMode[0]:i.facingMode,width:t.width?{min:t.width.min,max:t.width.max,step:t.width.step}:void 0,height:t.height?{min:t.height.min,max:t.height.max,step:t.height.step}:void 0,frameRate:t.frameRate?{min:t.frameRate.min,max:t.frameRate.max,step:t.frameRate.step}:void 0,torch:"torch"in t?!!t.torch:void 0,zoom:"zoom"in t&&t.zoom?{min:t.zoom.min,max:t.zoom.max,step:t.zoom.step}:void 0,focusMode:Array.isArray(t.focusMode)?t.focusMode:void 0,exposureMode:Array.isArray(t.exposureMode)?t.exposureMode:void 0,raw:t}}buildMediaConstraints(e){const t={};return e.deviceId?t.deviceId={exact:e.deviceId}:e.facingMode?t.facingMode={ideal:e.facingMode}:t.facingMode={ideal:"environment"},e.width!==void 0&&(t.width=typeof e.width=="number"?{ideal:e.width}:e.width),e.height!==void 0&&(t.height=typeof e.height=="number"?{ideal:e.height}:e.height),e.frameRate!==void 0&&(t.frameRate=typeof e.frameRate=="number"?{ideal:e.frameRate}:e.frameRate),{video:t,audio:!1}}makeError(e,t,i){return{code:e,message:t,original:i}}normalizeError(e){if(e&&typeof e=="object"&&"name"in e){const t=String(e.name),i=String(e.message||t);if(["NotAllowedError","NotFoundError","NotReadableError","OverconstrainedError","SecurityError","AbortError","TypeError"].includes(t))return this.makeError(t,i,e)}return this.makeError("UnknownError",e instanceof Error?e.message:"Unknown camera error",e)}}const q=1,F="0.2.4-phase1";function A(n){const e=new u;n.innerHTML=`
    <div class="app-shell">
      <header class="app-header">
        <div class="logo">
          <span class="logo-icon" aria-hidden="true">▣</span>
          <h1>Barcode Scanner</h1>
        </div>
        <span class="phase-badge">Phase ${q}</span>
      </header>

      <main class="app-main">
        <section class="video-section">
          <div class="video-wrapper">
            <video id="camera-preview" class="camera-video" playsinline webkit-playsinline muted autoplay></video>
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
        <p class="version">${F}</p>
      </footer>
    </div>
  `;const t=n.querySelector("#camera-preview"),i=n.querySelector("#video-placeholder"),a=n.querySelector("#state-label"),o=n.querySelector("#status-bar"),p=n.querySelector("#btn-start"),w=n.querySelector("#btn-stop"),S=n.querySelector("#btn-back"),C=n.querySelector("#btn-front"),U=n.querySelector("#btn-refresh-devices"),f=n.querySelector("#device-select"),k=n.querySelector("#error-card"),E=n.querySelector("#error-message"),L=n.querySelector("#info-state"),M=n.querySelector("#info-device"),x=n.querySelector("#info-resolution"),I=n.querySelector("#info-fps"),T=n.querySelector("#info-facing");function D(s){a.textContent=s,o.dataset.state=s,L.textContent=s;const r=s==="active",d=s==="requesting";p.disabled=r||d,w.disabled=!r&&s!=="error",S.disabled=d,C.disabled=d,f.disabled=d;const l=t.closest(".video-wrapper");r?(i.hidden=!0,i.style.display="none",t.style.display="block",t.style.visibility="visible",t.style.opacity="1",l?.classList.add("is-live")):(t.style.opacity="0",i.hidden=!1,i.style.display="",l?.classList.remove("is-live"))}function y(s){k.hidden=!1,E.textContent=`${s.code}
${s.message}`}function v(){k.hidden=!0,E.textContent=""}function b(){const s=e.getSettings();if(!s){M.textContent="—",x.textContent="—",I.textContent="—",T.textContent="—";return}M.textContent=s.deviceId?`${s.deviceId.slice(0,12)}…`:e.activeDeviceId??"—",x.textContent=s.width&&s.height?`${s.width} × ${s.height}`:"—",I.textContent=s.frameRate!=null?`${Math.round(s.frameRate)} fps`:"—",T.textContent=s.facingMode||"—"}async function R(){try{const s=await e.listDevices();if(f.innerHTML="",s.length===0){const r=document.createElement("option");r.value="",r.textContent="No cameras found",f.appendChild(r);return}for(const r of s){const d=document.createElement("option");d.value=r.deviceId;const l=r.facingMode?` [${r.facingMode}]`:"";d.textContent=`${r.label}${l}`,r.deviceId===e.activeDeviceId&&(d.selected=!0),f.appendChild(d)}f.disabled=!1}catch(s){c.warn("Could not list devices",s)}}async function m(s){t.setAttribute("playsinline","true"),t.setAttribute("webkit-playsinline","true"),t.muted=!0,t.playsInline=!0,t.autoplay=!0,t.srcObject=null,t.srcObject=s,await new Promise(d=>{if(t.readyState>=1){d();return}const l=()=>{t.removeEventListener("loadedmetadata",l),d()};t.addEventListener("loadedmetadata",l),setTimeout(d,1500)});try{await t.play()}catch(d){c.warn("video.play() failed",d);try{await new Promise(l=>setTimeout(l,200)),await t.play()}catch(l){c.warn("video.play() retry failed",l)}}i.hidden=!0,i.style.display="none",t.style.display="block",t.style.visibility="visible",t.style.opacity="1",t.closest(".video-wrapper")?.classList.add("is-live"),c.info("Preview attached",{videoWidth:t.videoWidth,videoHeight:t.videoHeight,readyState:t.readyState,paused:t.paused}),b(),await R()}e.on("statechange",s=>D(s)),e.on("error",s=>y(s)),e.on("trackended",()=>{t.srcObject=null,b()}),p.addEventListener("click",async()=>{v();try{const s=await e.startBackCamera();await m(s)}catch{}}),w.addEventListener("click",async()=>{v(),await e.stop(),t.srcObject=null,b()}),S.addEventListener("click",async()=>{v();try{const s=await e.startBackCamera();await m(s)}catch{}}),C.addEventListener("click",async()=>{v();try{const s=await e.startFrontCamera();await m(s)}catch{}}),f.addEventListener("change",async()=>{const s=f.value;if(s){v();try{const r=await e.switchDevice(s);await m(r)}catch{}}}),U.addEventListener("click",()=>R()),D("idle");const h=u.getEnvironmentInfo();c.info("Camera environment",h),(!h.secureContext||!h.supported)&&(h.secureContext?y({code:"NotFoundError",message:`getUserMedia is not available in this browser/context.
hasMediaDevices=${h.hasMediaDevices}, hasGetUserMedia=${h.hasGetUserMedia}`}):y({code:"SecurityError",message:`Camera requires a secure context (HTTPS or localhost).
Current: ${h.protocol}//${h.hostname}
On Samsung Internet / Chrome, navigator.mediaDevices is hidden on insecure pages.
Fix: serve over HTTPS, use localhost, or a tunnel (e.g. vite --host + HTTPS).`})),c.info(`UI ready — Phase ${q}`)}const P=document.querySelector("#app");if(!P)throw new Error("Root element #app not found");A(P);console.info("[Offline Barcode Scanner] Phase 1 — Camera Engine loaded");
//# sourceMappingURL=index-DGr-CicI.js.map
