import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const media = resolve(root, 'media')
const output = resolve(root, 'public', 'brand')
const sourceOutput = resolve(root, 'src', 'assets', 'brand')
const transparent = { r: 0, g: 0, b: 0, alpha: 0 }

await Promise.all([
  mkdir(output, { recursive: true }),
  mkdir(sourceOutput, { recursive: true }),
])

const faviconCrop = await sharp(resolve(media, 'Favicon.jpeg'))
  .extract({ left: 900, top: 286, width: 940, height: 940 })
  .toBuffer()

async function removeWhiteBackground(input) {
  const trimmed = await sharp(input)
    .trim({ background: '#ffffff', threshold: 18 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const data = Buffer.from(trimmed.data)
  for (let index = 0; index < data.length; index += trimmed.info.channels) {
    const red = data[index]
    const green = data[index + 1]
    const blue = data[index + 2]
    const deviation = Math.max(255 - red, 255 - green, 255 - blue)
    const alpha = deviation <= 16 ? 0 : deviation < 126 ? Math.round(((deviation - 16) / 110) * 255) : 255

    if (alpha > 0 && alpha < 255) {
      const opacity = alpha / 255
      data[index] = Math.max(0, Math.min(255, Math.round((red - (255 * (1 - opacity))) / opacity)))
      data[index + 1] = Math.max(0, Math.min(255, Math.round((green - (255 * (1 - opacity))) / opacity)))
      data[index + 2] = Math.max(0, Math.min(255, Math.round((blue - (255 * (1 - opacity))) / opacity)))
    }

    data[index + 3] = alpha
  }

  return sharp(data, {
    raw: {
      width: trimmed.info.width,
      height: trimmed.info.height,
      channels: trimmed.info.channels,
    },
  }).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
}

const mark = await sharp(await removeWhiteBackground(faviconCrop))
  .resize({ width: 420, height: 420, fit: 'inside', withoutEnlargement: true })
  .toBuffer()

const brandMark = await sharp({ create: { width: 512, height: 512, channels: 4, background: transparent } })
  .composite([{ input: mark, gravity: 'centre' }])
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer()

await Promise.all([
  writeFile(resolve(output, 'brand-mark-512.png'), brandMark),
  writeFile(resolve(sourceOutput, 'brand-mark-512.png'), brandMark),
  writeFile(resolve(output, 'favicon-transparent.png'), brandMark),
])

for (const size of [32, 180, 192]) {
  await sharp(resolve(output, 'brand-mark-512.png'))
    .resize(size, size)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(resolve(output, `brand-mark-${size}.png`))
}

await sharp(resolve(output, 'brand-mark-180.png')).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(resolve(output, 'favicon.png'))

const primaryPng = await removeWhiteBackground(resolve(media, 'mainlogo.jpeg'))
const primary = await sharp(primaryPng)
  .resize({ width: 1200, withoutEnlargement: true })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer()
await Promise.all([
  writeFile(resolve(output, 'logo-primary.png'), primary),
  writeFile(resolve(sourceOutput, 'logo-primary.png'), primary),
  writeFile(resolve(output, 'logo-transparent.png'), primary),
  sharp(primary).webp({ quality: 94, smartSubsample: true }).toFile(resolve(output, 'logo-primary.webp')),
])

const horizontalPng = await removeWhiteBackground(resolve(media, 'secondary logo.jpeg'))
const horizontalLogo = await sharp(horizontalPng)
  .resize({ width: 1400, withoutEnlargement: true })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer()

await Promise.all([
  writeFile(resolve(output, 'logo-horizontal.png'), horizontalLogo),
  writeFile(resolve(sourceOutput, 'logo-horizontal.png'), horizontalLogo),
  sharp(horizontalLogo).webp({ quality: 94, smartSubsample: true }).toFile(resolve(output, 'logo-horizontal.webp')),
])

await sharp({ create: { width: 1200, height: 630, channels: 4, background: { r: 7, g: 19, b: 29, alpha: 1 } } })
  .composite([{ input: await sharp(primary).resize({ width: 860, height: 500, fit: 'inside' }).toBuffer(), gravity: 'centre' }])
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(resolve(output, 'social-card.jpg'))
