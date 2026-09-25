import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from './auth';
import { supabase } from './lib/supabase';
import type { Language } from './seller-copy';

const copy = {
  en: { title:'Verify your administrator access', intro:'Receive a 6-digit code at your account email. No QR code or authenticator app needed.', send:'Send email code', resend:'Send a new code', sent:'Email sent. Check your inbox and spam folder. Use the latest code within 10 minutes.', code:'6-digit email code', verify:'Verify and open administration', busy:'Please wait…', invalid:'The code is incorrect, expired or already used. After 5 failed attempts, request a new code.', rate:'Too many requests. Wait at least 60 seconds; no more than 5 emails per hour.', unavailable:'Administrator verification email is not configured yet. Access remains locked until the email service is connected.', delivery:'The email could not be sent. Wait a minute and try again.', error:'Verification is temporarily unavailable. Please try again.', note:'Verification opens administration for this login for 30 minutes.', denied:'Sign in with an authorized administrator account.' },
  fr: { title:'Vérifiez votre accès administrateur', intro:'Recevez un code à 6 chiffres à l’adresse de votre compte. Aucun QR code ni application d’authentification nécessaire.', send:'Recevoir un code par courriel', resend:'Recevoir un nouveau code', sent:'Courriel envoyé. Consultez votre boîte de réception et les indésirables. Utilisez le dernier code dans les 10 minutes.', code:'Code à 6 chiffres reçu par courriel', verify:'Vérifier et ouvrir l’administration', busy:'Un instant…', invalid:'Le code est incorrect, expiré ou déjà utilisé. Après 5 essais échoués, demandez un nouveau code.', rate:'Trop de demandes. Attendez au moins 60 secondes ; maximum 5 courriels par heure.', unavailable:'L’envoi des codes administrateur n’est pas encore configuré. L’accès reste verrouillé jusqu’à la connexion du service courriel.', delivery:'Le courriel n’a pas pu être envoyé. Attendez une minute et réessayez.', error:'Vérification momentanément indisponible. Veuillez réessayer.', note:'La vérification ouvre l’administration pendant 30 minutes pour cette connexion.', denied:'Connectez-vous avec un compte administrateur autorisé.' },
  zh: { title:'验证管理员邮箱', intro:'向您的账号邮箱发送 6 位验证码，无需扫码或安装验证器。', send:'发送邮箱验证码', resend:'重新发送验证码', sent:'邮件已发送，请检查收件箱及垃圾邮件。请在 10 分钟内输入最新验证码。', code:'邮箱中的 6 位验证码', verify:'验证并进入管理后台', busy:'正在处理…', invalid:'验证码不正确、已过期或已使用。连续输错 5 次后，请重新获取。', rate:'请求过于频繁，请至少等待 60 秒；每小时最多发送 5 次。', unavailable:'管理员验证码邮件服务尚未配置，接通发信服务后才能验证并进入后台。', delivery:'邮件发送失败，请等待一分钟后重试。', error:'验证服务暂时不可用，请稍后重试。', note:'验证后，本次登录可访问后台 30 分钟。', denied:'请使用已获授权的管理员账号登录。' },
};
export function AdminEmailPanel({lang}: {lang: Language}) {
  const auth=useAuth(), t=copy[lang];
  const [challenge,setChallenge]=useState('');
  const [code,setCode]=useState('');
  const [busy,setBusy]=useState(false);
  const [cooldown,setCooldown]=useState(0);
  const [error,setError]=useState('');
  const inFlight=useRef(false),generation=useRef(0);
  useEffect(()=>{ generation.current++; setChallenge(''); setCode(''); setError(''); setBusy(false); inFlight.current=false; setCooldown(0); return ()=>{generation.current++;}; },[auth.user?.id]);
  useEffect(()=>{ if(!cooldown)return; const timer=window.setTimeout(()=>setCooldown(n=>Math.max(0,n-1)),1000);return ()=>clearTimeout(timer);},[cooldown]);
  async function request(action: 'send'|'verify') {
    if(!supabase || !auth.staffRole || inFlight.current || (action==='send' && cooldown>0))return;
    const version=generation.current;
    inFlight.current=true; setBusy(true); setError('');
    try {
      const {data,error:invokeError}=await supabase.functions.invoke('staff-email-verification',{body:{action,language:lang,...(action==='verify'?{code,challengeId:challenge}:{})}});
      if(version!==generation.current)return;
      let reason=data?.error;
      if(invokeError) { try { reason=(await invokeError.context?.json())?.error; } catch { /* Do not render raw server errors. */ } }
      if(invokeError || data?.ok!==true) {
        const key=reason==='invalid_code'?'invalid':reason==='rate_limited'?'rate':reason==='email_not_configured'?'unavailable':reason==='delivery_failed'?'delivery':reason==='forbidden' || reason==='authentication_required'?'denied':'error';
        setError(t[key]);
        if(reason==='rate_limited' || reason==='delivery_failed')setCooldown(60);
        return;
      }
      if(action==='send') {
        if(typeof data.challengeId!=='string') {setError(t.error);return;}
        setChallenge(data.challengeId);setCode('');setCooldown(60);
      } else {setCode('');await auth.refreshAuth();}
    } catch {if(version===generation.current)setError(t.error);}
    finally {if(version===generation.current){setBusy(false);inFlight.current=false;}}
  }
  function submit(event: FormEvent) {event.preventDefault();void request('verify');}
  return <section className="auth-card mfa-card" aria-labelledby="email-check-title">
    <div className="auth-symbol"><Mail size={26}/></div>
    <h2 id="email-check-title">{t.title}</h2><p className="auth-subtitle">{t.intro}</p>
    <p><strong>{auth.user?.email}</strong></p>
    {error && <div className="auth-error" role="alert">{error}</div>}
    {challenge && <><p className="auth-notice" role="status">{t.sent}</p><form className="auth-form" onSubmit={submit}>
      <label>{t.code}<input name="email-code" type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} disabled={busy} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))}/></label>
      <button type="submit" className="auth-primary" disabled={busy}>{busy?t.busy:t.verify}</button>
    </form></>}
    <button type="button" className={challenge?'auth-text-button':'auth-primary'} disabled={busy || cooldown>0} onClick={()=>void request('send')}>{busy?t.busy:challenge?t.resend:t.send}{cooldown>0?` (${cooldown}s)`:''}</button>
    <p className="auth-privacy">{t.note}</p>
  </section>;
}
