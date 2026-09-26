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
  // ajuda de instalação nos três idiomas (o idioma vem do assets/js/i18n.js)
  var L=(window.GE_I18N&&window.GE_I18N.lang)||'pt';
  var TX={
    pt:{inApp:'<b class="t">Abra no Safari primeiro</b><p>Você abriu o link dentro de outro aplicativo, e por isso a opção de instalar não aparece.</p><ol><li>Toque em <b>•••</b> ou no ícone de bússola e escolha <b>Abrir no Safari</b>. Se não houver essa opção, toque em <b>Copiar link</b> abaixo e cole no Safari.</li><li>No Safari, siga os passos de instalação.</li></ol>',
        iosOutro:'<b class="t">Instalar no iPhone ou iPad</b><ol><li>Toque em Compartilhar {S} (na barra de endereço ou no menu).</li><li>Escolha <b>Adicionar à Tela de Início</b> {P}.</li><li>Toque em <b>Adicionar</b>.</li></ol><p class="tip2">Se a opção não aparecer neste navegador, toque em <b>Copiar link</b> e abra no <b>Safari</b>.</p>',
        ios:'<b class="t">Instalar no iPhone ou iPad</b><ol><li>Toque em Compartilhar {S} na barra do Safari (embaixo ou em cima da tela; se não aparecer, toque em <b>•••</b> ao lado do endereço).</li><li>Role a lista <b>para baixo</b> e toque em <b>Adicionar à Tela de Início</b> {P}.</li><li>Se aparecer <b>Abrir como App Web</b>, deixe ligado. Toque em <b>Adicionar</b>.</li></ol><p class="tip2">Não encontrou? No fim da lista, toque em <b>Editar Ações…</b> e adicione “Adicionar à Tela de Início”. Se abriu o link pelo WhatsApp ou Instagram, abra primeiro no Safari.</p>',
        android:'<b class="t">Instalar no Android</b><ol><li>No Chrome, toque no menu <b>⋮</b> (canto superior direito).</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li><li>Confirme em <b>Instalar</b>.</li></ol><p class="tip2">Se abriu o link dentro de outro app, abra primeiro no Chrome.</p>',
        pc:'<b class="t">Instalar no computador</b><ol><li><b>Chrome ou Edge:</b> clique no ícone de instalar à direita da barra de endereço, ou no menu ⋮ → <b>Instalar</b>.</li><li><b>Safari (Mac):</b> menu Arquivo → <b>Adicionar ao Dock</b>.</li></ol><p class="tip2">O Firefox não instala sites como app; use Chrome, Edge ou Safari.</p>',
        copiar:'Copiar link',ok:'Entendi',copiado:'Link copiado',copie:'Copie o link:'},
    en:{inApp:'<b class="t">Open in Safari first</b><p>You opened the link inside another app, so the install option does not appear.</p><ol><li>Tap <b>•••</b> or the compass icon and choose <b>Open in Safari</b>. If that option is not there, tap <b>Copy link</b> below and paste it into Safari.</li><li>In Safari, follow the install steps.</li></ol>',
        iosOutro:'<b class="t">Install on iPhone or iPad</b><ol><li>Tap Share {S} (in the address bar or the menu).</li><li>Choose <b>Add to Home Screen</b> {P}.</li><li>Tap <b>Add</b>.</li></ol><p class="tip2">If the option does not appear in this browser, tap <b>Copy link</b> and open it in <b>Safari</b>.</p>',
        ios:'<b class="t">Install on iPhone or iPad</b><ol><li>Tap Share {S} in the Safari bar (at the bottom or top of the screen; if it is not there, tap <b>•••</b> next to the address).</li><li>Scroll the list <b>down</b> and tap <b>Add to Home Screen</b> {P}.</li><li>If <b>Open as Web App</b> appears, leave it on. Tap <b>Add</b>.</li></ol><p class="tip2">Can’t find it? At the end of the list, tap <b>Edit Actions…</b> and add “Add to Home Screen”. If you opened the link from WhatsApp or Instagram, open it in Safari first.</p>',
        android:'<b class="t">Install on Android</b><ol><li>In Chrome, tap the <b>⋮</b> menu (top right).</li><li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Confirm with <b>Install</b>.</li></ol><p class="tip2">If you opened the link inside another app, open it in Chrome first.</p>',
        pc:'<b class="t">Install on a computer</b><ol><li><b>Chrome or Edge:</b> click the install icon on the right of the address bar, or menu ⋮ → <b>Install</b>.</li><li><b>Safari (Mac):</b> File menu → <b>Add to Dock</b>.</li></ol><p class="tip2">Firefox does not install sites as apps; use Chrome, Edge or Safari.</p>',
        copiar:'Copy link',ok:'Got it',copiado:'Link copied',copie:'Copy the link:'},
    es:{inApp:'<b class="t">Abre primero en Safari</b><p>Abriste el enlace dentro de otra aplicación, por eso no aparece la opción de instalar.</p><ol><li>Toca <b>•••</b> o el ícono de brújula y elige <b>Abrir en Safari</b>. Si no existe esa opción, toca <b>Copiar enlace</b> abajo y pégalo en Safari.</li><li>En Safari, sigue los pasos de instalación.</li></ol>',
        iosOutro:'<b class="t">Instalar en iPhone o iPad</b><ol><li>Toca Compartir {S} (en la barra de direcciones o en el menú).</li><li>Elige <b>Agregar a inicio</b> {P}.</li><li>Toca <b>Agregar</b>.</li></ol><p class="tip2">Si la opción no aparece en este navegador, toca <b>Copiar enlace</b> y ábrelo en <b>Safari</b>.</p>',
        ios:'<b class="t">Instalar en iPhone o iPad</b><ol><li>Toca Compartir {S} en la barra de Safari (abajo o arriba de la pantalla; si no aparece, toca <b>•••</b> junto a la dirección).</li><li>Desplaza la lista <b>hacia abajo</b> y toca <b>Agregar a inicio</b> {P}.</li><li>Si aparece <b>Abrir como app web</b>, déjalo activado. Toca <b>Agregar</b>.</li></ol><p class="tip2">¿No lo encuentras? Al final de la lista, toca <b>Editar acciones…</b> y agrega “Agregar a inicio”. Si abriste el enlace desde WhatsApp o Instagram, ábrelo primero en Safari.</p>',
        android:'<b class="t">Instalar en Android</b><ol><li>En Chrome, toca el menú <b>⋮</b> (arriba a la derecha).</li><li>Toca <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.</li><li>Confirma en <b>Instalar</b>.</li></ol><p class="tip2">Si abriste el enlace dentro de otra app, ábrelo primero en Chrome.</p>',
        pc:'<b class="t">Instalar en la computadora</b><ol><li><b>Chrome o Edge:</b> haz clic en el ícono de instalar a la derecha de la barra de direcciones, o en el menú ⋮ → <b>Instalar</b>.</li><li><b>Safari (Mac):</b> menú Archivo → <b>Agregar al Dock</b>.</li></ol><p class="tip2">Firefox no instala sitios como app; usa Chrome, Edge o Safari.</p>',
        copiar:'Copiar enlace',ok:'Entendido',copiado:'Enlace copiado',copie:'Copia el enlace:'}
  };
  var T=TX[L]||TX.pt;
  function content(){
    var c=ios&&inApp?T.inApp:ios&&iosOther?T.iosOutro:ios?T.ios:android?T.android:T.pc;
    return c.replace('{S}',SHARE).replace('{P}',PLUS);}
  var row=document.querySelector('[data-instalar]')||document.querySelector('.cta-row'),foot=document.querySelector('.drawer-foot');
  function mk(cls){var b=document.createElement('button');b.type='button';b.className=cls;b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg><span>Instalar como app</span>';b.addEventListener('click',install);return b;}
  var b1=mk('cta ghost install-btn'),b2=mk('drawer-install');if(row)row.appendChild(b1);if(foot)foot.parentNode.insertBefore(b2,foot);
  var scrim=document.createElement('div');scrim.className='install-scrim';scrim.hidden=true;document.body.appendChild(scrim);
  var help=document.createElement('div');help.className='install-help';help.hidden=true;help.setAttribute('role','dialog');help.setAttribute('aria-modal','true');help.setAttribute('aria-label','Como instalar o GenoEvidence');document.body.appendChild(help);
  function close(){help.hidden=true;scrim.hidden=true;}
  scrim.addEventListener('click',close);addEventListener('keydown',function(e){if(e.key==='Escape'&&!help.hidden)close();});
  function openHelp(){help.innerHTML=content()+'<div class="btns"><button type="button" class="ghost" data-a="copy">'+T.copiar+'</button><button type="button" data-a="ok">'+T.ok+'</button></div>';
    help.querySelector('[data-a=ok]').addEventListener('click',close);
    help.querySelector('[data-a=copy]').addEventListener('click',function(){var bt=this,url=location.origin+location.pathname,done=function(){bt.textContent=T.copiado;};
      try{navigator.clipboard.writeText(url).then(done,function(){prompt(T.copie,url);});}catch(e){prompt(T.copie,url);}});
    scrim.hidden=false;help.hidden=false;help.querySelector('[data-a=ok]').focus();}
  addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;});
  addEventListener('appinstalled',function(){deferred=null;b1.hidden=b2.hidden=true;close();});
  function install(){if(deferred){deferred.prompt();deferred.userChoice.then(function(r){if(r.outcome==='accepted'){b1.hidden=b2.hidden=true;}deferred=null;});}else openHelp();}
})();
