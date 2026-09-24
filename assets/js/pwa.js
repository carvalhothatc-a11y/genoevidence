/* aplicativo: registra o modo offline e mostra o botão "Instalar como app" com a ajuda certa para cada aparelho */
(function(){
  var root=(document.querySelector('meta[name="ge-root"]')||{}).content||'./';
  if('serviceWorker' in navigator && location.protocol==='https:'){addEventListener('load',function(){navigator.serviceWorker.register(root+'sw.js',{scope:root}).catch(function(){});});}
  var standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;if(standalone)return;
  var ua=navigator.userAgent,ios=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),
      inApp=/FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|GSA\/|musical_ly|BytedanceWebview|Snapchat|Pinterest/i.test(ua),
      iosOther=/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua),android=/android/i.test(ua),deferred=null;
  var SHARE='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="ícone Compartilhar"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  var PLUS='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-label="ícone Adicionar"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  function content(){
    if(ios&&inApp)return '<b class="t">Abra no Safari primeiro</b><p>Você abriu o link dentro de outro aplicativo, e por isso a opção de instalar não aparece.</p><ol><li>Toque em <b>•••</b> ou no ícone de bússola e escolha <b>Abrir no Safari</b>. Se não houver essa opção, toque em <b>Copiar link</b> abaixo e cole no Safari.</li><li>No Safari, siga os passos de instalação.</li></ol>';
    if(ios&&iosOther)return '<b class="t">Instalar no iPhone ou iPad</b><ol><li>Toque em Compartilhar '+SHARE+' (na barra de endereço ou no menu).</li><li>Escolha <b>Adicionar à Tela de Início</b> '+PLUS+'.</li><li>Toque em <b>Adicionar</b>.</li></ol><p class="tip2">Se a opção não aparecer neste navegador, toque em <b>Copiar link</b> e abra no <b>Safari</b>.</p>';
    if(ios)return '<b class="t">Instalar no iPhone ou iPad</b><ol><li>Toque em Compartilhar '+SHARE+' na barra do Safari (embaixo ou em cima da tela; se não aparecer, toque em <b>•••</b> ao lado do endereço).</li><li>Role a lista <b>para baixo</b> e toque em <b>Adicionar à Tela de Início</b> '+PLUS+'.</li><li>Se aparecer <b>Abrir como App Web</b>, deixe ligado. Toque em <b>Adicionar</b>.</li></ol><p class="tip2">Não encontrou? No fim da lista, toque em <b>Editar Ações…</b> e adicione “Adicionar à Tela de Início”. Se abriu o link pelo WhatsApp ou Instagram, abra primeiro no Safari.</p>';
    if(android)return '<b class="t">Instalar no Android</b><ol><li>No Chrome, toque no menu <b>⋮</b> (canto superior direito).</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li><li>Confirme em <b>Instalar</b>.</li></ol><p class="tip2">Se abriu o link dentro de outro app, abra primeiro no Chrome.</p>';
    return '<b class="t">Instalar no computador</b><ol><li><b>Chrome ou Edge:</b> clique no ícone de instalar à direita da barra de endereço, ou no menu ⋮ → <b>Instalar</b>.</li><li><b>Safari (Mac):</b> menu Arquivo → <b>Adicionar ao Dock</b>.</li></ol><p class="tip2">O Firefox não instala sites como app; use Chrome, Edge ou Safari.</p>';}
  var row=document.querySelector('.cta-row'),foot=document.querySelector('.drawer-foot');
  function mk(cls){var b=document.createElement('button');b.type='button';b.className=cls;b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg><span>Instalar como app</span>';b.addEventListener('click',install);return b;}
  var b1=mk('cta ghost install-btn'),b2=mk('drawer-install');if(row)row.appendChild(b1);if(foot)foot.parentNode.insertBefore(b2,foot);
  var scrim=document.createElement('div');scrim.className='install-scrim';scrim.hidden=true;document.body.appendChild(scrim);
  var help=document.createElement('div');help.className='install-help';help.hidden=true;help.setAttribute('role','dialog');help.setAttribute('aria-modal','true');help.setAttribute('aria-label','Como instalar o GenoEvidence');document.body.appendChild(help);
  function close(){help.hidden=true;scrim.hidden=true;}
  scrim.addEventListener('click',close);addEventListener('keydown',function(e){if(e.key==='Escape'&&!help.hidden)close();});
  function openHelp(){help.innerHTML=content()+'<div class="btns"><button type="button" class="ghost" data-a="copy">Copiar link</button><button type="button" data-a="ok">Entendi</button></div>';
    help.querySelector('[data-a=ok]').addEventListener('click',close);
    help.querySelector('[data-a=copy]').addEventListener('click',function(){var bt=this,url=location.origin+location.pathname,done=function(){bt.textContent='Link copiado';};
      try{navigator.clipboard.writeText(url).then(done,function(){prompt('Copie o link:',url);});}catch(e){prompt('Copie o link:',url);}});
    scrim.hidden=false;help.hidden=false;help.querySelector('[data-a=ok]').focus();}
  addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;});
  addEventListener('appinstalled',function(){deferred=null;b1.hidden=b2.hidden=true;close();});
  function install(){if(deferred){deferred.prompt();deferred.userChoice.then(function(r){if(r.outcome==='accepted'){b1.hidden=b2.hidden=true;}deferred=null;});}else openHelp();}
})();
