import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';

export interface ReceiptData {
  paymentId: string; // your human-readable "PAY-XXXXXX"
  bookingId: string;
  apartmentName: string;
  checkIn: string; // pre-formatted date string, e.g. "Aug 12, 2026"
  checkOut: string;
  durationNights: number;
  guestName: string;
  guestEmail: string;
  amount: number; // the amount actually charged
  perNightPrice: number;
  totalPrice: number;
  depositAmount: number;
  remainingAmount: number;
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

    const logoPath = path.join(
      __dirname,
      '../../../public/uploads/logo/logo.png',
    );

    // ---- Watermark ------------------------------------------------------
    if (fs.existsSync(logoPath)) {
      doc
        .save()
        .opacity(0.045)
        .image(logoPath, 110, 365, { width: 375 })
        .restore();
    }

    // ---- Header ---------------------------------------------------------
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 165 });
    } else {
      doc
        .fillColor(NAVY)
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('DAYF BOOKING', 50, 50);
    }

    doc
      .fillColor(NAVY)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('BOOKING DEPOSIT RECEIPT', 300, 47, {
        width: 245,
        align: 'right',
      })
      .fillColor(LIGHT_GRAY)
      .fontSize(9)
      .font('Helvetica')
      .text(`Receipt # ${data.paymentId}`, 300, 68, {
        width: 245,
        align: 'right',
      })
      .text(`Paid on ${data.paymentDate}`, 300, 82, {
        width: 245,
        align: 'right',
      });

    doc.moveTo(50, 110).lineTo(545, 110).strokeColor(BORDER).stroke();

    // ---- Status badge ---------------------------------------------------
    doc.roundedRect(50, 128, 145, 28, 14).fill('#16a34a');
    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('15% DEPOSIT PAID', 50, 137, {
        width: 145,
        align: 'center',
      });
    doc
      .fillColor(GRAY)
      .fontSize(10)
      .font('Helvetica')
      .text(
        'Booking confirmed — remaining 85% is payable at the property.',
        215,
        137,
        {
          width: 330,
          align: 'right',
        },
      );

    // ---- Guest and booking card -----------------------------------------
    let y = 178;
    doc.roundedRect(50, y, 495, 112, 8).fill('#f8fafc');
    doc
      .fillColor(NAVY)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('GUEST', 70, y + 18)
      .text('BOOKING', 325, y + 18, { width: 200, align: 'right' });
    doc
      .fillColor('#222222')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(data.guestName, 70, y + 38, { width: 210 })
      .text(data.apartmentName, 325, y + 38, {
        width: 200,
        align: 'right',
      })
      .fillColor(GRAY)
      .fontSize(9)
      .font('Helvetica')
      .text(data.guestEmail, 70, y + 57, { width: 210 })
      .text(`Booking ID: ${data.bookingId}`, 325, y + 57, {
        width: 200,
        align: 'right',
      })
      .text(`Check-in: ${data.checkIn}`, 325, y + 73, {
        width: 200,
        align: 'right',
      })
      .text(`Check-out: ${data.checkOut}`, 325, y + 89, {
        width: 200,
        align: 'right',
      });

    // ---- Stay and payment breakdown -------------------------------------
    y = 320;
    doc
      .fillColor(NAVY)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Payment Breakdown', 50, y);
    y += 24;
    doc.roundedRect(50, y, 495, 30, 5).fill(NAVY);
    doc
      .fillColor('#ffffff')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('DESCRIPTION', 65, y + 10)
      .text('DETAILS', 290, y + 10)
      .text('AMOUNT', 450, y + 10, { width: 80, align: 'right' });
    y += 30;

    const detailRows = [
      {
        label: 'Stay duration',
        details: `${data.durationNights} ${data.durationNights === 1 ? 'night' : 'nights'}`,
        amount: '',
      },
      {
        label: 'Nightly rate',
        details: `${formatMoney(data.perNightPrice, data.currency)} × ${data.durationNights}`,
        amount: formatMoney(data.totalPrice, data.currency),
      },
      {
        label: 'Booking total',
        details: '100%',
        amount: formatMoney(data.totalPrice, data.currency),
        bold: true,
      },
      {
        label: 'Paid online — deposit',
        details: '15%',
        amount: formatMoney(data.depositAmount, data.currency),
        color: '#16a34a',
        bold: true,
      },
      {
        label: 'Pay at property — cash',
        details: '85%',
        amount: formatMoney(data.remainingAmount, data.currency),
        color: NAVY,
        bold: true,
      },
    ];

    detailRows.forEach((row, index) => {
      const rowHeight = index >= 2 ? 34 : 30;
      if (index % 2 === 0) {
        doc.rect(50, y, 495, rowHeight).fill('#f8fafc');
      }
      const rowColor = row.color ?? '#222222';
      doc
        .fillColor(rowColor)
        .fontSize(10)
        .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(row.label, 65, y + 10, { width: 210 })
        .text(row.details, 290, y + 10, { width: 120 })
        .text(row.amount, 430, y + 10, {
          width: 100,
          align: 'right',
        });
      y += rowHeight;
    });

    // ---- Transaction details --------------------------------------------
    y += 22;
    doc
      .fillColor(NAVY)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('PAYMENT DETAILS', 50, y);
    y += 18;
    doc
      .fillColor(GRAY)
      .fontSize(9)
      .font('Helvetica')
      .text(`Method: ${data.paymentMethod.toUpperCase()}`, 50, y, {
        width: 150,
      })
      .text(`Gateway: ${data.paymentGateway.toUpperCase()}`, 200, y, {
        width: 150,
      })
      .text(`Host: ${data.hostName ?? 'Property'}`, 350, y, {
        width: 195,
        align: 'right',
      });

    // ---- Important payment note -----------------------------------------
    y += 34;
    doc.roundedRect(50, y, 495, 58, 7).fillAndStroke('#fff7ed', '#fed7aa');
    doc
      .fillColor('#9a3412')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Payment due at the property', 68, y + 13)
      .font('Helvetica')
      .fontSize(9)
      .text(
        `${formatMoney(data.remainingAmount, data.currency)} (85% of the booking total) must be paid directly to the hotel in cash.`,
        68,
        y + 31,
        { width: 455 },
      );

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
      .text(
        `\u00A9 ${new Date().getFullYear()} DAYF BOOKING. All rights reserved.`,
        50,
        748,
        {
          width: 495,
          align: 'center',
        },
      );

    doc.end();
  });
};
