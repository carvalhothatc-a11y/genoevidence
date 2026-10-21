# GenoGame · divide a arte do Geninho em camadas que se mexem (genogame/img/gn-*.webp).
# Uso: python3 scripts/genogame/camadas.py geninho-recorte.png genogame/img
# O recorte (fundo transparente) sai de scripts/genogame/recorta.swift. Coordenadas da imagem original, 720 × 720 px;
# as articulações usadas na animação estão em genogame/genogame.css (transform-origin de cada .p-*).
import sys
from PIL import Image, ImageFilter
import numpy as np
src, destino = sys.argv[1], sys.argv[2]
im=Image.open(src).convert('RGBA')
A=np.array(im).astype(np.float32); H,W=A.shape[:2]
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
alpha=A[...,3]/255.0; R,G,B=A[...,0],A[...,1],A[...,2]
def lin(v,a,b): return np.clip((b-v)/(b-a),0,1)
def faixa(v,a,b,fe): return np.clip(np.minimum((v-(a-fe))/fe,((b+fe)-v)/fe),0,1)
def suave(m,r): return np.array(Image.fromarray((np.clip(m,0,1)*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)/255
camadas={}
# cabeça: acima do pescoço; logo abaixo do corte fica opaca por 10 px e depois some
cab_ex=(yy<228)
camadas['cabeca']=(np.where(cab_ex,1.0,lin(yy,238,262)*(yy>=228)), A)
# antebraço e pata levantada: os pixels lilases à esquerda do punho; ficam ATRÁS da manga
punho=222+np.maximum(0,yy-335)*0.2          # linha do punho da manga
ante_ex=(xx<punho)&(yy>296)&(yy<408)
ante=suave(ante_ex*1.0,0.8)*((xx<punho+3)&(yy>292)&(yy<412))
ante=np.maximum(ante,ante_ex*1.0)
# prolongamento do antebraço por baixo da manga (só aparece se o braço girar)
Bb=A.copy(); ab=ante.copy(); sangra=np.zeros_like(alpha,dtype=bool)
for y in range(320,410):
    linha=np.where(ante_ex[y])[0]
    if len(linha)==0: continue
    x1=linha.max(); cor=A[y,max(x1-3,0),:3]
    for x in range(x1+1,min(x1+22,W)):
        if alpha[y,x]>0.98: Bb[y,x,:3]=cor; ab[y,x]=1.0; sangra[y,x]=True
Bb[...,3]=255
camadas['braco']=(ab, Bb)
# pernas: abaixo do corte é só da perna; acima, uma faixa opaca que depois some
pe_e_ex=(yy>=602)&(xx>=236)&(xx<374)
pe_d_ex=(yy>=612)&(xx>=418)&(xx<516)
camadas['perna-e']=(np.where(pe_e_ex,1.0,lin(-yy,-592,-566)*faixa(xx,242,370,10)*(yy<602)), A)
camadas['perna-d']=(np.where(pe_d_ex,1.0,lin(-yy,-602,-576)*faixa(xx,422,512,10)*(yy<612)), A)
# cauda: pixels lilases à direita; fica ATRÁS do corpo e ganha um prolongamento escondido sob o jaleco
reg_c=(xx>=470)&(yy>=462)&(yy<=632)
cauda_ex=(((xx>=523)&(yy>=462)) | ((xx>=514)&(yy>=576)))&(yy<=632)&(alpha>0.02)
C=A.copy(); ca=suave(cauda_ex,1.5)
for y in range(462,633):
    linha=np.where(cauda_ex[y])[0]
    if len(linha)==0: continue
    x0=linha.min()
    if x0>=600: continue
    cor=A[y,min(x0+3,W-1),:3]
    for x in range(470,x0):
        C[y,x,:3]=cor; ca[y,x]=max(ca[y,x], np.clip((x-470)/18,0,1))
C[...,3]=255
camadas['cauda']=(ca, C)
corpo_ex=np.clip(cab_ex+ante_ex+pe_e_ex+pe_d_ex+cauda_ex,0,1)
camadas['corpo']=(1.0-corpo_ex, A)
for n,(m,base) in camadas.items():
    out=base.copy()
    if n=='cauda': al=np.where(xx<524, 1.0, alpha)
    elif n=='braco': al=np.where(sangra, 1.0, alpha)
    else: al=alpha
    out[...,3]=np.clip(al*m*255,0,255)
    Image.fromarray(out.astype(np.uint8)).crop((115,27,645,664)).save(destino+'/gn-'+n+'.webp','WEBP',quality=90,method=6)
print('ok')
