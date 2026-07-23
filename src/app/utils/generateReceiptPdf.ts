import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

export interface ReceiptData {
  paymentId: string; // your human-readable "PAY-XXXXXX"
  bookingId: string;
  apartmentName: string;
  checkIn: string; // pre-formatted date string, e.g. "Aug 12, 2026"
  checkOut: string;
  guestName: string;
  guestEmail: string;
  amount: number; // the amount actually charged
  currency: string; // 'usd' | 'eur' | 'dzd'
  paymentMethod: string; // 'card', 'edahabia', 'cib', etc.
  paymentDate: string; // pre-formatted date string
  paymentGateway: string; // pre-formatted date string
  hostName?: string;
}

const NAVY = '#00115a';
const GRAY = '#666666';
const LIGHT_GRAY = '#999999';
const BORDER = '#eeeeee';

const formatMoney = (amount: number, currency: string): string => {
  const symbol =
    currency.toLowerCase() === 'usd'
      ? '$'
      : currency.toLowerCase() === 'eur'
        ? '\u20ac'
        : ''; // DZD has no compact symbol; show code instead
  const formatted = amount.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });
  return currency.toLowerCase() === 'dzd'
    ? `${formatted} DZD`
    : `${symbol}${formatted}`;
};

/**
 * Generates a payment receipt PDF in-memory and returns it as a Buffer.
 * Save it to disk, upload it, or stream it straight to an HTTP response.
 */
export const generateReceiptPdf = (data: ReceiptData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    doc.pipe(stream);

    // ---- Header -------------------------------------------------------
    doc
      .fillColor(NAVY)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('DAYF BOOKING', 50, 50);

    doc
      .fillColor(GRAY)
      .fontSize(10)
      .font('Helvetica')
      .text('Payment Receipt', 50, 78);

    doc
      .fillColor(LIGHT_GRAY)
      .fontSize(9)
      .text(`Receipt #: ${data.paymentId}`, 400, 50, { align: 'right' })
      .text(`Date: ${data.paymentDate}`, 400, 64, { align: 'right' });

    doc.moveTo(50, 105).lineTo(545, 105).strokeColor(BORDER).stroke();

    // ---- Status badge ---------------------------------------------------
    doc.roundedRect(50, 125, 120, 26, 13).fillAndStroke('#16a34a', '#16a34a');
    doc
      .fillColor('#ffffff')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('PAID', 50, 133, { width: 120, align: 'center' });

    // ---- Billed to / Booking summary ------------------------------------
    let y = 175;

    doc
      .fillColor(NAVY)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Billed To', 50, y);
    doc
      .fillColor('#222222')
      .fontSize(10)
      .font('Helvetica')
      .text(data.guestName, 50, y + 18)
      .text(data.guestEmail, 50, y + 34);

    doc
      .fillColor(NAVY)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Booking Details', 300, y);
    doc
      .fillColor('#222222')
      .fontSize(10)
      .font('Helvetica')
      .text(`Booking ID: ${data.bookingId}`, 300, y + 18)
      .text(`Apartment: ${data.apartmentName}`, 300, y + 34)
      .text(`Check-in: ${data.checkIn}`, 300, y + 50)
      .text(`Check-out: ${data.checkOut}`, 300, y + 66);

    if (data.hostName) {
      doc.text(`Host: ${data.hostName}`, 300, y + 82);
    }

    // ---- Line items table -------------------------------------------
    y = 290;
    doc.moveTo(50, y).lineTo(545, y).strokeColor(BORDER).stroke();
    y += 15;

    doc.fillColor(GRAY).fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, y);
    doc.text('Method', 280, y);
    doc.text('Gateway', 365, y);
    doc.text('Amount', 450, y, { width: 95, align: 'right' });

    y += 20;
    doc.moveTo(50, y).lineTo(545, y).strokeColor(BORDER).stroke();
    y += 12;

    doc.fillColor('#222222').fontSize(10).font('Helvetica');
    doc.text(`Booking payment - ${data.apartmentName}`, 50, y, { width: 230 });
    doc.text(data.paymentMethod.toUpperCase(), 280, y, { width: 75 });
    doc.text(data.paymentGateway.toUpperCase(), 365, y, { width: 75 });
    doc.text(formatMoney(data.amount, data.currency), 450, y, {
      width: 95,
      align: 'right',
    });

    y += 30;
    doc.moveTo(50, y).lineTo(545, y).strokeColor(BORDER).stroke();
    y += 15;

    // ---- Total ---------------------------------------------------------
    doc
      .fillColor(NAVY)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Total Paid', 350, y)
      .text(formatMoney(data.amount, data.currency), 450, y, {
        width: 95,
        align: 'right',
      });

    // ---- Footer ----------------------------------------------------------
    doc
      .fillColor(LIGHT_GRAY)
      .fontSize(9)
      .font('Helvetica')
      .text(
        'This is an automatically generated receipt. Keep it for your records.',
        50,
        720,
        { width: 495, align: 'center' },
      )
      .text('Need help? support@dayfbooking.com', 50, 734, {
        width: 495,
        align: 'center',
      })
      .text('\u00A9 2025 DAYF BOOKING. All rights reserved.', 50, 748, {
        width: 495,
        align: 'center',
      });

    doc.end();
  });
};
