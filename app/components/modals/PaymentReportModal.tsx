'use client';

import React from 'react';

import {
  X,
  Download,
  User,
  Building2,
  ReceiptText,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'user' | 'dealer';
  data: any;
};

const money = (value: any) => {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
};

const formatDate = (date: any) => {
  if (!date) return '—';

  try {
    return new Date(date).toLocaleDateString(
      'en-GB'
    );
  } catch {
    return '—';
  }
};

const formatMethod = (value: string) => {
  if (!value) return '—';

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
};

export default function PaymentReportModal({
  isOpen,
  onClose,
  reportType,
  data,
}: Props) {
  if (!isOpen || !data) {
    return null;
  }

  const isUser = reportType === 'user';

  const person = isUser
    ? data.customer
    : data.dealer;

  const summary = data.summary || {};

  // ==========================================================
  // PDF EXPORT
  // ==========================================================

  const exportPDF = () => {
    try {
      const doc = new jsPDF(
        'landscape',
        'pt',
        'a4'
      );

      const pageWidth =
        doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(15, 23, 42);

      doc.rect(
        0,
        0,
        pageWidth,
        75,
        'F'
      );

      doc.setTextColor(
        255,
        255,
        255
      );

      doc.setFontSize(20);

      doc.setFont(
        'helvetica',
        'bold'
      );

      doc.text(
        isUser
          ? 'User Payment Report'
          : 'Dealer Payment Report',
        35,
        38
      );

      doc.setFontSize(9);

      doc.setFont(
        'helvetica',
        'normal'
      );

      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        35,
        58
      );

      doc.setTextColor(
        30,
        41,
        59
      );

      let y = 105;

      // Entity info
      doc.setFontSize(12);

      doc.setFont(
        'helvetica',
        'bold'
      );

      doc.text(
        isUser
          ? 'User Information'
          : 'Dealer Information',
        35,
        y
      );

      y += 22;

      doc.setFontSize(9);

      doc.setFont(
        'helvetica',
        'normal'
      );

      if (isUser) {
        doc.text(
          `User ID: ${
            person?.customerId || 'N/A'
          }`,
          35,
          y
        );

        doc.text(
          `Name: ${
            person?.name || 'N/A'
          }`,
          250,
          y
        );

        doc.text(
          `Phone: ${
            person?.phone || 'N/A'
          }`,
          500,
          y
        );

        y += 18;

        doc.text(
          `Area: ${
            person?.area || 'N/A'
          }`,
          35,
          y
        );

        doc.text(
          `Package: ${
            person?.package || 'N/A'
          }`,
          250,
          y
        );

        doc.text(
          `Monthly Fee: ${money(
            person?.monthlyFee
          )}`,
          500,
          y
        );
      } else {
        doc.text(
          `Dealer ID: ${
            person?.dealerId || 'N/A'
          }`,
          35,
          y
        );

        doc.text(
          `Name: ${
            person?.name || 'N/A'
          }`,
          250,
          y
        );

        doc.text(
          `Cell: ${
            person?.cellNo || 'N/A'
          }`,
          500,
          y
        );

        y += 18;

        doc.text(
          `ISP: ${
            person?.isp || 'N/A'
          }`,
          35,
          y
        );

        doc.text(
          `Area: ${
            person?.area || 'N/A'
          }`,
          250,
          y
        );

        doc.text(
          `Commission: ${
            person?.commission || 'N/A'
          }`,
          500,
          y
        );
      }

      y += 35;

      // Period
      doc.setFont(
        'helvetica',
        'bold'
      );

      doc.text(
        'Report Period:',
        35,
        y
      );

      doc.setFont(
        'helvetica',
        'normal'
      );

      doc.text(
        `${
          data.dateRange?.from ||
          'All'
        } to ${
          data.dateRange?.to ||
          'All'
        }`,
        110,
        y
      );

      y += 30;

      // Summary
      doc.setFont(
        'helvetica',
        'bold'
      );

      doc.setFontSize(12);

      doc.text(
        'Summary',
        35,
        y
      );

      y += 15;

      if (isUser) {
        autoTable(doc, {
          startY: y,

          head: [[
            'Monthly Fee',
            'Total Paid',
            'Expected',
            'Outstanding',
            'Months Paid',
            'Payments',
          ]],

          body: [[
            money(
              summary.monthlyFee
            ),

            money(
              summary.totalPaid
            ),

            money(
              summary.totalExpected
            ),

            money(
              summary.outstanding
            ),

            summary.monthsPaid || 0,

            summary.paymentCount || 0,
          ]],

          styles: {
            fontSize: 8,
          },

          headStyles: {
            fillColor: [
              15,
              23,
              42,
            ],
          },
        });
      } else {
        autoTable(doc, {
          startY: y,

          head: [[
            'Opening Balance',
            'Current Balance',
            'Received',
            'Added/Paid',
            'Commission',
            'Transactions',
          ]],

          body: [[
            money(
              summary.openingBalance
            ),

            money(
              summary.currentBalance
            ),

            money(
              summary.totalReceived
            ),

            money(
              summary.totalAdded
            ),

            money(
              summary.totalCommission
            ),

            summary.paymentCount || 0,
          ]],

          styles: {
            fontSize: 8,
          },

          headStyles: {
            fillColor: [
              15,
              23,
              42,
            ],
          },
        });
      }

      const finalY =
        (doc as any)
          .lastAutoTable
          ?.finalY || y;

      if (isUser) {
        autoTable(doc, {
          startY: finalY + 25,

          head: [[
            '#',
            'Receipt',
            'Month',
            'Date',
            'Method',
            'Amount',
            'Received By',
            'Remarks',
          ]],

          body: (
            data.payments || []
          ).map(
            (
              payment: any,
              index: number
            ) => [
              index + 1,

              payment.receiptNo,

              payment.month,

              formatDate(
                payment.paymentDate
              ),

              formatMethod(
                payment.method
              ),

              money(
                payment.amount
              ),

              payment.receivedBy ||
                '—',

              payment.remarks ||
                '—',
            ]
          ),

          styles: {
            fontSize: 7,
          },

          headStyles: {
            fillColor: [
              15,
              23,
              42,
            ],
          },
        });
      } else {
        autoTable(doc, {
          startY: finalY + 25,

          head: [[
            '#',
            'Receipt',
            'Month',
            'Date',
            'Type',
            'Method',
            'Amount',
            'Commission',
            'Collected/Paid By',
            'Remarks',
          ]],

          body: (
            data.payments || []
          ).map(
            (
              payment: any,
              index: number
            ) => [
              index + 1,

              payment.receiptNo,

              payment.month,

              formatDate(
                payment.paymentDate
              ),

              payment.paymentType ===
              'receive_payment'
                ? 'Received'
                : 'Added/Paid',

              formatMethod(
                payment.paymentMethod
              ),

              money(
                payment.amount
              ),

              money(
                payment.commission
              ),

              payment.collectedBy ||
                payment.paidBy ||
                payment.receivedBy ||
                '—',

              payment.remarks ||
                '—',
            ]
          ),

          styles: {
            fontSize: 6.5,
          },

          headStyles: {
            fillColor: [
              15,
              23,
              42,
            ],
          },
        });
      }

      // Page numbers
      const pageCount =
        doc.getNumberOfPages();

      for (
        let i = 1;
        i <= pageCount;
        i++
      ) {
        doc.setPage(i);

        doc.setFontSize(8);

        doc.setTextColor(
          120,
          120,
          120
        );

        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - 80,
          doc.internal.pageSize.getHeight() -
            15
        );
      }

      const id = isUser
        ? person?.customerId
        : person?.dealerId;

      doc.save(
        `${
          isUser
            ? 'UserPaymentReport'
            : 'DealerPaymentReport'
        }_${id || 'report'}.pdf`
      );

      toast.success(
        'PDF exported successfully'
      );
    } catch (error) {
      console.error(
        'PDF error:',
        error
      );

      toast.error(
        'Failed to export PDF'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-slate-900 px-4 py-4 sm:px-6 dark:border-gray-700">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              {isUser ? (
                <User className="h-5 w-5" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>

            <div>
              <h2 className="text-base font-bold text-white sm:text-lg">
                {isUser
                  ? 'User Payment Report'
                  : 'Dealer Payment Report'}
              </h2>

              <p className="text-xs text-slate-300">
                {data.dateRange?.from ||
                  'All dates'}
                {' → '}
                {data.dateRange?.to ||
                  'All dates'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white transition hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* Person information */}
          <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">

            <div className="mb-4 flex items-center gap-2">
              {isUser ? (
                <User className="h-4 w-4 text-blue-600" />
              ) : (
                <Building2 className="h-4 w-4 text-blue-600" />
              )}

              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {isUser
                  ? 'User Information'
                  : 'Dealer Information'}
              </h3>
            </div>

            {isUser ? (
              <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-3 lg:grid-cols-6">

                <Info
                  label="User ID"
                  value={
                    person?.customerId
                  }
                />

                <Info
                  label="Name"
                  value={person?.name}
                />

                <Info
                  label="Phone"
                  value={person?.phone}
                />

                <Info
                  label="Area"
                  value={person?.area}
                />

                <Info
                  label="Package"
                  value={person?.package}
                />

                <Info
                  label="Monthly Fee"
                  value={money(
                    person?.monthlyFee
                  )}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-3 lg:grid-cols-6">

                <Info
                  label="Dealer ID"
                  value={
                    person?.dealerId
                  }
                />

                <Info
                  label="Name"
                  value={person?.name}
                />

                <Info
                  label="Cell No"
                  value={
                    person?.cellNo
                  }
                />

                <Info
                  label="ISP"
                  value={person?.isp}
                />

                <Info
                  label="Area"
                  value={person?.area}
                />

                <Info
                  label="Commission"
                  value={
                    person?.commission
                  }
                />
              </div>
            )}
          </div>

          {/* Summary */}
          {isUser ? (
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">

              <SummaryCard
                title="Monthly Fee"
                value={money(
                  summary.monthlyFee
                )}
                icon={<Wallet />}
              />

              <SummaryCard
                title="Total Paid"
                value={money(
                  summary.totalPaid
                )}
                icon={
                  <ArrowDownCircle />
                }
              />

              <SummaryCard
                title="Expected"
                value={money(
                  summary.totalExpected
                )}
                icon={<ReceiptText />}
              />

              <SummaryCard
                title="Outstanding"
                value={money(
                  summary.outstanding
                )}
                icon={
                  <ArrowUpCircle />
                }
              />

              <SummaryCard
                title="Months Paid"
                value={
                  summary.monthsPaid ||
                  0
                }
                icon={<ReceiptText />}
              />

              <SummaryCard
                title="Payments"
                value={
                  summary.paymentCount ||
                  0
                }
                icon={<ReceiptText />}
              />
            </div>
          ) : (
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">

              <SummaryCard
                title="Opening Balance"
                value={money(
                  summary.openingBalance
                )}
                icon={<Wallet />}
              />

              <SummaryCard
                title="Current Balance"
                value={money(
                  summary.currentBalance
                )}
                icon={<Wallet />}
              />

              <SummaryCard
                title="Received"
                value={money(
                  summary.totalReceived
                )}
                icon={
                  <ArrowDownCircle />
                }
              />

              <SummaryCard
                title="Added / Paid"
                value={money(
                  summary.totalAdded
                )}
                icon={
                  <ArrowUpCircle />
                }
              />

              <SummaryCard
                title="Commission"
                value={money(
                  summary.totalCommission
                )}
                icon={<ReceiptText />}
              />

              <SummaryCard
                title="Transactions"
                value={
                  summary.paymentCount ||
                  0
                }
                icon={<ReceiptText />}
              />
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">

            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">

              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Payment History
              </h3>

              <p className="mt-0.5 text-[11px] text-gray-500">
                {data.payments?.length ||
                  0}{' '}
                transaction(s)
              </p>
            </div>

            <div className="overflow-x-auto">

              {isUser ? (
                <table className="min-w-[900px] w-full text-left text-xs">

                  <thead className="bg-gray-100 text-[11px] uppercase text-gray-500 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3">
                        #
                      </th>

                      <th className="px-4 py-3">
                        Receipt
                      </th>

                      <th className="px-4 py-3">
                        Month
                      </th>

                      <th className="px-4 py-3">
                        Date
                      </th>

                      <th className="px-4 py-3">
                        Method
                      </th>

                      <th className="px-4 py-3">
                        Amount
                      </th>

                      <th className="px-4 py-3">
                        Received By
                      </th>

                      <th className="px-4 py-3">
                        Remarks
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">

                    {data.payments?.length ? (
                      data.payments.map(
                        (
                          payment: any,
                          index: number
                        ) => (
                          <tr
                            key={
                              payment._id ||
                              index
                            }
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="px-4 py-3">
                              {index + 1}
                            </td>

                            <td className="px-4 py-3 font-semibold">
                              {
                                payment.receiptNo
                              }
                            </td>

                            <td className="px-4 py-3">
                              {
                                payment.month
                              }
                            </td>

                            <td className="px-4 py-3">
                              {formatDate(
                                payment.paymentDate
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {formatMethod(
                                payment.method
                              )}
                            </td>

                            <td className="px-4 py-3 font-bold">
                              {money(
                                payment.amount
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {
                                payment.receivedBy
                              }
                            </td>

                            <td className="px-4 py-3">
                              {payment.remarks ||
                                '—'}
                            </td>
                          </tr>
                        )
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-12 text-center text-gray-500"
                        >
                          No payment
                          records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-[1150px] w-full text-left text-xs">

                  <thead className="bg-gray-100 text-[11px] uppercase text-gray-500 dark:bg-gray-800">

                    <tr>
                      <th className="px-4 py-3">
                        #
                      </th>

                      <th className="px-4 py-3">
                        Receipt
                      </th>

                      <th className="px-4 py-3">
                        Month
                      </th>

                      <th className="px-4 py-3">
                        Date
                      </th>

                      <th className="px-4 py-3">
                        Type
                      </th>

                      <th className="px-4 py-3">
                        Method
                      </th>

                      <th className="px-4 py-3">
                        Amount
                      </th>

                      <th className="px-4 py-3">
                        Commission
                      </th>

                      <th className="px-4 py-3">
                        Payment For
                      </th>

                      <th className="px-4 py-3">
                        Collected /
                        Paid By
                      </th>

                      <th className="px-4 py-3">
                        Remarks
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">

                    {data.payments?.length ? (
                      data.payments.map(
                        (
                          payment: any,
                          index: number
                        ) => (
                          <tr
                            key={
                              payment._id ||
                              index
                            }
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="px-4 py-3">
                              {index + 1}
                            </td>

                            <td className="px-4 py-3 font-semibold">
                              {
                                payment.receiptNo
                              }
                            </td>

                            <td className="px-4 py-3">
                              {
                                payment.month
                              }
                            </td>

                            <td className="px-4 py-3">
                              {formatDate(
                                payment.paymentDate
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={
                                  payment.paymentType ===
                                  'receive_payment'
                                    ? 'rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold text-green-700'
                                    : 'rounded-full bg-orange-100 px-2 py-1 text-[10px] font-semibold text-orange-700'
                                }
                              >
                                {payment.paymentType ===
                                'receive_payment'
                                  ? 'Received'
                                  : 'Added / Paid'}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {formatMethod(
                                payment.paymentMethod
                              )}
                            </td>

                            <td className="px-4 py-3 font-bold">
                              {money(
                                payment.amount
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {money(
                                payment.commission
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {payment.paymentFor ||
                                '—'}
                            </td>

                            <td className="px-4 py-3">
                              {payment.collectedBy ||
                                payment.paidBy ||
                                payment.receivedBy ||
                                '—'}
                            </td>

                            <td className="px-4 py-3">
                              {payment.remarks ||
                                '—'}
                            </td>
                          </tr>
                        )
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-12 text-center text-gray-500"
                        >
                          No dealer payment
                          records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-6 dark:border-gray-700 dark:bg-gray-800">

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
          >
            Close
          </button>

          <button
            type="button"
            onClick={exportPDF}
            className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />

            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="break-words font-semibold text-gray-800 dark:text-gray-100">
        {value || '—'}
      </p>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: any;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">

      <div className="mb-2 flex items-center justify-between">

        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {title}
        </p>

        <div className="h-4 w-4 text-blue-600 [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </div>
      </div>

      <p className="text-sm font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}