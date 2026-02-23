"use strict";var WebFeedback=(()=>{var h=Object.defineProperty;var u=Object.getOwnPropertyDescriptor;var f=Object.getOwnPropertyNames;var m=Object.prototype.hasOwnProperty;var x=(n,e)=>{for(var t in e)h(n,t,{get:e[t],enumerable:!0})},v=(n,e,t,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of f(e))!m.call(n,s)&&s!==t&&h(n,s,{get:()=>e[s],enumerable:!(r=u(e,s))||r.enumerable});return n};var w=n=>v(h({},"__esModule",{value:!0}),n);var _={};x(_,{FeedbackWidget:()=>c});var y="https://cdn.jsdelivr.net/npm/html2canvas-pro@1.6.7/dist/html2canvas-pro.min.js";function k(){return new Promise((n,e)=>{if(window.html2canvas)return n(window.html2canvas);let t=document.createElement("script");t.src=y,t.onload=()=>{window.html2canvas?n(window.html2canvas):e(new Error("html2canvas loaded but not available on window"))},t.onerror=()=>e(new Error("Failed to load html2canvas")),document.head.appendChild(t)})}var p={"bottom-right":{bottom:"24px",right:"24px"},"bottom-left":{bottom:"24px",left:"24px"},"bottom-center":{bottom:"24px",left:"50%",transform:"translateX(-50%)"},"top-right":{top:"24px",right:"24px"},"top-left":{top:"24px",left:"24px"},"top-center":{top:"24px",left:"50%",transform:"translateX(-50%)"},"middle-right":{top:"50%",right:"24px",transform:"translateY(-50%)"},"middle-left":{top:"50%",left:"24px",transform:"translateY(-50%)"}},c=class extends HTMLElement{_shadow;_isOpen=!1;_screenshot=null;_category="general";_rating=0;_submitting=!1;_submitted=!1;static get observedAttributes(){return["position","site-key","api-url","page-title","page-id","user-id","user-name","metadata","theme-color","hide-trigger"]}constructor(){super(),this._shadow=this.attachShadow({mode:"open"})}connectedCallback(){this.render()}attributeChangedCallback(){this._shadow.innerHTML&&this.render()}open(){this._openModal()}close(){this._closeModal()}get _themeColor(){return this.getAttribute("theme-color")||"#6366f1"}get _position(){return this.getAttribute("position")||"bottom-right"}_darken(e,t=20){let r=parseInt(e.replace("#",""),16),s=Math.max(0,(r>>16)-t),a=Math.max(0,(r>>8&255)-t),i=Math.max(0,(r&255)-t);return`#${(s<<16|a<<8|i).toString(16).padStart(6,"0")}`}async _captureScreen(){try{let t=await(await k())(document.body,{scale:.5,useCORS:!0,logging:!1,ignoreElements:r=>r.tagName==="FEEDBACK-WIDGET"});this._screenshot=t.toDataURL("image/jpeg",.6)}catch(e){console.warn("WebFeedback: screenshot capture failed",e),this._screenshot=null}}async _openModal(){this._isOpen=!0,this._submitted=!1,this._category="general",this._rating=0,this.render(),await this._captureScreen(),this.render()}_closeModal(){this._isOpen=!1,this._screenshot=null,this._submitted=!1,this.render()}async _submit(){let e=this._shadow.querySelector("#fw-message"),t=e?e.value.trim():"";if(!t){let o=this._shadow.querySelector("#fw-error");o&&(o.textContent="Please enter your feedback",o.style.display="block");return}let r=this.getAttribute("api-url"),s=this.getAttribute("site-key");if(!r||!s){console.error("WebFeedback: api-url and site-key attributes are required");return}this._submitting=!0,this.render();let a=null;try{let o=this.getAttribute("metadata");o&&(a=JSON.parse(o))}catch{}let i=null;try{let o=new URLSearchParams(window.location.search),l={};o.forEach((g,b)=>{l[b]=g}),Object.keys(l).length&&(i=l)}catch{}let d={pageTitle:this.getAttribute("page-title")||document.title,pageId:this.getAttribute("page-id")||null,pageUrl:window.location.href,urlParams:i,userId:this.getAttribute("user-id")||null,userName:this.getAttribute("user-name")||null,message:t,category:this._category,rating:this._rating||null,screenshot:this._screenshot,metadata:a,userAgent:navigator.userAgent};try{if(!(await fetch(`${r.replace(/\/$/,"")}/api/feedback`,{method:"POST",headers:{"Content-Type":"application/json","X-Site-Key":s},body:JSON.stringify(d)})).ok)throw new Error("Submit failed");this._submitting=!1,this._submitted=!0,this.render(),setTimeout(()=>this._closeModal(),2500)}catch(o){console.error("WebFeedback: submit error",o),this._submitting=!1,this.render();let l=this._shadow.querySelector("#fw-error");l&&(l.textContent="Failed to send feedback. Please try again.",l.style.display="block")}}render(){let e=this._themeColor,t=this._darken(e),r=p[this._position]||p["bottom-right"],s=Object.entries(r).map(([a,i])=>`${a}:${i}`).join(";");this._shadow.innerHTML=`
      <style>
        :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .trigger {
          position: fixed; ${s}; z-index: 2147483646;
          width: 56px; height: 56px; border-radius: 50%;
          background: ${e}; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          animation: fw-pulse 2s ease-in-out 3;
        }
        .trigger:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0,0,0,0.2); }
        .trigger:active { transform: scale(0.95); }
        .trigger svg { width: 26px; height: 26px; fill: white; }

        @keyframes fw-pulse {
          0%, 100% { box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
          50% { box-shadow: 0 4px 14px rgba(0,0,0,0.15), 0 0 0 8px ${e}33; }
        }

        .overlay {
          position: fixed; inset: 0; z-index: 2147483647;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: fw-fadein 0.25s ease;
        }
        @keyframes fw-fadein { from { opacity: 0; } to { opacity: 1; } }

        .modal {
          background: #fff; border-radius: 20px; width: 100%; max-width: 460px;
          max-height: 90vh; overflow-y: auto;
          box-shadow: 0 25px 60px rgba(0,0,0,0.15);
          animation: fw-slideup 0.3s ease;
        }
        @keyframes fw-slideup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px 0;
        }
        .modal-header h2 { font-size: 18px; font-weight: 700; color: #111; }
        .close-btn {
          width: 32px; height: 32px; border: none; background: #f3f4f6; border-radius: 8px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .close-btn:hover { background: #e5e7eb; }
        .close-btn svg { width: 16px; height: 16px; stroke: #6b7280; }

        .modal-body { padding: 20px 24px 24px; }

        .screenshot-wrap {
          border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;
          margin-bottom: 16px; background: #f9fafb;
        }
        .screenshot-wrap img { width: 100%; display: block; }
        .screenshot-loading {
          padding: 30px; text-align: center; color: #9ca3af; font-size: 13px;
        }
        .screenshot-loading .spinner {
          width: 24px; height: 24px; border: 2px solid #e5e7eb; border-top-color: ${e};
          border-radius: 50%; animation: fw-spin 0.7s linear infinite;
          display: inline-block; margin-bottom: 8px;
        }
        @keyframes fw-spin { to { transform: rotate(360deg); } }

        .categories { display: flex; gap: 8px; margin-bottom: 16px; }
        .cat-btn {
          flex: 1; padding: 10px 8px; border: 2px solid #e5e7eb; border-radius: 10px;
          background: #fff; cursor: pointer; font-size: 13px; font-weight: 600;
          color: #6b7280; transition: all 0.15s; text-align: center;
        }
        .cat-btn:hover { border-color: #d1d5db; }
        .cat-btn.active { border-color: ${e}; color: ${e}; background: ${e}0d; }

        .stars { display: flex; gap: 4px; margin-bottom: 16px; }
        .star {
          width: 32px; height: 32px; border: none; background: none;
          cursor: pointer; padding: 0; font-size: 24px; color: #d1d5db;
          transition: color 0.1s, transform 0.1s;
        }
        .star:hover { transform: scale(1.15); }
        .star.filled { color: #f59e0b; }

        label.field-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        textarea {
          width: 100%; min-height: 100px; padding: 12px; border: 2px solid #e5e7eb;
          border-radius: 10px; resize: vertical; font-family: inherit; font-size: 14px;
          color: #111; outline: none; transition: border-color 0.15s;
        }
        textarea:focus { border-color: ${e}; }
        textarea::placeholder { color: #9ca3af; }

        .error-msg { color: #ef4444; font-size: 13px; margin-top: 8px; display: none; }

        .submit-btn {
          width: 100%; margin-top: 16px; padding: 14px; border: none; border-radius: 12px;
          background: ${e}; color: #fff; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: background 0.15s;
        }
        .submit-btn:hover { background: ${t}; }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .success-view {
          padding: 40px 24px; text-align: center;
        }
        .success-check {
          width: 60px; height: 60px; border-radius: 50%; background: #ecfdf5;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
        }
        .success-check svg { width: 30px; height: 30px; stroke: #10b981; }
        .success-view h3 { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 6px; }
        .success-view p { font-size: 14px; color: #6b7280; }

        .powered { text-align: center; padding: 12px; font-size: 11px; color: #9ca3af; }
      </style>

      ${this._isOpen||this.hasAttribute("hide-trigger")?"":`
        <button class="trigger" id="fw-trigger" aria-label="Send feedback">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
          </svg>
        </button>
      `}

      ${this._isOpen?`
        <div class="overlay" id="fw-overlay">
          <div class="modal" id="fw-modal">
            ${this._submitted?`
              <div class="success-view">
                <div class="success-check">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h3>Thank you!</h3>
                <p>Your feedback has been submitted.</p>
              </div>
            `:`
              <div class="modal-header">
                <h2>Send Feedback</h2>
                <button class="close-btn" id="fw-close" aria-label="Close">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div class="modal-body">
                <div class="screenshot-wrap">
                  ${this._screenshot?`<img src="${this._screenshot}" alt="Screenshot"/>`:'<div class="screenshot-loading"><div class="spinner"></div><br>Capturing page...</div>'}
                </div>

                <div class="categories">
                  <button class="cat-btn ${this._category==="bug"?"active":""}" data-cat="bug">\u{1F41B} Bug</button>
                  <button class="cat-btn ${this._category==="feature"?"active":""}" data-cat="feature">\u2728 Feature</button>
                  <button class="cat-btn ${this._category==="general"?"active":""}" data-cat="general">\u{1F4AC} General</button>
                </div>

                <div class="stars">
                  ${[1,2,3,4,5].map(a=>`<button class="star ${a<=this._rating?"filled":""}" data-star="${a}">\u2605</button>`).join("")}
                </div>

                <label class="field-label" for="fw-message">Your feedback</label>
                <textarea id="fw-message" placeholder="What's on your mind? Describe a bug, suggest a feature, or share your thoughts..."></textarea>
                <div class="error-msg" id="fw-error"></div>

                <button class="submit-btn" id="fw-submit" ${this._submitting?"disabled":""}>
                  ${this._submitting?"Sending...":"Submit Feedback"}
                </button>
              </div>
              <div class="powered">Powered by WebFeedback</div>
            `}
          </div>
        </div>
      `:""}
    `,this._bindEvents()}_bindEvents(){let e=this._shadow.querySelector("#fw-trigger");e&&e.addEventListener("click",()=>this._openModal());let t=this._shadow.querySelector("#fw-overlay");t&&t.addEventListener("click",i=>{i.target===t&&this._closeModal()});let r=this._shadow.querySelector("#fw-close");r&&r.addEventListener("click",()=>this._closeModal()),this._shadow.querySelectorAll(".cat-btn").forEach(i=>{i.addEventListener("click",()=>{this._category=i.dataset.cat||"general",this._shadow.querySelectorAll(".cat-btn").forEach(d=>d.classList.remove("active")),i.classList.add("active")})}),this._shadow.querySelectorAll(".star").forEach(i=>{i.addEventListener("click",()=>{this._rating=parseInt(i.dataset.star||"0"),this._shadow.querySelectorAll(".star").forEach((d,o)=>{d.classList.toggle("filled",o<this._rating)})})});let s=this._shadow.querySelector("#fw-submit");s&&s.addEventListener("click",()=>this._submit());let a=this._shadow.querySelector("#fw-message");a&&a.addEventListener("keydown",i=>{let d=i;d.key==="Enter"&&(d.metaKey||d.ctrlKey)&&this._submit()})}};customElements.get("feedback-widget")||customElements.define("feedback-widget",c);return w(_);})();
