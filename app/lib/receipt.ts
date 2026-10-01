import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReceiptData {
  // Header
  title: string;              // "Payment Receipt" or "Partner Payment Receipt"
  receiptNo?: string;
  // Party
  partyLabel: string;         // "User" or "Partner"
  partyName: string;
  partyId?: string;           // userId / partnerId
  area?: string;
  phone?: string;
  // Payment
  month: string;
  paymentDate: string;
  paymentMethod: string;
  packageName?: string;
  packagePrice?: number;
  amount: number;
  remarks?: string;
  // Optional totals block
  previousBalance?: number;
  currentBalance?: number;
  totalBalance?: number;
  remainingBalance?: number;
  isNoPayment?: boolean;
}

/**
 * Generates and downloads a PDF receipt.
 */
export function downloadReceipt(data: ReceiptData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // ============================================================
  // HEADER
  // ============================================================
  doc.setFillColor(214, 177, 56);   // #d6b138 (your brand color)
  doc.rect(0, 0, pageWidth, 70, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(data.title, marginX, 42);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.receiptNo) {
    doc.text(`Receipt #: ${data.receiptNo}`, pageWidth - marginX, 42, {
      align: 'right',
    });
  }

  // ============================================================
  // PARTY DETAILS
  // ============================================================
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.partyLabel} Details`, marginX, 100);

  const partyRows: [string, string][] = [
    [data.partyLabel, data.partyName || '—'],
  ];
  if (data.partyId) partyRows.push([`${data.partyLabel} ID`, data.partyId]);
  if (data.area) partyRows.push(['Area', data.area]);
  if (data.phone) partyRows.push(['Phone', data.phone]);

  autoTable(doc, {
    startY: 110,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [240, 240, 240], textColor: 0 },
    head: [['Field', 'Value']],
    body: partyRows,
  });

  // ============================================================
  // PAYMENT DETAILS
  // ============================================================
  // @ts-ignore — autoTable adds lastAutoTable to doc
  let y = (doc as any).lastAutoTable.finalY + 30;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details', marginX, y);
  y += 10;

  const paymentRows: [string, string][] = [
    ['Billing Month', data.month || '—'],
    ['Payment Date', data.paymentDate || '—'],
    ['Payment Method', data.paymentMethod || '—'],
  ];

  if (data.packageName) paymentRows.push(['Package', data.packageName]);
  if (data.packagePrice !== undefined) {
    paymentRows.push([
      'Package Price',
      `Rs. ${Number(data.packagePrice).toLocaleString()}`,
    ]);
  }

  paymentRows.push([
    data.isNoPayment ? 'Amount' : 'Amount Received',
    data.isNoPayment
      ? 'Rs. 0 (No Payment)'
      : `Rs. ${Number(data.amount).toLocaleString()}`,
  ]);

  if (data.remarks) paymentRows.push(['Remarks', data.remarks]);

  autoTable(doc, {
    startY: y + 5,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [240, 240, 240], textColor: 0 },
    head: [['Field', 'Value']],
    body: paymentRows,
  });

  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 30;

  // ============================================================
  // BALANCE SUMMARY (optional)
  // ============================================================
  if (
    data.previousBalance !== undefined ||
    data.currentBalance !== undefined ||
    data.totalBalance !== undefined ||
    data.remainingBalance !== undefined
  ) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Summary', marginX, y);
    y += 10;

    const balanceRows: [string, string][] = [];
    if (data.previousBalance !== undefined)
      balanceRows.push([
        'Previous Balance',
        `Rs. ${Number(data.previousBalance).toLocaleString()}`,
      ]);
    if (data.currentBalance !== undefined)
      balanceRows.push([
        'Current Balance',
        `Rs. ${Number(data.currentBalance).toLocaleString()}`,
      ]);
    if (data.totalBalance !== undefined)
      balanceRows.push([
        'Total Balance',
        `Rs. ${Number(data.totalBalance).toLocaleString()}`,
      ]);
    if (data.remainingBalance !== undefined)
      balanceRows.push([
        'Remaining After Payment',
        `Rs. ${Number(data.remainingBalance).toLocaleString()}`,
      ]);

    autoTable(doc, {
      startY: y + 5,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [240, 240, 240], textColor: 0 },
      head: [['Description', 'Amount']],
      body: balanceRows,
    });

    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 30;
  }

  // ============================================================
  // FOOTER
  // ============================================================
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    'Thank you for your payment.',
    marginX,
    doc.internal.pageSize.getHeight() - 40
  );
  doc.text(
    `Generated: ${new Date().toLocaleString('en-PK')}`,
    pageWidth - marginX,
    doc.internal.pageSize.getHeight() - 40,
    { align: 'right' }
  );

  // ============================================================
  // DOWNLOAD
  // ============================================================
  const filename = `receipt-${(data.receiptNo || data.partyName || 'payment')
    .toString()
    .replace(/[^\w-]+/g, '-')}.pdf`;

  doc.save(filename);
}