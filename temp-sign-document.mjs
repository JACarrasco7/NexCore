import { PDFDocument } from 'pdf-lib';
import { writeFile, mkdir, stat } from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
const prisma = new PrismaClient();

(async () => {
  try {
    const docId = 'cmouho9hn0001r669cb63u48z'; // created earlier
    const userEmail = 'test.otp@example.com';

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) throw new Error('User not found');

    const athlete = await prisma.athlete.findUnique({ where: { userId: user.id } });
    if (!athlete) throw new Error('Athlete not found');

    const document = await prisma.document.findUnique({ where: { id: docId } });
    if (!document) throw new Error('Document not found');

    const publicPath = path.join(process.cwd(), 'public', document.fileUrl);
    const dir = path.dirname(publicPath);
    try {
      await stat(publicPath);
      console.log('Source PDF exists:', publicPath);
    } catch (err) {
      console.log('Source PDF missing; creating a basic PDF at', publicPath);
      await mkdir(dir, { recursive: true });
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      page.drawText('Documento de prueba - contrato', { x: 50, y: 700, size: 18 });
      const bytes = await pdfDoc.save();
      await writeFile(publicPath, bytes);
      console.log('Created dummy PDF');
    }

    // Load source PDF and apply visible signature
    const inputBytes = await import('fs/promises').then(m => m.readFile(publicPath));
    const pdfDoc = await PDFDocument.load(inputBytes);
    const font = await pdfDoc.embedFont(undefined /* default sans serif */).catch(() => null);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();
    const dateString = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const dni = '12345678X';
    const signerName = user.name ?? user.email;
    const dniMasked = dni.trim().length <= 4 ? '****' : `${dni.slice(0,2)}${'*'.repeat(Math.max(0,dni.length-4))}${dni.slice(-2)}`;
    const text = `Firmado por ${signerName} (${dniMasked})\nFecha: ${dateString}`;
    lastPage.drawText(text, { x: 40, y: 40, size: 10 });

    const signedBytes = await pdfDoc.save();
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'docs');
    await mkdir(uploadsDir, { recursive: true });
    const signedName = `${path.basename(document.fileUrl, path.extname(document.fileUrl))}-signed-${Date.now()}${path.extname(document.fileUrl)}`;
    const signedPath = path.join(uploadsDir, signedName);
    await writeFile(signedPath, signedBytes);

    const pdfHash = crypto.createHash('sha256').update(Buffer.from(signedBytes)).digest('hex');
    const dniHash = crypto.createHash('sha256').update(dni.trim().toUpperCase()).digest('hex');

    const signature = await prisma.documentSignature.create({
      data: {
        documentId: document.id,
        athleteId: athlete.id,
        userId: user.id,
        dniHash,
        otpUsed: true,
        ipAddress: '127.0.0.1',
        userAgent: 'temp-script',
        timestampServer: new Date(),
        signaturePath: `/uploads/docs/${signedName}`,
        pdfHash,
        status: 'SIGNED',
      },
    });

    console.log('Signature created:', signature.id, 'signedUrl:', `/uploads/docs/${signedName}`);
    await prisma.$disconnect();
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
