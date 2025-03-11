import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// Define schemas using Zod
const Reference = z.object({
  author: z.string().optional(),
  year: z.string().optional(),
  title: z.string().optional(),
  publisher: z.string().optional(),
  url: z.string().optional(),
  accessDate: z.string().optional(),
});

const Chapter = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  subchapters: z.array(z.object({
    title: z.string().optional(),
    content: z.string().optional(),
  })).optional(),
});

const StructuredBookContent = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  abstract: z.string().optional(),
  tableOfContents: z.array(z.string()).optional(),
  chapters: z.array(Chapter).optional(),
  references: z.array(Reference).optional(),
  appendices: z.array(z.object({
    title: z.string().optional(),
    content: z.string().optional(),
  })).optional(),
});

// Function to structure OCR content
async function structureOcrContent(content: string, customInput: string) {
  // Create the system message for the AI
  const systemMessage = {
    role: "system",
    content: `
      You are an academic document structuring assistant. Your task is to analyze OCR text from handwritten notes
      and structure it into a well-organized academic document format.
      
      Follow these guidelines:
      1. Identify the document title, author, and abstract if present
      2. Organize the content into logical chapters and subchapters
      3. Extract and format references according to Harvard style
      4. Create a table of contents based on the identified structure
      5. Identify any appendices or supplementary material
      
      Structure the content in a way that maintains the original meaning and flow while improving organization.
      If the input is unclear or ambiguous, make reasonable assumptions based on academic writing conventions.
      
      Return the structured content as a valid JSON object matching the specified schema.
    `
  };
  
  // Create the human message with the OCR content and any custom instructions
  const humanMessage = {
    role: "human",
    content: `
      OCR TEXT: ${content}
      
      ${customInput ? `ADDITIONAL INSTRUCTIONS: ${customInput}` : ''}
      
      Please structure this content into a well-organized academic document format.
    `
  };

  // Create the model with structured output
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.2,
  });
  
  // Call the model with the messages
  const result = await model.invoke([systemMessage, humanMessage]);
  
  // Extract the structured content from the response
  let structuredContent;
  try {
    // Try to parse the response as JSON
    const responseText = result.content as string;
    
    // Extract JSON if it's wrapped in code blocks
    let jsonText = responseText;
    if (responseText.includes('```json')) {
      jsonText = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      jsonText = responseText.split('```')[1].split('```')[0].trim();
    }
    
    structuredContent = JSON.parse(jsonText);
    
    // Validate against the schema
    StructuredBookContent.parse(structuredContent);
  } catch (error) {
    console.error("Error parsing structured content:", error);
    
    // If parsing fails, create a minimal valid structure
    structuredContent = {
      title: "Untitled Document",
      author: "Unknown Author",
      abstract: "No abstract available.",
      chapters: [
        {
          title: "Content",
          content: content
        }
      ]
    };
  }
  
  return structuredContent;
}

// Function to generate HTML from structured content
async function generateBookHtml(structuredContent: any) {
  // Create separate message objects directly without using template strings for the JSON content
  const systemMessage = {
    role: "system",
    content: `
      You are an academic document formatter. Create an HTML document based on the provided structured content.
      The document should follow Harvard academic style guidelines with:
      
      1. A professional, clean layout suitable for academic publishing
      2. Proper heading hierarchy and typography
      3. Harvard-style citations and references
      4. Appropriate spacing, margins, and font choices
      5. A table of contents with links to sections
      6. Properly formatted footnotes and endnotes if applicable
      7. Responsive design that works well for both screen reading and printing
      
      Use semantic HTML5 elements and include CSS styling within a <style> tag in the head.
      The styling should be elegant, professional, and appropriate for academic publishing.
      Output only the complete HTML code with no markdown formatting or code blocks.
    `
  };
  
  const humanMessage = {
    role: "human",
    content: `STRUCTURED CONTENT: ${JSON.stringify(structuredContent)}`
  };

  // Create the model
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.2,
  });
  
  // Call the model directly with messages
  const result = await model.invoke([systemMessage, humanMessage]);
  
  // Extract HTML from the response
  let htmlContent = result.content as string;
  
  // Clean up any potential markdown code block formatting
  htmlContent = htmlContent.replace(/```html/g, "");
  htmlContent = htmlContent.replace(/```/g, "");
  
  return htmlContent;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, customInput } = body;
    
    console.log("HTML generation request received");
    
    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Structure the OCR content
    const structuredContent = await structureOcrContent(content, customInput);
    console.log("Structured content created");
    
    // Generate HTML from structured content
    const html = await generateBookHtml(structuredContent);
    console.log("HTML generated, length:", html.length);
    
    // Return the HTML
    return NextResponse.json({ html });
  } catch (error) {
    console.error("Error generating HTML:", error);
    return NextResponse.json(
      { error: "Failed to generate HTML", details: (error as Error).message },
      { status: 500 }
    );
  }
} 