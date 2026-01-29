import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Order, Customer, CompanySettings } from '../types';

export const pdfService = {
  /**
   * Generates a multi-page PDF by capturing HTML elements matching the selector.
   */
  generateInvoice: async (
    order: Order, 
    customer: Customer, 
    settings: CompanySettings, 
    selector: string = '#invoice-display'
  ): Promise<{ blob: Blob; fileName: string }> => {
    try {
      console.log("Starting Professional PDF Generation...");
      
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) throw new Error(`Invoice elements not found for selector: ${selector}`);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        
        // Use a consistent window width for capture to ensure layout stability
        const canvas = await html2canvas(element, {
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 800 
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const imgWidthPx = canvas.width;
        const imgHeightPx = canvas.height;
        
        // Scale the canvas image to fit the PDF page width
        const ratio = pdfWidth / imgWidthPx;
        const canvasHeightInPdfUnits = imgHeightPx * ratio;

        if (i > 0) {
          pdf.addPage();
        }
        
        // Add image starting from the top of the page
        // We use 'FAST' compression to keep the file size low
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, canvasHeightInPdfUnits, undefined, 'FAST');
      }

      const fileName = `${settings.invoice_prefix}${order.order_id.substring(0, 6).toUpperCase()}.pdf`;
      
      console.log("Saving PDF...");
      pdf.save(fileName);
      
      const blob = pdf.output('blob');
      return { blob, fileName };
    } catch (error) {
      console.error("PDF Generation failed:", error);
      throw error;
    }
  },

  /**
   * Generates a PDF from a generic HTML element selector.
   */
  generatePdfFromElement: async (
    selector: string,
    fileName: string = 'document.pdf'
  ): Promise<{ blob: Blob; fileName: string }> => {
    try {
      console.log(`Generating PDF from selector: ${selector}`);
      const element = document.querySelector(selector) as HTMLElement;
      if (!element) throw new Error(`Element not found for selector: ${selector}`);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200, // Large width for better layout
        onclone: (clonedDoc) => {
          // Show the PDF header in the captured image
          const header = clonedDoc.getElementById('pdf-header');
          if (header) {
            header.style.display = 'block';
          }
          
          // Ensure all text is dark for the report
          const content = clonedDoc.getElementById('report-content');
          if (content) {
            content.style.color = '#000000';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidthPx = canvas.width;
      const imgHeightPx = canvas.height;
      const ratio = pdfWidth / imgWidthPx;
      const canvasHeightInPdfUnits = imgHeightPx * ratio;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, canvasHeightInPdfUnits, undefined, 'FAST');
      pdf.save(fileName);

      const blob = pdf.output('blob');
      return { blob, fileName };
    } catch (error) {
      console.error("PDF Generation failed:", error);
      throw error;
    }
  },

  /**
   * Generates and shares the invoice using the Web Share API.
   */
  shareInvoice: async (
    order: Order, 
    customer: Customer, 
    settings: CompanySettings, 
    selector: string = '#invoice-display'
  ): Promise<void> => {
    try {
      const { blob, fileName } = await pdfService.generateInvoice(order, customer, settings, selector);
      
      const file = new File([blob], fileName, { type: 'application/pdf' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Invoice ${fileName}`,
          text: `Invoice for ${customer.shop_name}`,
          files: [file]
        });
      } else {
        alert('Sharing not supported on this device/browser. PDF has been downloaded.');
      }
    } catch (e) {
      console.error('Sharing failed', e);
    }
  }
};
