"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Wand2, Book, FileText, Download } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function CreateDocument() {
  const [content, setContent] = useState("")
  const [customInput, setCustomInput] = useState("")
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)

  const handleGeneratePdf = async (htmlContent: string) => {
    setIsGeneratingPdf(true);
    
    try {
      // Generate PDF from the server using the provided HTML
      const response = await fetch("/api/resume/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          html: htmlContent
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }
      
      // Get the PDF as a blob directly from the response
      const pdfBlob = await response.blob();
      setPdfBlob(pdfBlob);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleGenerateHtml = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGeneratingHtml(true)
    setPdfBlob(null) // Reset PDF blob when generating new HTML
    
    try {
      console.log("Sending request to generate HTML")
      
      // Generate HTML
      const response = await fetch("/api/resume/html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          content, 
          customInput
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to generate HTML: ${errorData.error || response.statusText}`)
      }
      
      const data = await response.json()
      console.log("HTML received, length:", data.html?.length)
      
      if (!data.html) {
        throw new Error("No HTML returned from server")
      }
      
      setHtml(data.html)
      
      // Automatically generate PDF after HTML is ready
      await handleGeneratePdf(data.html);
      
    } catch (error) {
      console.error("Error generating HTML:", error)
    } finally {
      setIsGeneratingHtml(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <Link className="flex items-center justify-center" href="/dashboard">
          <span className="font-bold text-2xl text-primary">Academic Document Generator</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="/dashboard">
            Dashboard
          </Link>
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="/">
            Log Out
          </Link>
        </nav>
      </header>
      <main className="flex-1 py-12 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <h1 className="text-3xl font-bold mb-6 text-center">OCR to Harvard-Style Document</h1>
            <p className="mb-8 text-gray-600 text-center">
              Transform your handwritten notes into a professionally formatted academic document with Harvard-style references.
            </p>

            <div className="mb-8 p-6 bg-secondary/20 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Book className="mr-2 h-5 w-5" />
                OCR Text Processor
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Instructions: Paste the OCR text from your handwritten notes below. Our AI will transform it into a 
                structured academic document following Harvard style guidelines with proper formatting and references.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="content">OCR Text from Handwritten Notes</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your OCR text here..."
                    rows={10}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <Label htmlFor="custom_input">Additional Formatting Instructions (Optional)</Label>
                  <Textarea
                    id="custom_input"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Any specific formatting preferences or additional context for your document..."
                    rows={5}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <form onSubmit={handleGenerateHtml} className="space-y-6">
                  <Button type="submit" className="w-full" disabled={isGeneratingHtml || isGeneratingPdf}>
                    {isGeneratingHtml ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Document...
                      </>
                    ) : isGeneratingPdf ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Document
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
            
            {html && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Preview Document</h2>
                <div className="border rounded-lg overflow-hidden">
                  <iframe 
                    srcDoc={html} 
                    className="w-full h-[600px]" 
                    title="Generated Academic Document"
                  />
                </div>
              </div>
            )}
            
            {pdfBlob && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Your Generated PDF</h2>
                <div className="border rounded-lg overflow-hidden">
                  <object 
                    data={URL.createObjectURL(pdfBlob)} 
                    type="application/pdf"
                    className="w-full h-[600px]"
                  >
                    <p>Your browser does not support PDF preview. 
                      <a href={URL.createObjectURL(pdfBlob)} download="academic-document.pdf">
                        Click here to download the PDF
                      </a>
                    </p>
                  </object>
                </div>
                <div className="mt-4 flex justify-center">
                  <Button asChild>
                    <a 
                      href={URL.createObjectURL(pdfBlob)} 
                      download="academic-document.pdf"
                    >
                      Download PDF
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="py-6 border-t">
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-center text-sm text-gray-500">
            © 2024 Academic Document Generator. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
} 