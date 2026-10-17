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
        // Keep async database work outside Supabase's auth callback lock.
        const signedUser=user;setTimeout(()=>{if(user?.id===signedUser?.id)root.PYQSync?.connect(client,signedUser);},0);
        if(event==='SIGNED_OUT'&&document.querySelector('#studio-account-card'))setTimeout(()=>open('login'),0);
      });
      const result=await client.auth.getSession();if(result.error)throw result.error;user=result.data.session?.user||null;ready=true;paint();root.PYQSync?.connect(client,user);return client;
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
      <div id="studio-auth-status" class="studio-auth-status" role="status" aria-live="polite"></div><div class="studio-auth-actions">${!signup&&!update&&!forgot&&configured?'<button data-account-mode="forgot">Forgot password?</button>':forgot?'<button data-account-mode="login">Back to log in</button>':'<span></span>'}<button data-close>Continue as guest</button></div><p class="studio-auth-foot">${configured?'Email and password are handled by Supabase. ':''}Practice is free. ${config.cloudBackups?'Sign in to restore your latest place and automatically save answers, notes and progress to your private cloud account.':'Use Settings & data to export a backup.'}</p></div>`);
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
      form.querySelectorAll('input[name=password],input[name=confirmation]').forEach(i=>i.value='');
      if(currentMode==='forgot'){notice('If an account exists for this email, a reset link will arrive shortly.');return;}
      if(currentMode==='update'){notice('Password updated.');return;}
      if(currentMode==='register'&&!result.data.session){notice('Check your email to confirm your account, then return to log in.');return;}
      user=result.data.user||result.data.session?.user||user;paint();account();
    }catch(error){notice(error.message||'Unable to connect. Please try again.',true);}finally{button.disabled=false;}
  }
  function account(){
    showModal('Your account',`<div class="studio-auth studio-account-card" id="studio-account-card"><div class="studio-auth-brand"><span>N</span><div><strong>Welcome to your lab</strong><small>Signed in securely</small></div></div><p>${esc(user?.email||'')}</p>${config.cloudBackups?'<div class="studio-auth-notice"><strong>Automatic cloud sync is on</strong><br>Each answer and question change saves automatically. Sign in on another device to continue at your latest question. Notes, bookmarks and learning history travel with you too.</div><p id="nexus-sync-detail" role="status" aria-live="polite">Connecting to your private progress…</p><button id="studio-cloud-save" class="primary">Sync now</button><p class="studio-auth-foot">Offline changes stay on this device and upload when you reconnect. Wait for “Cloud saved” before switching devices. The saved workspace stays in this browser after logout.</p>':'<p>Progress is saved on this device.</p>'}<button id="studio-device-export">Download device backup</button><button id="studio-logout">Log out</button><div id="studio-auth-status" class="studio-auth-status" role="status" aria-live="polite"></div></div>`);
    document.querySelector('#studio-device-export').onclick=exportData;
    document.querySelector('#studio-logout').onclick=async()=>{try{if(root.PYQSync?.isDirty())await root.PYQSync.syncNow();const c=await init(),r=await c.auth.signOut({scope:'local'});if(r.error)throw r.error;root.PYQSync?.disconnect();user=null;paint();open('login');toast('Logged out. Device progress is still saved.');}catch(e){notice(e.message,true);}};
    if(config.cloudBackups){document.querySelector('#studio-cloud-save').onclick=()=>root.PYQSync?.syncNow();root.PYQSync?.paint();}
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
