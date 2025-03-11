import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

// Function to convert HTML to PDF using Puppeteer
async function generatePdf(html: string): Promise<Buffer> {
  console.log("PUPPETEER_EXECUTABLE_PATH:", process.env.PUPPETEER_EXECUTABLE_PATH);
  
  // Check if we're running on Heroku
  const isHeroku = process.env.DYNO ? true : false;
  console.log("Running on Heroku:", isHeroku);
  
  let browser;
  try {
    const launchOptions = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ],
      headless: true,
      timeout: 60000 // Increase timeout to 60 seconds
    };
    
    // Add executable path if specified in environment variables
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      console.log("Using executable path from env variable");
      (launchOptions as any).executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (isHeroku) {
      // Use the exact path for Heroku
      console.log("Using Heroku Chrome path");
      (launchOptions as any).executablePath = '/app/.chrome-for-testing/chrome-linux64/chrome';
    }
    
    console.log("Launch options:", JSON.stringify(launchOptions));
    browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    
    // Set longer timeouts
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);
    
    await page.setContent(html, { 
      waitUntil: "networkidle0",
      timeout: 60000
    });
    
    // Generate PDF with academic paper dimensions
    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "1in",
        right: "1in",
        bottom: "1in",
        left: "1in"
      },
      printBackground: true,
      timeout: 60000
    });
    
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { html } = body;
    
    console.log("PDF generation request received");
    
    if (!html) {
      return NextResponse.json(
        { error: "HTML is required" },
        { status: 400 }
      );
    }
    
    console.log("HTML received, length:", html.length);
    
    // Generate PDF from HTML using Puppeteer
    const pdfBuffer = await generatePdf(html);
    console.log("PDF generated, size:", pdfBuffer.length, "bytes");
    
    // Return the PDF file
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="academic-document.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: (error as Error).message },
      { status: 500 }
    );
  }
} 