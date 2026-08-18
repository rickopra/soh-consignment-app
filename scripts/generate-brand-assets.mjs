import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const media = resolve(root, 'media')
const output = resolve(root, 'public', 'brand')
const white = { r: 255, g: 255, b: 255, alpha: 1 }

await mkdir(output, { recursive: true })

const faviconCrop = await sharp(resolve(media, 'Favicon.jpeg'))
  .extract({ left: 900, top: 286, width: 940, height: 940 })
  .toBuffer()
const mark = await sharp(faviconCrop)
  .trim({ background: '#ffffff', threshold: 12 })
  .resize({ width: 420, height: 420, fit: 'inside', withoutEnlargement: true })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer()

await sharp({ create: { width: 512, height: 512, channels: 4, background: white } })
  .composite([{ input: mark, gravity: 'centre' }])
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(resolve(output, 'brand-mark-512.png'))

for (const size of [32, 180, 192]) {
  await sharp(resolve(output, 'brand-mark-512.png'))
    .resize(size, size)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(resolve(output, `brand-mark-${size}.png`))
}

const primary = await sharp(resolve(media, 'mainlogo.jpeg'))
  .trim({ background: '#ffffff', threshold: 12 })
  .resize({ width: 1200, withoutEnlargement: true })
  .webp({ quality: 94, smartSubsample: true })
  .toBuffer()
await sharp(primary).toFile(resolve(output, 'logo-primary.webp'))

await sharp(resolve(media, 'secondary logo.jpeg'))
  .trim({ background: '#ffffff', threshold: 12 })
  .resize({ width: 1400, withoutEnlargement: true })
  .webp({ quality: 94, smartSubsample: true })
  .toFile(resolve(output, 'logo-horizontal.webp'))

await sharp({ create: { width: 1200, height: 630, channels: 4, background: white } })
  .composite([{ input: await sharp(primary).resize({ width: 860, height: 500, fit: 'inside' }).toBuffer(), gravity: 'centre' }])
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(resolve(output, 'social-card.jpg'))
