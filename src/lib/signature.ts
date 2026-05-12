import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { SignatureStatus } from '@prisma/client'

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'docs')

function maskDni(dni: string) {
  const cleaned = dni.trim()
  if (cleaned.length <= 4) return '****'
  return `${cleaned.slice(0, 2)}${'*'.repeat(Math.max(0, cleaned.length - 4))}${cleaned.slice(-2)}`
}

function hashValue(value: string | Uint8Array | Buffer) {
  const buf =
    typeof value === 'string' ? Buffer.from(value, 'binary') : Buffer.from(value as Uint8Array)
  return crypto.createHash('sha256').update(buf).digest('hex')
}

export async function signDocument({
  documentId,
  athleteId,
  userId,
  signerName,
  dni,
  ipAddress,
  userAgent,
}: {
  documentId: string
  athleteId: string
  userId: string
  signerName: string
  dni: string
  ipAddress?: string | null
  userAgent?: string | null
}) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, athleteId: true, mimeType: true, fileUrl: true, title: true },
  })

  if (!document) {
    throw new Error('Documento no encontrado')
  }

  if (document.athleteId !== athleteId) {
    throw new Error('No tienes permiso para firmar este documento')
  }

  if (document.mimeType !== 'application/pdf') {
    throw new Error('Solo se pueden firmar documentos PDF')
  }

  const sourcePath = path.join(process.cwd(), 'public', document.fileUrl)
  const inputBytes = await readFile(sourcePath)
  const pdfDoc = await PDFDocument.load(inputBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  const { width } = lastPage.getSize()
  const dateString = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
  const dniMasked = maskDni(dni)
  const text = `Firmado por ${signerName} (${dniMasked})\nFecha: ${dateString}`

  lastPage.drawText(text, {
    x: 40,
    y: 40,
    size: 10,
    font,
    color: rgb(0.05, 0.1, 0.25),
    lineHeight: 12,
    maxWidth: width - 80,
  })

  const signedBytes = await pdfDoc.save()
  await mkdir(UPLOADS_DIR, { recursive: true })

  const signedName = `${path.basename(document.fileUrl, path.extname(document.fileUrl))}-signed-${Date.now()}${path.extname(document.fileUrl)}`
  const signedPath = path.join(UPLOADS_DIR, signedName)
  await writeFile(signedPath, signedBytes)

  const pdfHash = hashValue(signedBytes)
  const dniHash = hashValue(dni.trim().toUpperCase())

  const signature = await prisma.documentSignature.create({
    data: {
      documentId: document.id,
      athleteId,
      userId,
      dniHash,
      otpUsed: true,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      timestampServer: new Date(),
      signaturePath: `/uploads/docs/${signedName}`,
      pdfHash,
      status: SignatureStatus.SIGNED,
    },
  })

  return {
    signature,
    signedUrl: `/uploads/docs/${signedName}`,
  }
}
