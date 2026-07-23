import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, Printer, ArrowLeft, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/helpers';
import type { Invoice, Booking, Worker, Profile, Payment } from '@/lib/types';

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('invoices').select('*').eq('id', id).maybeSingle(),
    ]).then(async ([invData]) => {
      const inv = invData.data as Invoice | null;
      if (!inv) { setLoading(false); return; }
      setInvoice(inv);
      const [b, p] = await Promise.all([
        supabase.from('bookings').select('*').eq('id', inv.booking_id).maybeSingle(),
        supabase.from('payments').select('*').eq('id', inv.payment_id).maybeSingle(),
      ]);
      setBooking(b.data as Booking | null);
      setPayment(p.data as Payment | null);
      if (b.data) {
        const [w, u] = await Promise.all([
          supabase.from('workers').select('*').eq('id', b.data.worker_id).maybeSingle(),
          supabase.from('profiles').select('*').eq('id', b.data.user_id).maybeSingle(),
        ]);
        setWorker(w.data as Worker | null);
        setUserProfile(u.data as Profile | null);
      }
      setLoading(false);
    });
  }, [id]);

  const downloadPDF = () => {
    if (!invoice) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text('worker.com', 20, y);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Professional Home Services Marketplace', 20, y + 6);
    y += 20;

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // Invoice info
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('INVOICE', 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${invoice.invoice_number}`, 20, y);
    y += 5;
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, y);
    y += 5;
    if (booking) {
      doc.text(`Booking ID: ${booking.id.slice(0, 8)}`, 20, y);
      y += 5;
      doc.text(`Service: ${booking.service_name}`, 20, y);
    }
    y += 12;

    // Parties
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Billed To:', 20, y);
    doc.text('Service Provider:', pageWidth / 2, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (userProfile) {
      doc.text(userProfile.full_name || '', 20, y);
      doc.text(userProfile.email || '', 20, y + 5);
      doc.text(userProfile.phone || '', 20, y + 10);
      doc.text(userProfile.address || '', 20, y + 15);
    }
    if (worker) {
      doc.text(worker.full_name || '', pageWidth / 2, y);
      doc.text(worker.email || '', pageWidth / 2, y + 5);
      doc.text(worker.phone || '', pageWidth / 2, y + 10);
      doc.text(worker.address || '', pageWidth / 2, y + 15);
    }
    y += 25;

    // Items table
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y, pageWidth - 40, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 22, y + 5.5);
    doc.text('Amount', pageWidth - 60, y + 5.5);
    y += 10;
    doc.setFont('helvetica', 'normal');
    if (booking) {
      doc.text(booking.service_name, 22, y + 5.5);
      doc.text(formatCurrency(Number(invoice.subtotal)), pageWidth - 60, y + 5.5);
      y += 7;
    }
    doc.text('GST (18%)', 22, y + 5.5);
    doc.text(formatCurrency(Number(invoice.gst)), pageWidth - 60, y + 5.5);
    y += 7;
    doc.text('Platform Fee', 22, y + 5.5);
    doc.text(formatCurrency(Number(invoice.platform_fee)), pageWidth - 60, y + 5.5);
    y += 10;

    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Grand Total:', 22, y);
    doc.text(formatCurrency(Number(invoice.grand_total)), pageWidth - 60, y);
    y += 12;

    // Payment info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Status: ${invoice.payment_status.toUpperCase()}`, 20, y);
    if (payment) {
      y += 5;
      doc.text(`Payment ID: ${payment.payment_id}`, 20, y);
      y += 5;
      doc.text(`Transaction ID: ${payment.transaction_id}`, 20, y);
      y += 5;
      doc.text(`Payment Method: ${payment.payment_method.replace('_', ' ')}`, 20, y);
    }
    y += 15;

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('This is a computer-generated invoice from worker.com', 20, y);
    doc.text('For support: support@worker.com | +91 1800-123-4567', 20, y + 4);

    doc.save(`invoice-${invoice.invoice_number}.pdf`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (!invoice) return <div className="max-w-7xl mx-auto px-4 py-16"><p className="text-center text-gray-500">Invoice not found</p></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600"><ArrowLeft className="w-4 h-4" /> Back to Dashboard</Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium"><Printer className="w-4 h-4" /> Print</button>
          <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><Download className="w-4 h-4" /> Download PDF</button>
        </div>
      </div>

      <div ref={pdfRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">worker.com</h1>
            <p className="text-sm text-gray-500">Professional Home Services Marketplace</p>
          </div>
          <div className="text-right">
            <FileText className="w-10 h-10 text-blue-600 ml-auto mb-2" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">INVOICE</h2>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Invoice Number</p>
            <p className="font-mono font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Date</p>
            <p className="text-gray-900 dark:text-white">{new Date(invoice.created_at).toLocaleDateString()}</p>
          </div>
          {booking && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">Booking ID</p>
              <p className="font-mono text-gray-900 dark:text-white">{booking.id.slice(0, 8)}</p>
            </div>
          )}
          {booking && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">Service</p>
              <p className="text-gray-900 dark:text-white">{booking.service_name}</p>
            </div>
          )}
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs text-gray-400 uppercase mb-2">Billed To</p>
            {userProfile && (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium">{userProfile.full_name}</p>
                <p>{userProfile.email}</p>
                <p>{userProfile.phone}</p>
                <p>{userProfile.address}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase mb-2">Service Provider</p>
            {worker && (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium">{worker.full_name}</p>
                <p>{worker.email}</p>
                <p>{worker.phone}</p>
                <p>{worker.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 text-sm font-medium text-gray-500">Description</th>
              <th className="text-right py-2 text-sm font-medium text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <td className="py-2 text-sm text-gray-900 dark:text-white">{booking?.service_name || 'Service'}</td>
              <td className="py-2 text-right text-sm text-gray-900 dark:text-white">{formatCurrency(Number(invoice.subtotal))}</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <td className="py-2 text-sm text-gray-600 dark:text-gray-300">GST (18%)</td>
              <td className="py-2 text-right text-sm text-gray-600 dark:text-gray-300">{formatCurrency(Number(invoice.gst))}</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <td className="py-2 text-sm text-gray-600 dark:text-gray-300">Platform Fee (5%)</td>
              <td className="py-2 text-right text-sm text-gray-600 dark:text-gray-300">{formatCurrency(Number(invoice.platform_fee))}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 font-bold text-gray-900 dark:text-white">Grand Total</td>
              <td className="pt-4 text-right text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(Number(invoice.grand_total))}</td>
            </tr>
          </tfoot>
        </table>

        {/* Payment Info */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Payment Status</span><span className={`font-medium capitalize ${invoice.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>{invoice.payment_status}</span></div>
          {payment && <>
            <div className="flex justify-between"><span className="text-gray-500">Payment ID</span><span className="font-mono">{payment.payment_id}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Transaction ID</span><span className="font-mono">{payment.transaction_id}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="capitalize">{payment.payment_method.replace('_', ' ')}</span></div>
          </>}
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">This is a computer-generated invoice from worker.com</p>
      </div>
    </div>
  );
}
