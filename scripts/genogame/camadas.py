# GenoGame · divide a arte do Geninho em camadas que se mexem (genogame/img/gn2-*.webp).
# Ao mudar as camadas, troque o prefixo (gn2- → gn3-) aqui e em genogame.js, para o modo offline não misturar versões.
# Uso: python3 scripts/genogame/camadas.py geninho-recorte.png genogame/img
# O recorte (fundo transparente) sai de scripts/genogame/recorta.swift. Coordenadas da imagem original, 720 × 720 px;
# as articulações usadas na animação estão em genogame/genogame.css (transform-origin de cada .p-*).
import sys
from PIL import Image, ImageDraw, ImageFilter
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
# braço esquerdo inteiro (manga, antebraço e pata). Na arte ele está levantado; aqui ele desce, girando no
# ombro, e fica NA FRENTE do corpo. A lateral do jaleco que a manga escondia é completada com a textura do
# próprio painel do jaleco, logo abaixo (clonada para cima).
OMBRO=(266,300); ANG_BRACO=55          # graus, no sentido anti-horário (o CSS gira a partir desta pose)
def poligono(pts, blur=0):
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(pts,fill=255)
    if blur: m=m.filter(ImageFilter.GaussianBlur(blur))
    return np.array(m).astype(np.float32)/255
CONTORNO_BRACO=[(90,290),(205,318),(250,292),(261,297),(262,332),(262,414),(244,424),(90,424)]
braco_ex=poligono(CONTORNO_BRACO)>0.5
lateral=poligono([(262,292),(276,288),(272,340),(268,420),(246,422),(250,360)],1.5)
A_corpo=A.copy()
for y in range(280,425):
    for x in range(236,282):
        k=lateral[y,x]
        if k<=0: continue
        ys=min(H-1,y+118)
        px=A[ys,x] if A[ys,x,3]>200 else A[ys,min(x+8,W-1)]
        A_corpo[y,x,:3]=A_corpo[y,x,:3]*(1-k)+px[:3]*k
        A_corpo[y,x,3]=max(A_corpo[y,x,3],255*k)
braco_img=A.copy(); braco_img[...,3]=braco_img[...,3]*poligono(CONTORNO_BRACO,1.2)
braco_img=np.array(Image.fromarray(braco_img.astype(np.uint8)).rotate(ANG_BRACO, resample=Image.BICUBIC, center=OMBRO)).astype(np.float32)
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
corpo_ex=np.clip(cab_ex+(braco_ex&(lateral<0.5))+pe_e_ex+pe_d_ex+cauda_ex,0,1)
camadas['corpo']=(1.0-corpo_ex, A_corpo)
def salva(n, out):
    Image.fromarray(np.clip(out,0,255).astype(np.uint8)).crop((115,27,645,664)).save(destino+'/gn2-'+n+'.webp','WEBP',quality=90,method=6)
for n,(m,base) in camadas.items():
    out=base.copy()
    if n=='cauda': al=np.where(xx<524, 1.0, alpha)
    elif n=='corpo': al=A_corpo[...,3]/255
    else: al=alpha
    out[...,3]=np.clip(al*m*255,0,255)
    salva(n, out)
salva('braco', braco_img)
print('ok')
