(function(root){
  'use strict';
  const config=root.PYQ_ACCOUNT_CONFIG||{};
  let client=null,user=null,loading=null,mode='login',ready=false;
  function validConfig(c){
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.url||''))return false;
    return /^sb_publishable_[A-Za-z0-9_-]+$/.test(c.publishableKey||'');
  }
  function paint(){
    const login=document.querySelector('#studio-login'),register=document.querySelector('#studio-register'),profile=document.querySelector('#studio-profile');
    if(login)login.hidden=!!user;if(register)register.hidden=!!user;
    if(profile){profile.hidden=!user;profile.textContent=user?'My account':'';profile.setAttribute('aria-label','Open your account');}
  }
  async function init(){
    if(client)return client;if(loading)return loading;
    if(!validConfig(config))throw Error('Account setup is not connected yet. You can continue practising as a guest.');
    loading=(async()=>{
      if(!root.supabase){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='supabase-2.118.0.js';s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('Could not load the sign-in service. Please check your connection.'));};document.head.appendChild(s);});}
      client=root.supabase.createClient(config.url,config.publishableKey,{auth:{storageKey:'pyq-nexus-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      client.auth.onAuthStateChange((event,session)=>{
        user=session?.user||null;paint();
        if(event==='PASSWORD_RECOVERY')setTimeout(()=>open('update'),0);
        // Never upload or overwrite the shared device workspace merely by signing in.
        if(event==='SIGNED_OUT'&&document.querySelector('#studio-account-card'))setTimeout(()=>open('login'),0);
      });
      const result=await client.auth.getSession();if(result.error)throw result.error;user=result.data.session?.user||null;ready=true;paint();return client;
    })().catch(e=>{loading=null;throw e;});
    return loading;
  }
  function notice(message,error=false){const el=document.querySelector('#studio-auth-status');if(el){el.textContent=message;el.classList.toggle('error',error);}}
  function redirectURL(){return location.origin+location.pathname;}
  function passwordField(label='Password',confirmation=false){return `<label>${label}<div class="studio-password-wrap"><input name="${confirmation?'confirmation':'password'}" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" ${mode==='login'?'':'minlength="12"'} maxlength="128" required aria-label="${label}"><button type="button" data-password-toggle aria-label="Show ${label.toLowerCase()}">Show</button></div></label>`;}
  function open(next='login'){
    mode=next;
    if(user&&!['update','forgot'].includes(mode)){account();return;}
    const configured=validConfig(config),signup=mode==='register',forgot=mode==='forgot',update=mode==='update';
    showModal(update?'Choose a new password':forgot?'Reset your password':'Your Nexus account',`<div class="studio-auth"><div class="studio-auth-brand"><span>N</span><div><strong>PYQ NEXUS</strong><small>Your preparation, connected.</small></div></div>
      ${!forgot&&!update?`<div class="studio-auth-tabs" role="group" aria-label="Account action"><button class="${signup?'':'selected'}" data-account-mode="login" aria-pressed="${!signup}">Log in</button><button class="${signup?'selected':''}" data-account-mode="register" aria-pressed="${signup}">Create account</button></div>`:''}
      ${!configured?'<div class="studio-auth-notice"><strong>Account setup in progress</strong><br>Secure login and registration will be available once the account service is connected. Your question library and device progress are available now.</div>':`<form id="studio-auth-form">${!update?'<label>Email address<input name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com" required></label>':''}${!forgot?passwordField():''}${signup||update?passwordField('Confirm password',true):''}${signup||update?'<p>Use at least 12 characters. A unique passphrase works well.</p>':''}<button class="primary" type="submit">${signup?'Create account':forgot?'Send reset link':update?'Update password':'Log in'}</button></form>`}
      <div id="studio-auth-status" class="studio-auth-status" role="status" aria-live="polite"></div><div class="studio-auth-actions">${!signup&&!update&&!forgot&&configured?'<button data-account-mode="forgot">Forgot password?</button>':forgot?'<button data-account-mode="login">Back to log in</button>':'<span></span>'}<button data-close>Continue as guest</button></div><p class="studio-auth-foot">${configured?'Email and password are handled by Supabase. ':''}Practice is free. Signing in does not change the progress on this device. ${config.cloudBackups?'Save or restore a private cloud backup from your account.':'Use Settings & data to export a backup.'}</p></div>`);
    const form=document.querySelector('#studio-auth-form');if(form)form.onsubmit=submit;
    document.querySelector('.studio-auth input')?.focus();
  }
  async function submit(e){
    e.preventDefault();const form=e.currentTarget,button=form.querySelector('[type=submit]'),f=new FormData(form),currentMode=mode,email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
    if(['register','update'].includes(currentMode)&&password!==f.get('confirmation')){notice('The passwords do not match.',true);return;}
    button.disabled=true;notice('Connecting securely…');
    try{
      const c=await init();let result;
      if(currentMode==='register')result=await c.auth.signUp({email,password,options:{emailRedirectTo:redirectURL()}});
      else if(currentMode==='forgot')result=await c.auth.resetPasswordForEmail(email,{redirectTo:redirectURL()});
      else if(currentMode==='update')result=await c.auth.updateUser({password});
      else result=await c.auth.signInWithPassword({email,password});
      if(result.error)throw result.error;
      form.querySelectorAll('input[type=password]').forEach(i=>i.value='');
      if(currentMode==='forgot'){notice('If an account exists for this email, a reset link will arrive shortly.');return;}
      if(currentMode==='update'){notice('Password updated.');return;}
      if(currentMode==='register'&&!result.data.session){notice('Check your email to confirm your account, then return to log in.');return;}
      user=result.data.user||result.data.session?.user||user;paint();account();
    }catch(error){notice(error.message||'Unable to connect. Please try again.',true);}finally{button.disabled=false;}
  }
  function account(){
    showModal('Your account',`<div class="studio-auth studio-account-card" id="studio-account-card"><div class="studio-auth-brand"><span>N</span><div><strong>Welcome to your lab</strong><small>Signed in securely</small></div></div><p>${esc(user?.email||'')}</p><div class="studio-auth-notice"><strong>Device workspace</strong><br>Your answers, notes and current place remain saved in this browser. They are not automatically uploaded or cleared on logout. Use a private browser profile on shared computers.</div>${config.cloudBackups?'<h3>Private cloud backup</h3><p>Save this device’s progress to your account, then restore it on another device. Saving replaces your previous cloud backup. Restoring asks before replacing local progress.</p><button id="studio-cloud-save" class="primary">Save this progress to my account</button><button id="studio-cloud-restore">Restore my cloud backup</button>':''}<button id="studio-device-export">Download device backup</button><button id="studio-logout">Log out</button><div id="studio-auth-status" class="studio-auth-status" role="status" aria-live="polite"></div></div>`);
    document.querySelector('#studio-device-export').onclick=exportData;
    document.querySelector('#studio-logout').onclick=async()=>{try{const c=await init(),r=await c.auth.signOut({scope:'local'});if(r.error)throw r.error;user=null;paint();open('login');toast('Logged out. Device progress is still saved.');}catch(e){notice(e.message,true);}};
    if(config.cloudBackups){document.querySelector('#studio-cloud-save').onclick=()=>cloud('save');document.querySelector('#studio-cloud-restore').onclick=()=>cloud('restore');}
  }
  async function cloud(action){
    if(state.session?.mode==='exam'&&!state.session.finished){notice('Finish your timed test before using cloud backups.',true);return;}
    const buttons=[...document.querySelectorAll('#studio-account-card button')];buttons.forEach(b=>b.disabled=true);notice(action==='save'?'Saving your private backup…':'Checking your backup…');
    try{
      const c=await init(),verified=await c.auth.getUser();if(verified.error||!verified.data.user)throw Error('Please log in again.');const id=verified.data.user.id;
      if(action==='save'){
        save();const payload={format:'pyq-lab-backup',version:1,exportedAt:new Date().toISOString(),state:JSON.parse(JSON.stringify(state))};
        if(new Blob([JSON.stringify(payload)]).size>14000000)throw Error('This backup is larger than the cloud limit. Download a device backup instead.');
        const r=await c.from('nexus_backups').upsert({user_id:id,payload,updated_at:payload.exportedAt},{onConflict:'user_id'});if(r.error)throw r.error;notice('Private cloud backup saved.');
      }else{
        const r=await c.from('nexus_backups').select('payload,updated_at').eq('user_id',id).maybeSingle();if(r.error)throw r.error;if(!r.data){notice('No cloud backup yet. Save one from the device you practise on.');return;}
        // Existing import validation and explicit confirmation protect local progress.
        importData(new File([JSON.stringify(r.data.payload)],'nexus-cloud-backup.json',{type:'application/json'}));
      }
    }catch(e){notice(e.message||'Cloud backup unavailable. Device progress is safe.',true);}finally{buttons.forEach(b=>b.disabled=false);}
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.accountMode)open(b.dataset.accountMode);
    if(b.id==='studio-login')open('login');if(b.id==='studio-register')open('register');if(b.id==='studio-profile')account();
    if(b.hasAttribute('data-password-toggle')){const input=b.previousElementSibling,show=input.type==='password';input.type=show?'text':'password';b.textContent=show?'Hide':'Show';b.setAttribute('aria-label',(show?'Hide ':'Show ')+input.getAttribute('aria-label').toLowerCase());}
  });
  root.PYQAccount={open,paint,validConfig};paint();
  if(validConfig(config))init().catch(()=>{});
})(window);
