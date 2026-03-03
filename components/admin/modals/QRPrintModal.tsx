import React from 'react';
import { Pallet } from '../../../types';
import { QrCode, Printer, ImageDown } from 'lucide-react';

export const QRPrintModal = ({ pallets, onClose }: { pallets: Pallet[], onClose: () => void }) => {

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');

        if (!printWindow) {
            alert("Popups are blocked. Please allow popups for this site to print.");
            return;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>NMT Pallet QR Codes</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 20px; }
                    .grid { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); 
                        gap: 15px; 
                    }
                    .card { 
                        border: 2px solid #000; 
                        padding: 15px; 
                        text-align: center; 
                        border-radius: 8px; 
                        page-break-inside: avoid;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }
                    img { 
                        width: 100px; 
                        height: 100px; 
                        image-rendering: pixelated;
                    }
                    .title { 
                        font-size: 20px; 
                        font-weight: 900; 
                        margin-bottom: 5px;
                        line-height: 1;
                    }
                    .footer { 
                        margin-top: 5px; 
                        font-size: 9px; 
                        text-transform: uppercase; 
                        font-weight: bold;
                        color: #555; 
                    }
                    @media print {
                        .no-print { display: none; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 20px; text-align: center;">
                    <p style="font-family: sans-serif; margin-bottom: 10px;">Use your browser's print dialog to <strong>Save as PDF</strong> or Print.</p>
                    <button onclick="window.print()" style="font-size: 16px; padding: 10px 20px; cursor: pointer; background: #000; color: #fff; border: none; border-radius: 5px;">🖨️ Print Now</button>
                </div>
                <div class="grid">
                    ${pallets.map(p => `
                        <div class="card">
                            <div class="title">${p.pallet_id}</div>
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${p.pallet_id}" />
                            <div class="footer">NMT PROPERTY</div>
                        </div>
                    `).join('')}
                </div>
                <script>
                    setTimeout(() => {
                        window.print();
                    }, 1000);
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleDownloadImage = async (palletId: string) => {
        try {
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${palletId}`;
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `NMT_QR_${palletId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
        } catch (error: any) {
            console.error('Download failed', error);
            alert('Could not auto-download. Please right-click the image and select "Save Image As".');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="shrink-0 p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4 shadow-sm z-10">
                    <div className="w-full sm:w-auto">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                            <QrCode className="text-indigo-600" />
                            <span className="truncate">QR Code Master Sheet</span>
                        </h2>
                        <p className="text-sm text-gray-500 truncate">
                            {pallets.length} items selected.
                        </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={handlePrint}
                            className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition whitespace-nowrap"
                        >
                            <Printer size={20} /> Print / PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 md:px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-slate-100 relative w-full styled-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-10">
                        {pallets.map(p => (
                            <div key={p.pallet_id} className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md transition relative group w-full break-inside-avoid">

                                <h3 className="text-2xl font-black text-gray-900 font-mono tracking-tighter leading-none">{p.pallet_id}</h3>

                                <div className="p-2 bg-white rounded-lg border border-gray-100">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${p.pallet_id}`}
                                        alt={p.pallet_id}
                                        className="w-24 h-24 object-contain rendering-pixelated mix-blend-multiply"
                                    />
                                </div>

                                <div className="w-full pt-2 mt-1 flex items-center justify-between border-t border-gray-100">
                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest truncate">NMT Prop</p>
                                    <button
                                        onClick={() => handleDownloadImage(p.pallet_id)}
                                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition flex items-center gap-1 text-[10px] font-bold whitespace-nowrap"
                                        title="Download PNG"
                                    >
                                        <ImageDown size={14} /> Save
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
