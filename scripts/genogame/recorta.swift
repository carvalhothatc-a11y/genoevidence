// GenoGame · tira o fundo da arte do Geninho com o recorte de objeto do macOS (Vision), sem enviar a imagem a nenhum serviço.
// Uso: swiftc -O recorta.swift -o recorta && ./recorta genogame/img/geninho-corpo.jpg geninho-recorte.png
import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
let entrada = URL(fileURLWithPath: args[1]), saida = URL(fileURLWithPath: args[2])
guard let ci = CIImage(contentsOf: entrada) else { print("sem imagem"); exit(1) }
let req = VNGenerateForegroundInstanceMaskRequest()
let h = VNImageRequestHandler(ciImage: ci)
try h.perform([req])
guard let r = req.results?.first else { print("sem resultado"); exit(1) }
let mask = try r.generateScaledMaskForImage(forInstances: r.allInstances, from: h)
let m = CIImage(cvPixelBuffer: mask)
let out = ci.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: CIImage.empty(), kCIInputMaskImageKey: m])
let ctx = CIContext()
try ctx.writePNGRepresentation(of: out, to: saida, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
print("ok", r.allInstances.count)
